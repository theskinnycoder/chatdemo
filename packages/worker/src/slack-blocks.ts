/**
 * Converts markdown text to Slack Block Kit blocks with rich_text table cells.
 *
 * Follows the pattern of Chat SDK's `toBlocksWithTable` but:
 * - Uses `rich_text` cells instead of `raw_text` for formatted table content
 * - Converts `---` horizontal rules to `divider` blocks
 * - Each message should have at most 1 table (handled by message-chunker)
 */

// === Rich text element types ===

interface RichTextElement {
  type: "text" | "link";
  text: string;
  url?: string;
  style?: {
    bold?: boolean;
    italic?: boolean;
    strike?: boolean;
    code?: boolean;
  };
}

interface RichTextSection {
  type: "rich_text_section";
  elements: RichTextElement[];
}

interface RawTextCell {
  type: "raw_text";
  text: string;
}

interface RichTextCell {
  type: "rich_text";
  elements: RichTextSection[];
}

type TableCell = RawTextCell | RichTextCell;

interface TableBlock {
  type: "table";
  rows: TableCell[][];
  column_settings?: { align?: string; is_wrapped?: boolean }[];
}

interface SectionBlock {
  type: "section";
  text: { type: "mrkdwn"; text: string };
}

interface DividerBlock {
  type: "divider";
}

type SlackBlock = TableBlock | SectionBlock | DividerBlock;

// === Inline markdown parser → rich text elements ===

/**
 * Parses inline markdown (bold, italic, code, strikethrough, links)
 * into Slack rich_text_section elements.
 */
function parseInlineMarkdown(text: string): RichTextElement[] {
  const elements: RichTextElement[] = [];
  // Pattern matches: `code`, **bold**, *italic*, ~~strike~~, [text](url)
  const regex =
    /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|~~([^~]+)~~|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Add plain text before this match
    if (match.index > lastIndex) {
      elements.push({
        type: "text",
        text: text.slice(lastIndex, match.index),
      });
    }

    if (match[1] !== undefined) {
      // `code`
      elements.push({
        type: "text",
        text: match[1],
        style: { code: true },
      });
    } else if (match[2] !== undefined) {
      // **bold**
      elements.push({
        type: "text",
        text: match[2],
        style: { bold: true },
      });
    } else if (match[3] !== undefined) {
      // *italic*
      elements.push({
        type: "text",
        text: match[3],
        style: { italic: true },
      });
    } else if (match[4] !== undefined) {
      // ~~strike~~
      elements.push({
        type: "text",
        text: match[4],
        style: { strike: true },
      });
    } else if (match[5] !== undefined && match[6] !== undefined) {
      // [text](url)
      elements.push({
        type: "link",
        text: match[5],
        url: match[6],
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining plain text
  if (lastIndex < text.length) {
    elements.push({
      type: "text",
      text: text.slice(lastIndex),
    });
  }

  return elements.length > 0 ? elements : [{ type: "text", text }];
}

/**
 * Converts a cell's markdown text to a rich_text cell if it contains formatting,
 * or a raw_text cell if it's plain text.
 */
function cellToSlackCell(cellText: string): TableCell {
  const trimmed = cellText.trim();
  const hasFormatting =
    /`[^`]+`|\*[^*]+\*|\*\*[^*]+\*\*|~~[^~]+~~|\[[^\]]+\]\([^)]+\)/.test(
      trimmed,
    );

  if (!hasFormatting) {
    return { type: "raw_text", text: trimmed };
  }

  const elements = parseInlineMarkdown(trimmed);
  return {
    type: "rich_text",
    elements: [{ type: "rich_text_section", elements }],
  };
}

// === GFM table parser ===

interface ParsedTable {
  headers: string[];
  rows: string[][];
  alignments: (string | null)[];
}

function parseGfmTable(lines: string[]): ParsedTable | null {
  if (lines.length < 2) return null;

  const parseRow = (line: string): string[] =>
    line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());

  const headers = parseRow(lines[0]);

  // Parse separator for alignment
  const sepCells = parseRow(lines[1]);
  const isSeparator = sepCells.every((cell) => /^:?-+:?$/.test(cell.trim()));
  if (!isSeparator) return null;

  const alignments = sepCells.map((cell) => {
    const c = cell.trim();
    if (c.startsWith(":") && c.endsWith(":")) return "center";
    if (c.endsWith(":")) return "right";
    return "left";
  });

  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("|")) break;
    rows.push(parseRow(line));
  }

  return { headers, rows, alignments };
}

function tableToSlackBlock(table: ParsedTable): TableBlock {
  const headerCells: TableCell[] = table.headers.map((h) => cellToSlackCell(h));
  const dataRows: TableCell[][] = table.rows.map((row) =>
    row.map((cell) => cellToSlackCell(cell)),
  );

  const block: TableBlock = {
    type: "table",
    rows: [headerCells, ...dataRows],
  };

  if (table.alignments.some((a) => a !== null)) {
    block.column_settings = table.alignments.map((a) => ({
      align: a || "left",
      is_wrapped: true,
    }));
  }

  return block;
}

// === Markdown → Slack mrkdwn converter ===

/**
 * Converts standard markdown syntax to Slack mrkdwn syntax.
 * - `## Heading` → `*Heading*` (bold, Slack has no heading syntax)
 * - `**bold**` → `*bold*`
 * - `[text](url)` → `<url|text>`
 * - `~~strike~~` → `~strike~`
 * Leaves `*italic*`, `_italic_`, `` `code` ``, ``` code blocks ``` as-is (compatible).
 */
function markdownToMrkdwn(text: string): string {
  return (
    text
      // Headings: ### Heading → *Heading*
      .replace(/^#{1,6}\s+(.+)$/gm, "*$1*")
      // Bold: **text** → *text*
      .replace(/\*\*([^*]+)\*\*/g, "*$1*")
      // Links: [text](url) → <url|text>
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<$2|$1>")
      // Strikethrough: ~~text~~ → ~text~
      .replace(/~~([^~]+)~~/g, "~$1~")
  );
}

// === Main converter ===

/**
 * Converts a markdown string to Slack Block Kit blocks.
 * - Text → section blocks with mrkdwn (markdown syntax converted)
 * - GFM tables → table blocks with rich_text cells
 * - `---` → divider blocks
 *
 * Follows the same pattern as Chat SDK's `toBlocksWithTable`.
 */
export function markdownToSlackBlocks(markdown: string): SlackBlock[] {
  const lines = markdown.split("\n");
  const blocks: SlackBlock[] = [];
  let textBuffer: string[] = [];

  const flushText = () => {
    const text = markdownToMrkdwn(textBuffer.join("\n").trim());
    if (text) {
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text },
      });
    }
    textBuffer = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Check for horizontal rule: --- or *** or ___ (standalone line)
    if (/^\s*[-*_]{3,}\s*$/.test(line) && !isTableSeparator(line)) {
      flushText();
      blocks.push({ type: "divider" });
      i++;
      continue;
    }

    // Check for table start: a line with pipes followed by a separator line
    if (
      i + 1 < lines.length &&
      isTableRow(line) &&
      isTableSeparator(lines[i + 1])
    ) {
      flushText();

      // Collect all table lines
      const tableLines: string[] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }

      const table = parseGfmTable(tableLines);
      if (table) {
        blocks.push(tableToSlackBlock(table));
      }
      continue;
    }

    textBuffer.push(line);
    i++;
  }

  flushText();
  return blocks;
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|");
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|[\s\-:]+(\|[\s\-:]+)*\|\s*$/.test(line);
}

// === Slack API helpers ===

/**
 * Posts a message with raw Slack blocks to a thread.
 */
export async function postSlackBlocks(
  token: string,
  channel: string,
  threadTs: string,
  blocks: SlackBlock[],
  fallbackText: string,
): Promise<string | undefined> {
  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      channel,
      thread_ts: threadTs,
      blocks,
      text: fallbackText,
    }),
  });

  const data = (await response.json()) as {
    ok: boolean;
    ts?: string;
    error?: string;
  };
  if (!data.ok) {
    console.error("postSlackBlocks failed:", data.error);
  }
  return data.ts;
}

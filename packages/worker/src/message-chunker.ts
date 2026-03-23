/**
 * Splits markdown text into chunks at GFM table boundaries.
 * Each chunk contains at most 1 table, suitable for Slack's
 * 1-table-per-message limit.
 */
export function splitIntoTableChunks(markdown: string): string[] {
  const lines = markdown.split("\n");
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let hasTableInCurrentChunk = false;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTableRow =
      line.trimStart().startsWith("|") && line.trimEnd().endsWith("|");
    const isSeparator = /^\s*\|[\s\-:]+\|/.test(line);

    if (isTableRow || isSeparator) {
      if (!inTable) {
        if (hasTableInCurrentChunk) {
          chunks.push(currentChunk.join("\n"));
          currentChunk = [];
          hasTableInCurrentChunk = false;
        }
        inTable = true;
        hasTableInCurrentChunk = true;
      }
      currentChunk.push(line);
    } else {
      if (inTable) {
        inTable = false;
      }
      currentChunk.push(line);
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join("\n"));
  }

  return chunks.filter((c) => c.trim().length > 0);
}

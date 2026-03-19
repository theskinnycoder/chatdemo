import { tool } from "ai";
import { z } from "zod";

export const calculatorTool = tool({
  description:
    "Evaluate a mathematical expression. Supports basic arithmetic (+, -, *, /), exponents (**), parentheses, and Math functions (Math.sqrt, Math.PI, etc.).",
  inputSchema: z.object({
    expression: z
      .string()
      .describe(
        'The math expression to evaluate, e.g. "2 + 2", "Math.sqrt(144)", "(3 + 4) * 2"'
      ),
  }),
  execute: async ({ expression }) => {
    // Only allow safe math characters and Math.* functions
    const sanitized = expression.replace(/\s/g, "");
    if (!/^[0-9+\-*/().,%eE^]+$/.test(sanitized) && !sanitized.startsWith("Math")) {
      const isMathExpr = /^[\d+\-*/().,%eE^Math.a-zA-Z\s]+$/.test(expression);
      if (!isMathExpr) {
        return { expression, error: "Invalid expression: only arithmetic and Math.* functions are allowed" };
      }
    }

    try {
      const result = new Function(`"use strict"; return (${expression})`)();
      if (typeof result !== "number" || !isFinite(result)) {
        return { expression, error: "Expression did not evaluate to a finite number" };
      }
      return { expression, result };
    } catch {
      return { expression, error: "Failed to evaluate expression" };
    }
  },
});

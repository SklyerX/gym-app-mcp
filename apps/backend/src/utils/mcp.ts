import type { ToolResult } from "./types.js";

export const ok = (data: unknown): ToolResult => ({
  content: [{ type: "text", text: JSON.stringify(data) }],
});

export const fail = (message: string): ToolResult => ({
  isError: true,
  content: [{ type: "text", text: message }],
});

export const empty = (message: string): ToolResult => ({
  content: [{ type: "text", text: message }],
});

import type { z } from "zod";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types";
import type { users } from "../db/schema.js";

export type User = typeof users.$inferSelect;

export type ToolResult = {
  content: Array<{
    type: "text";
    text: string;
    _meta?: Record<string, unknown>;
  }>;
  isError?: boolean;
  _meta?: Record<string, unknown>;
  structuredContent?: Record<string, unknown>;
};

export type ToolModule<TShape extends z.ZodRawShape = z.ZodRawShape> = {
  name: string;
  description: string;
  annotations?: ToolAnnotations;
  input: TShape;
  load: (
    user: User,
    args: z.infer<z.ZodObject<TShape>>,
  ) => Promise<ToolResult> | ToolResult;
};

export type AnyToolModule = Omit<ToolModule, "load"> & {
  load: (user: User, args: any) => Promise<ToolResult> | ToolResult;
};

export function defineTool<TShape extends z.ZodRawShape>(
  tool: ToolModule<TShape>,
): ToolModule<TShape> {
  return tool;
}

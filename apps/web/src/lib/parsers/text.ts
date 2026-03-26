/** Extract text from a plain text buffer */
export function parseText(buffer: Buffer): string {
  return buffer.toString("utf-8");
}

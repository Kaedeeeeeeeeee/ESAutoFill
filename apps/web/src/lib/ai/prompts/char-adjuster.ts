/** System prompt for Claude Sonnet: adjust text to target character count */
export const CHAR_ADJUSTER_SYSTEM = `You rewrite Japanese ES (エントリーシート) text to fit specific character limits while preserving the core message and STAR structure.

Rules:
1. Output MUST be at or just under the target count (within 5 characters).
2. For shorter versions: cut less impactful details, tighten phrasing, remove redundant expressions.
3. For longer versions: add more concrete details, numbers, specific context, and deeper reflection.
4. Maintain です/ます調 and professional tone throughout.
5. Do NOT add fabricated information — only expand on what is already in the text.
6. Keep the STAR flow: 状況→課題→行動→結果.
7. Output the adjusted text ONLY, no explanation, no markdown, no quotes.`;

/** Build user message for character count adjustment */
export function buildAdjustMessage(
  originalText: string,
  targetCharCount: number
): string {
  const originalCount = [...originalText].length;
  return `元の文章（${originalCount}文字）:
${originalText}

目標文字数: ${targetCharCount}文字

上記の文章を${targetCharCount}文字以内に調整してください。`;
}

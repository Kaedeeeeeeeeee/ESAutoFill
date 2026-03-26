/** System prompt for Gemini Pro: generate a single field's content based on user's chat response */
export const CHAT_FILL_SYSTEM = `You generate Japanese ES (エントリーシート) content for a SINGLE field based on the user's response to a question.

RULES:
1. Write in Japanese (日本語), です/ます調.
2. If a character limit is specified, your output MUST be at or under that limit. Count every character (kanji, kana, punctuation) as 1.
3. Use the user's response as the primary input, combined with their profile data for context.
4. Do NOT fabricate information beyond what the user provided.
5. Structure the text professionally and naturally.

Output ONLY the generated text. No JSON, no explanation, no markdown.`;

/** Build user message for single-field chat generation */
export function buildChatFillMessage(
  fieldCategory: string,
  fieldLabel: string,
  charLimit: number | null,
  userResponse: string,
  profile?: Record<string, unknown>,
  companyName?: string
): string {
  let msg = `## 入力対象フィールド
カテゴリ: ${fieldCategory}
ラベル: ${fieldLabel}`;

  if (charLimit) {
    msg += `\n文字数制限: ${charLimit}字以内`;
  }

  if (companyName) {
    msg += `\n対象企業: ${companyName}`;
  }

  msg += `\n\n## ユーザーの回答
${userResponse}`;

  if (profile) {
    msg += `\n\n## ユーザープロフィール（参考）
${JSON.stringify(profile, null, 2)}`;
  }

  return msg;
}

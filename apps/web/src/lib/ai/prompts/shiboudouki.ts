/** System prompt for Claude Sonnet: generate 志望動機 */
export const SHIBOUDOUKI_SYSTEM = `You are an expert 志望動機 (motivation letter) writer for Japanese job-seeking students.
Given a student's profile, their reasons/keywords for wanting to join the company, and company research data, generate a compelling 志望動機.

Structure:
1. Opening: State the core reason for wanting to join (結論ファースト)
2. Background: Connect your experience/values to the company's mission or business
3. Specific interest: Reference a specific project, product, or initiative of the company
4. Your contribution: What you can bring to the company based on your skills/experience
5. Closing: Reaffirm your motivation

Rules:
1. Write in Japanese (日本語), です/ます調.
2. Respect the character limit strictly. Count each character (kanji, kana, punctuation) as 1.
3. Be SPECIFIC — mention the company by name and reference concrete business areas or values.
4. Connect the student's experiences to the company's needs.
5. Do NOT use generic phrases that could apply to any company.
6. Do NOT fabricate company information — only use what is provided in the company context.
7. Output the 志望動機 text ONLY, no explanation.`;

/** Build user message for 志望動機 generation */
export function buildShiboudoukiMessage(
  profile: Record<string, unknown>,
  experiences: Array<Record<string, unknown>>,
  company: {
    companyName: string;
    missionStatement?: string;
    businessAreas?: string[];
    companyValues?: string[];
    recentNews?: Array<{ title: string; summary: string }>;
    userKeywords: string[];
  },
  charLimit?: number
): string {
  const limitStr = charLimit ? `\n\n文字数制限: ${charLimit}文字以内` : "";

  return `## 学生プロフィール
${JSON.stringify(profile, null, 2)}

## 経験
${JSON.stringify(experiences, null, 2)}

## 志望企業情報
企業名: ${company.companyName}
${company.missionStatement ? `企業理念: ${company.missionStatement}` : ""}
${company.businessAreas?.length ? `事業領域: ${company.businessAreas.join("、")}` : ""}
${company.companyValues?.length ? `企業の価値観: ${company.companyValues.join("、")}` : ""}
${company.recentNews?.length ? `最近のニュース:\n${company.recentNews.map((n) => `- ${n.title}: ${n.summary}`).join("\n")}` : ""}

## 志望理由のキーワード
${company.userKeywords.join("、")}${limitStr}`;
}

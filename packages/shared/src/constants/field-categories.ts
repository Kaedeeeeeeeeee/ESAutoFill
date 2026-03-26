import type { ESFieldCategory } from "../types/form";

/** Mapping of ES field categories to display labels */
export const FIELD_CATEGORY_LABELS: Record<ESFieldCategory, string> = {
  basic_info_name: "氏名",
  basic_info_furigana: "フリガナ",
  basic_info_email: "メールアドレス",
  basic_info_phone: "電話番号",
  basic_info_university: "大学名",
  basic_info_faculty: "学部・学科",
  basic_info_graduation: "卒業年度",
  gakuchika: "ガクチカ",
  self_pr: "自己PR",
  shiboudouki: "志望動機",
  weakness: "短所・弱み",
  career_goal: "将来の目標",
  leadership: "リーダーシップ経験",
  teamwork: "チームワーク経験",
  challenge: "困難を乗り越えた経験",
  free_text: "自由記述",
  non_es: "ES外フィールド",
};

/** Categories that map directly to profile basic_info fields */
export const BASIC_INFO_CATEGORIES: ESFieldCategory[] = [
  "basic_info_name",
  "basic_info_furigana",
  "basic_info_email",
  "basic_info_phone",
  "basic_info_university",
  "basic_info_faculty",
  "basic_info_graduation",
];

/** Categories that require AI content generation */
export const CONTENT_CATEGORIES: ESFieldCategory[] = [
  "gakuchika",
  "self_pr",
  "shiboudouki",
  "weakness",
  "career_goal",
  "leadership",
  "teamwork",
  "challenge",
  "free_text",
];

/** Common character limit tiers in Japanese ES */
export const COMMON_CHAR_LIMITS = [200, 300, 400, 500, 600, 800] as const;

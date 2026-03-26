/** Company record with research data and 選考 tracking */
export interface Company {
  id: string;
  userId: string;
  companyName: string;
  companyUrl?: string;
  industry?: string;
  /** Auto-collected company data (P2) */
  missionStatement?: string;
  recentNews: CompanyNews[];
  businessAreas: string[];
  companyValues: string[];
  /** User-provided keywords for 志望動機 */
  userKeywords: string[];
  /** Generated 志望動機 */
  shiboudouki?: string;
  shiboudoukiVariants: Record<string, string>;
  /** 選考ステータス */
  senkouStatus: SenkouStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type SenkouStatus =
  | "未応募"
  | "ES提出済"
  | "一次面接"
  | "二次面接"
  | "最終面接"
  | "内定"
  | "不合格"
  | "辞退";

export interface CompanyNews {
  title: string;
  date: string;
  summary: string;
  url?: string;
}

/** Submission history record */
export interface Submission {
  id: string;
  userId: string;
  companyId?: string;
  companyName?: string;
  pageUrl: string;
  pageTitle?: string;
  submittedAt: string;
  fieldsSnapshot: SubmissionField[];
  createdAt: string;
}

export interface SubmissionField {
  fieldLabel: string;
  category: string;
  filledContent: string;
  charCount: number;
}

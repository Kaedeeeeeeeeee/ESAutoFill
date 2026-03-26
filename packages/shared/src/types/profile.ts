/** STAR structured experience */
export interface STARExperience {
  id: string;
  userId: string;
  category: ExperienceCategory;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  learnings?: string;
  tags: string[];
  /** Pre-generated length variants: key = char count, value = text */
  variants: Record<string, string>;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type ExperienceCategory =
  | "gakuchika"
  | "leadership"
  | "teamwork"
  | "challenge"
  | "failure"
  | "strength_evidence"
  | "part_time"
  | "club"
  | "research"
  | "volunteer"
  | "internship"
  | "other";

/** Strength entry */
export interface Strength {
  title: string;
  description: string;
  evidence: string;
}

/** Weakness entry */
export interface Weakness {
  title: string;
  description: string;
  improvement: string;
}

/** Career goals */
export interface CareerGoals {
  shortTerm: string;
  longTerm: string;
  values: string[];
}

/** User profile - core data structure */
export interface UserProfile {
  id: string;
  userId: string;
  fullName?: string;
  furigana?: string;
  email?: string;
  phone?: string;
  university?: string;
  faculty?: string;
  department?: string;
  graduationYear?: number;
  strengths: Strength[];
  weaknesses: Weakness[];
  careerGoals?: CareerGoals;
  selfPr?: string;
  gakuchika?: string;
  createdAt: string;
  updatedAt: string;
}

/** File upload record */
export interface FileUpload {
  id: string;
  userId: string;
  fileName: string;
  fileType: "pdf" | "docx" | "txt";
  storagePath: string;
  parsedText?: string;
  parsedStructured?: ParsedProfileData;
  status: "pending" | "parsing" | "parsed" | "error";
  errorMessage?: string;
  createdAt: string;
}

/** AI-parsed structured output from uploaded file */
export interface ParsedProfileData {
  basicInfo: {
    name?: string;
    furigana?: string;
    email?: string;
    phone?: string;
    university?: string;
    faculty?: string;
    department?: string;
    graduationYear?: number;
  };
  experiences: Array<{
    category: ExperienceCategory;
    title: string;
    situation: string;
    task: string;
    action: string;
    result: string;
    learnings?: string;
    tags: string[];
  }>;
  strengths: Strength[];
  weaknesses: Weakness[];
  careerGoals?: CareerGoals;
  selfPr?: string;
  gakuchika?: string;
}

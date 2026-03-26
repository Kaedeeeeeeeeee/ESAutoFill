import type { FieldContext, FieldClassification, FillInstruction } from "./form";

/** POST /api/form/classify */
export interface ClassifyRequest {
  fields: FieldContext[];
}

export interface ClassifyResponse {
  classifications: FieldClassification[];
}

/** POST /api/form/generate */
export interface GenerateRequest {
  classifications: FieldClassification[];
  profileId: string;
  companyId?: string;
}

export interface GenerateResponse {
  fills: FillInstruction[];
}

/** POST /api/profile/upload */
export interface UploadResponse {
  fileId: string;
  status: "parsing" | "parsed" | "error";
  errorMessage?: string;
}

/** POST /api/profile/variants */
export interface VariantsRequest {
  experienceId: string;
  targetCharCounts: number[];
}

export interface VariantsResponse {
  variants: Record<string, string>;
}

/** POST /api/company/shiboudouki */
export interface ShiboudoukiRequest {
  companyId: string;
  keywords: string[];
  charLimit?: number;
}

export interface ShiboudoukiResponse {
  shiboudouki: string;
  charCount: number;
}

/** Generic API error */
export interface ApiError {
  error: string;
  message: string;
}

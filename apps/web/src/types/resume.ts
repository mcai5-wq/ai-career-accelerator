// Mirrors apps/api/src/resumes.
//   GET  /resumes
//   POST /resumes/upload                    multipart: title, file
//   GET  /resumes/:id
//   POST /resumes/:id/analyze               { jobTitle, company?, jobDescriptionText? }
export type AnalysisStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface Resume {
  id: string;
  title: string;
  createdAt: string;
  analyses: { id: string; status: string; atsScore: number | null }[];
}

export interface ResumeSuggestion {
  section: string;
  suggestion: string;
}

export interface ResumeAnalysis {
  id: string;
  status: AnalysisStatus;
  atsScore: number | null;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: ResumeSuggestion[] | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  jobDescription: { id: string; title: string; company: string | null } | null;
}

export interface ResumeDetail extends Resume {
  rawText: string;
  fileUrl: string | null;
  analyses: ResumeAnalysis[];
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InterviewDifficulty } from '@prisma/client';

interface QuestionExemplar {
  category: string;
  prompt: string;
}

interface GeneratedQuestion {
  category: string;
  prompt: string;
}

interface GradedAnswer {
  score: number;
  strengths: string[];
  improvementAreas: string[];
  summary: string;
}

interface ResumeSuggestion {
  section: string;
  suggestion: string;
}

interface ResumeAnalysisResult {
  atsScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: ResumeSuggestion[];
  summary: string;
}

interface TopicWeight {
  topic: string;
  weight: number;
  rationale: string;
}

// Thin HTTP client for the Python ai-service. Every method here returns
// null instead of throwing when something's unavailable — missing config,
// service down, whatever — so callers just fall back instead of erroring.
@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);

  constructor(private readonly configService: ConfigService) {}

  private get baseUrl(): string | undefined {
    return this.configService.get<string>('AI_SERVICE_URL');
  }

  private get internalApiKey(): string | undefined {
    return this.configService.get<string>('INTERNAL_API_KEY');
  }

  async generateInterviewQuestions(input: {
    role: string;
    company: string;
    difficulty: InterviewDifficulty;
    count: number;
    exemplars: QuestionExemplar[];
  }): Promise<GeneratedQuestion[] | null> {
    if (!this.baseUrl) return null;

    try {
      const res = await fetch(`${this.baseUrl}/interviews/questions/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': this.internalApiKey ?? '',
        },
        body: JSON.stringify({
          role: input.role,
          company: input.company,
          difficulty: input.difficulty,
          count: input.count,
          exemplars: input.exemplars,
        }),
      });

      if (!res.ok) {
        this.logger.warn(
          `Question generation unavailable (${res.status}) — falling back to the static bank.`,
        );
        return null;
      }

      const data = (await res.json()) as { questions: GeneratedQuestion[] };
      return data.questions;
    } catch (error) {
      this.logger.warn(
        `ai-service unreachable — falling back to the static bank. ${error instanceof Error ? error.message : ''}`,
      );
      return null;
    }
  }

  async gradeInterviewAnswer(input: {
    prompt: string;
    category: string | null;
    answerText: string;
  }): Promise<GradedAnswer | null> {
    if (!this.baseUrl) return null;

    try {
      const res = await fetch(`${this.baseUrl}/interviews/answers/grade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': this.internalApiKey ?? '',
        },
        body: JSON.stringify({
          prompt: input.prompt,
          category: input.category,
          answer_text: input.answerText,
        }),
      });

      if (!res.ok) {
        this.logger.warn(
          `Answer grading unavailable (${res.status}) — leaving this answer as feedback-pending.`,
        );
        return null;
      }

      const data = (await res.json()) as {
        score: number;
        strengths: string[];
        improvement_areas: string[];
        summary: string;
      };

      return {
        score: data.score,
        strengths: data.strengths,
        improvementAreas: data.improvement_areas,
        summary: data.summary,
      };
    } catch (error) {
      this.logger.warn(
        `ai-service unreachable — leaving this answer as feedback-pending. ${error instanceof Error ? error.message : ''}`,
      );
      return null;
    }
  }

  async analyzeResume(input: {
    resumeText: string;
    jobTitle: string;
    company?: string;
    jobDescriptionText?: string;
  }): Promise<ResumeAnalysisResult | null> {
    if (!this.baseUrl) return null;

    try {
      const res = await fetch(`${this.baseUrl}/resumes/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': this.internalApiKey ?? '',
        },
        body: JSON.stringify({
          resume_text: input.resumeText,
          job_title: input.jobTitle,
          company: input.company,
          job_description_text: input.jobDescriptionText,
        }),
      });

      if (!res.ok) {
        this.logger.warn(`Resume analysis unavailable (${res.status}).`);
        return null;
      }

      const data = (await res.json()) as {
        ats_score: number;
        matched_keywords: string[];
        missing_keywords: string[];
        suggestions: ResumeSuggestion[];
        summary: string;
      };

      return {
        atsScore: data.ats_score,
        matchedKeywords: data.matched_keywords,
        missingKeywords: data.missing_keywords,
        suggestions: data.suggestions,
        summary: data.summary,
      };
    } catch (error) {
      this.logger.warn(
        `ai-service unreachable for resume analysis. ${error instanceof Error ? error.message : ''}`,
      );
      return null;
    }
  }

  async analyzeTechnicalPrepTopics(input: {
    company: string;
    targetRole: string;
    availableTopics: string[];
  }): Promise<TopicWeight[] | null> {
    if (!this.baseUrl) return null;

    try {
      const res = await fetch(`${this.baseUrl}/technical-prep/analyze-topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': this.internalApiKey ?? '',
        },
        body: JSON.stringify({
          company: input.company,
          target_role: input.targetRole,
          available_topics: input.availableTopics,
        }),
      });

      if (!res.ok) {
        this.logger.warn(`Topic analysis unavailable (${res.status}).`);
        return null;
      }

      const data = (await res.json()) as { topic_breakdown: TopicWeight[] };
      return data.topic_breakdown;
    } catch (error) {
      this.logger.warn(
        `ai-service unreachable for topic analysis. ${error instanceof Error ? error.message : ''}`,
      );
      return null;
    }
  }
}

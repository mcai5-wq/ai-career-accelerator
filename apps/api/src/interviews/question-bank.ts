import { InterviewDifficulty } from '@prisma/client';

interface QuestionTemplate {
  category: string;
  prompt: string;
}

// Static, curated per difficulty for now — no AI service is wired up yet
// (apps/ai-service is still scaffolding), so sessions get a fixed set of
// well-known questions instead of generated ones. Swapping this for a real
// generation call later doesn't change the session/question/answer shape
// callers rely on.
const QUESTION_BANK: Record<InterviewDifficulty, QuestionTemplate[]> = {
  JUNIOR: [
    {
      category: 'behavioral',
      prompt:
        'Tell me about a time you had to learn a new technology quickly. How did you approach it?',
    },
    {
      category: 'coding',
      prompt:
        'How would you find the first non-repeating character in a string? Walk through your approach.',
    },
    {
      category: 'behavioral',
      prompt:
        'Describe a bug you struggled with. How did you eventually track it down?',
    },
    {
      category: 'system-design',
      prompt:
        'How would you design a simple URL shortener? What are the key pieces?',
    },
    {
      category: 'coding',
      prompt:
        "What's the difference between a stack and a queue, and when would you use each?",
    },
  ],
  MID: [
    {
      category: 'system-design',
      prompt:
        'Design a rate limiter for a public API. What approach would you take and why?',
    },
    {
      category: 'coding',
      prompt:
        "How would you detect a cycle in a linked list? What's the time/space complexity?",
    },
    {
      category: 'behavioral',
      prompt:
        'Tell me about a time you disagreed with a technical decision. How did you handle it?',
    },
    {
      category: 'system-design',
      prompt:
        'How would you design a notification system that supports email, SMS, and push?',
    },
    {
      category: 'behavioral',
      prompt:
        'Describe a project where you had to balance speed vs. code quality. What did you decide?',
    },
  ],
  SENIOR: [
    {
      category: 'system-design',
      prompt:
        'Design a distributed system for processing millions of events per day with at-least-once delivery. What tradeoffs would you make?',
    },
    {
      category: 'behavioral',
      prompt:
        'Tell me about a time you had to make an unpopular technical decision as a lead. How did you build buy-in?',
    },
    {
      category: 'system-design',
      prompt:
        'How would you design a multi-region database architecture that tolerates a full region outage?',
    },
    {
      category: 'coding',
      prompt:
        "How would you design an LRU cache from scratch? Walk through the data structures you'd use.",
    },
    {
      category: 'behavioral',
      prompt:
        'Describe a time you had to mentor a struggling engineer. What was your approach and what was the outcome?',
    },
  ],
};

export function getQuestionsForDifficulty(
  difficulty: InterviewDifficulty,
): QuestionTemplate[] {
  return QUESTION_BANK[difficulty];
}

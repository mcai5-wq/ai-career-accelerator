"use client";

import { useState } from "react";
import { useSubmitInterviewAnswer } from "@/lib/hooks/use-submit-interview-answer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { InterviewQuestion } from "@/types/interview";

interface InterviewQuestionCardProps {
  sessionId: string;
  question: InterviewQuestion;
  index: number;
}

export function InterviewQuestionCard({
  sessionId,
  question,
  index,
}: InterviewQuestionCardProps) {
  const [answerText, setAnswerText] = useState("");
  const submitAnswer = useSubmitInterviewAnswer();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    submitAnswer.mutate({ sessionId, questionId: question.id, answerText });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          Question {index + 1}
          {question.category && (
            <Badge variant="secondary">{question.category}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm">{question.prompt}</p>

        {question.answer ? (
          <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3">
            <p className="text-sm">{question.answer.answerText}</p>
            {question.answer.score !== null ? (
              <div className="flex flex-col gap-1 text-sm">
                <p className="font-medium">Score: {question.answer.score}/100</p>
                {question.answer.strengths.length > 0 && (
                  <p className="text-muted-foreground">
                    Strengths: {question.answer.strengths.join(", ")}
                  </p>
                )}
                {question.answer.improvementAreas.length > 0 && (
                  <p className="text-muted-foreground">
                    To improve: {question.answer.improvementAreas.join(", ")}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Feedback pending…
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <Textarea
              placeholder="Type your answer…"
              required
              value={answerText}
              onChange={(event) => setAnswerText(event.target.value)}
            />
            {submitAnswer.isError && (
              <p className="text-sm text-destructive">
                {submitAnswer.error?.message ?? "Couldn't submit that answer."}
              </p>
            )}
            <Button
              type="submit"
              disabled={submitAnswer.isPending}
              className="self-start"
            >
              {submitAnswer.isPending ? "Submitting…" : "Submit answer"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

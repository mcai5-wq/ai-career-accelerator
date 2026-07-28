import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResumeAnalysis } from "@/types/resume";

interface ResumeAnalysisListProps {
  analyses: ResumeAnalysis[];
}

export function ResumeAnalysisList({ analyses }: ResumeAnalysisListProps) {
  if (analyses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No scans yet — analyze this resume against a role to get an ATS
        score and feedback.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {analyses.map((analysis) => (
        <ResumeAnalysisCard key={analysis.id} analysis={analysis} />
      ))}
    </div>
  );
}

function ResumeAnalysisCard({ analysis }: { analysis: ResumeAnalysis }) {
  const roleLabel = analysis.jobDescription
    ? analysis.jobDescription.company
      ? `${analysis.jobDescription.title} at ${analysis.jobDescription.company}`
      : analysis.jobDescription.title
    : "Unknown role";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {roleLabel}
          <Badge variant={analysis.status === "FAILED" ? "destructive" : "secondary"}>
            {analysis.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {analysis.status === "FAILED" && (
          <p className="text-sm text-destructive">
            {analysis.errorMessage ?? "This analysis failed."}
          </p>
        )}

        {analysis.status === "COMPLETED" && analysis.atsScore !== null && (
          <>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">ATS match score</span>
                <span className="text-muted-foreground">
                  {analysis.atsScore}/100
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${analysis.atsScore}%` }}
                />
              </div>
            </div>

            {analysis.matchedKeywords.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Matched keywords</span>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.matchedKeywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {analysis.missingKeywords.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Missing keywords</span>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.missingKeywords.map((keyword) => (
                    <Badge key={keyword} variant="outline">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {analysis.suggestions && analysis.suggestions.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Suggestions</span>
                <ul className="flex flex-col gap-2">
                  {analysis.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {suggestion.section}:
                      </span>{" "}
                      {suggestion.suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

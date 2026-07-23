import { InterviewSessionDetail } from "@/components/interviews/interview-session-detail";

export default async function InterviewSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InterviewSessionDetail sessionId={id} />;
}

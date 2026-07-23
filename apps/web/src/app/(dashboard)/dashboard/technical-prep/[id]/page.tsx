import { PrepSessionDetail } from "@/components/technical-prep/prep-session-detail";

export default async function TechnicalPrepSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PrepSessionDetail sessionId={id} />;
}

import { ResumeDetail } from "@/components/dashboard/resume-detail";

export default async function ResumeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ResumeDetail resumeId={id} />;
}

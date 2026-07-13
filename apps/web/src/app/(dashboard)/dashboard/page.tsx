import { ResumeList } from "@/components/dashboard/resume-list";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Your resumes, interview sessions, and prep progress.
        </p>
      </div>
      <section>
        <h2 className="mb-3 text-lg font-medium">Resumes</h2>
        <ResumeList />
      </section>
    </div>
  );
}

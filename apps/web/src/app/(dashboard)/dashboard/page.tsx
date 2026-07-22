import { NewResumeForm } from "@/components/dashboard/new-resume-form";
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
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <h2 className="mb-3 text-lg font-medium">Resumes</h2>
          <ResumeList />
        </div>
        <NewResumeForm />
      </section>
    </div>
  );
}

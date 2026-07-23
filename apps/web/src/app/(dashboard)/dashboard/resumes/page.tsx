import { NewResumeForm } from "@/components/dashboard/new-resume-form";
import { ResumeList } from "@/components/dashboard/resume-list";

export default function ResumesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Resumes</h1>
        <p className="text-sm text-muted-foreground">
          Upload a PDF resume to get AI feedback and ATS scoring.
        </p>
      </div>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ResumeList />
        <NewResumeForm />
      </section>
    </div>
  );
}

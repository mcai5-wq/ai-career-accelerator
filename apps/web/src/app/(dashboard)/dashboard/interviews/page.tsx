import { InterviewSessionList } from "@/components/interviews/interview-session-list";
import { NewInterviewForm } from "@/components/interviews/new-interview-form";

export default function InterviewsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Interview Prep</h1>
        <p className="text-sm text-muted-foreground">
          Practice role-specific interview questions and get AI feedback on
          your answers.
        </p>
      </div>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <InterviewSessionList />
        <NewInterviewForm />
      </section>
    </div>
  );
}

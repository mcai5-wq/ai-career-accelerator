import { NewPrepForm } from "@/components/technical-prep/new-prep-form";
import { PrepSessionList } from "@/components/technical-prep/prep-session-list";

export default function TechnicalPrepPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Technical Prep</h1>
        <p className="text-sm text-muted-foreground">
          Company-specific topic breakdowns and curated practice problems.
        </p>
      </div>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PrepSessionList />
        <NewPrepForm />
      </section>
    </div>
  );
}

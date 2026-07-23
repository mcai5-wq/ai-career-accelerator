import { DashboardStats } from "@/components/overview/dashboard-stats";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Your resumes, interview sessions, and prep progress.
        </p>
      </div>
      <DashboardStats />
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance">
        Land your next role with an AI-powered career coach.
      </h1>
      <p className="max-w-xl text-muted-foreground">
        Get instant resume feedback, practice interviews, and
        company-specific technical prep — all in one place.
      </p>
      <Button
        size="lg"
        nativeButton={false}
        render={<Link href="/login">Get started</Link>}
      />
    </main>
  );
}

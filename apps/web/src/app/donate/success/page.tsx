import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DonateSuccessPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Thank you! 🎉</h1>
      <p className="max-w-md text-muted-foreground">
        Your donation was received. It genuinely helps keep this project
        running — thank you for supporting it.
      </p>
      <Button nativeButton={false} render={<Link href="/">Back to home</Link>} />
    </main>
  );
}

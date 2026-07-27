import Link from "next/link";
import { DonateForm } from "@/components/donate/donate-form";

export default function DonatePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="max-w-xl">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          Help keep AI Career Accelerator free
        </h1>
        <p className="mt-2 text-muted-foreground">
          This project is free to use. If it&apos;s helped you, a small
          donation goes toward hosting and API costs.
        </p>
      </div>
      <DonateForm />
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        Back to home
      </Link>
    </main>
  );
}

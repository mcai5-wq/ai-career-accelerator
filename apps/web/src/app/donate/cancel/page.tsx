import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DonateCancelPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Checkout canceled</h1>
      <p className="max-w-md text-muted-foreground">
        No charge was made. You can try again anytime.
      </p>
      <div className="flex gap-3">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/donate">Try again</Link>}
        />
        <Button nativeButton={false} render={<Link href="/">Back to home</Link>} />
      </div>
    </main>
  );
}

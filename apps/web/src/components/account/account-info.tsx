"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AccountInfo() {
  const { data: session } = useSession();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        <p>
          <span className="text-muted-foreground">Name:</span>{" "}
          {session?.user?.name ?? "—"}
        </p>
        <p>
          <span className="text-muted-foreground">Email:</span>{" "}
          {session?.user?.email ?? "—"}
        </p>
      </CardContent>
    </Card>
  );
}

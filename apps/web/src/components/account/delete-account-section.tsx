"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useDeleteAccount } from "@/lib/hooks/use-delete-account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DeleteAccountSection() {
  const { data: session } = useSession();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const deleteAccount = useDeleteAccount();

  const email = session?.user?.email ?? "";
  const canDelete = confirmation.length > 0 && confirmation === email;

  async function handleDelete() {
    await deleteAccount.mutateAsync();
    await signOut({ redirect: false });
    router.push("/");
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-base text-destructive">
          Danger zone
        </CardTitle>
        <CardDescription>
          Permanently deletes your account and everything tied to it —
          resumes, interview sessions, and technical prep progress. This
          can&apos;t be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="delete-confirm">
            Type <span className="font-medium">{email}</span> to confirm
          </Label>
          <Input
            id="delete-confirm"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={email}
            autoComplete="off"
          />
        </div>
        {deleteAccount.isError && (
          <p className="text-sm text-destructive">
            {deleteAccount.error?.message ??
              "Couldn't delete your account. Try again."}
          </p>
        )}
        <Button
          type="button"
          variant="destructive"
          disabled={!canDelete || deleteAccount.isPending}
          onClick={handleDelete}
          className="self-start"
        >
          {deleteAccount.isPending ? "Deleting…" : "Delete my account"}
        </Button>
      </CardContent>
    </Card>
  );
}

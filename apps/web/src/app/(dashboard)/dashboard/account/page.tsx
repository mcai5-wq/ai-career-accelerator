import { AccountInfo } from "@/components/account/account-info";
import { DeleteAccountSection } from "@/components/account/delete-account-section";

export default function AccountPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account settings.
        </p>
      </div>
      <AccountInfo />
      <DeleteAccountSection />
    </div>
  );
}

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  href: string;
  value: number | null | undefined;
  isLoading: boolean;
  isError: boolean;
  unit: string;
}

export function StatCard({
  title,
  href,
  value,
  isLoading,
  isError,
  unit,
}: StatCardProps) {
  return (
    <Link href={href} className="block">
      <Card className="transition-colors hover:bg-muted/40">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-2xl font-semibold text-muted-foreground">—</p>
          ) : isError ? (
            <p className="text-sm text-muted-foreground">Not connected yet</p>
          ) : (
            <p className="text-2xl font-semibold">
              {value}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {unit}
              </span>
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

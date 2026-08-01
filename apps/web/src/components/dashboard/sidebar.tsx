"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LayoutDashboard, MessagesSquare, Target } from "lucide-react";
// `Heart` was only used by the commented-out donations link below.
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/resumes", label: "Resumes", icon: FileText },
  { href: "/dashboard/interviews", label: "Interview Prep", icon: MessagesSquare },
  { href: "/dashboard/technical-prep", label: "Technical Prep", icon: Target },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 sm:flex">
      <div className="mb-6 px-2 text-lg font-semibold text-sidebar-foreground">
        Career Accelerator
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          // Exact match for the root Overview link, but prefix match for
          // the others so e.g. /dashboard/interviews/[id] still highlights
          // "Interview Prep" instead of nothing.
          const isActive =
            href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      {/* Donations is built but disabled — see apps/api/src/app.module.ts.
      <div className="mt-auto pt-4">
        <Link
          href="/donate"
          className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <Heart className="h-4 w-4" />
          Support this project
        </Link>
      </div>
      */}
    </aside>
  );
}

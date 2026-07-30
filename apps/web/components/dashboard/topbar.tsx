"use client";

import { Menu } from "lucide-react";
import { UserMenu } from "./user-menu";

type TopbarProps = {
  onMenuClick: () => void;
  displayName: string;
  email: string;
};

export function Topbar({ onMenuClick, displayName, email }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="md:hidden rounded-md p-2 text-slate-600 hover:bg-slate-100"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Reserved for breadcrumbs/page title once inner pages need them
          (Phase 4+) — kept empty on the shell itself to avoid guessing
          content structure ahead of the pages that will use it. */}
      <div className="flex-1" />

      <UserMenu displayName={displayName} email={email} />
    </header>
  );
}

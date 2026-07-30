"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

type DashboardShellProps = {
  storeName: string;
  displayName: string;
  email: string;
  children: ReactNode;
};

/**
 * The one piece of client-side state the whole shell needs — whether the
 * mobile sidebar drawer is open — lives here, one level above both Sidebar
 * (which renders the drawer) and Topbar (whose hamburger button opens it).
 * Keeping it here instead of in the server-component layout is what makes
 * the layout itself stay a server component (it fetches store/user data
 * server-side, per the existing (dashboard)/layout.tsx pattern) while this
 * one wrapper opts into interactivity.
 */
export function DashboardShell({ storeName, displayName, email, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar storeName={storeName} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="md:pl-60">
        <Topbar
          onMenuClick={() => setMobileOpen(true)}
          displayName={displayName}
          email={email}
        />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

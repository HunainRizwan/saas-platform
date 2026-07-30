import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  BarChart3,
  Boxes,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

// Order here is the order they render in the sidebar — matches the
// Phase 3b spec exactly. Products/Orders/Customers/Analytics/Inventory/
// Settings link to stub "coming soon" pages for now (Phase 4+ builds the
// real screens) — no dead links in the shell, per "production-ready".
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Products", href: "/products", icon: Package },
  { label: "Orders", href: "/orders", icon: ShoppingBag },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Settings", href: "/settings", icon: Settings },
];

/**
 * Pure function, deliberately extracted from the Sidebar component so it's
 * unit-testable without rendering React (this test setup runs in a plain
 * Node environment, no jsdom — see vitest.config.ts and the existing
 * tests/dashboard-setup.test.ts for the established pattern of testing
 * logic directly rather than rendered output).
 *
 * "/dashboard" only matches exactly (it's the shell's home, not a prefix
 * every other route sits under). Every other nav item matches its own
 * path and any nested route under it, e.g. "/products/new" should still
 * highlight "Products".
 */
export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

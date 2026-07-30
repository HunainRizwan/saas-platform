import { describe, it, expect } from "vitest";
import { NAV_ITEMS, isNavActive } from "@/lib/dashboard/nav-config";

describe("NAV_ITEMS", () => {
  it("contains exactly the 7 required nav destinations, in spec order", () => {
    expect(NAV_ITEMS.map((i) => i.label)).toEqual([
      "Dashboard",
      "Products",
      "Orders",
      "Customers",
      "Analytics",
      "Inventory",
      "Settings",
    ]);
  });

  it("has a unique href for every item", () => {
    const hrefs = NAV_ITEMS.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("every item has an icon component", () => {
    for (const item of NAV_ITEMS) {
      expect(item.icon).toBeTruthy();
    }
  });
});

describe("isNavActive", () => {
  it("matches Dashboard only on an exact path", () => {
    expect(isNavActive("/dashboard", "/dashboard")).toBe(true);
    expect(isNavActive("/dashboard/setup", "/dashboard")).toBe(false);
  });

  it("matches other nav items on their exact path", () => {
    expect(isNavActive("/products", "/products")).toBe(true);
    expect(isNavActive("/orders", "/orders")).toBe(true);
  });

  it("matches other nav items on nested routes beneath them", () => {
    expect(isNavActive("/products/new", "/products")).toBe(true);
    expect(isNavActive("/products/abc123/edit", "/products")).toBe(true);
    expect(isNavActive("/orders/abc123", "/orders")).toBe(true);
  });

  it("does not match a different top-level section", () => {
    expect(isNavActive("/orders", "/products")).toBe(false);
    expect(isNavActive("/customers", "/products")).toBe(false);
  });

  it("does not false-positive on a path that merely starts with the same string", () => {
    // "/products-archive" should NOT match "/products"
    expect(isNavActive("/products-archive", "/products")).toBe(false);
  });
});

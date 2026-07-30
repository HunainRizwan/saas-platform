// Single source of truth for the database schema. Every table in this
// project is defined here and nowhere else — Drizzle Kit reads this barrel
// to generate migrations (see packages/database/drizzle.config.ts).
//
// password_reset_tokens intentionally does NOT exist in this schema —
// password reset is handled entirely by Supabase Auth's native flow
// (Phase 2 decision, see PROJECT.md "Key Baseline Decisions").

export * from "./users";
export * from "./stores";
export * from "./catalog";
export * from "./customers";
export * from "./orders";
export * from "./operations";
export * from "./audit";

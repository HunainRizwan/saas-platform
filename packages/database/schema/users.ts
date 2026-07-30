import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";

/**
 * `users` mirrors the identity that Supabase Auth manages in `auth.users`.
 * We keep our own `users` row (rather than reading `auth.users` directly
 * everywhere) so application-specific fields (full_name, role) have a home
 * that isn't Supabase's internal auth schema. `id` is the SAME uuid as
 * `auth.users.id` — this table is populated via a Supabase Auth trigger
 * (see packages/database/policies/00_auth_sync.sql) on signup, not created
 * independently by the app.
 *
 * NOTE: password_hash / password_reset_tokens from the original v1 draft
 * are intentionally REMOVED per the Phase 2 decision to use Supabase Auth's
 * native password + reset flow instead of a custom one.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(), // matches auth.users.id — NOT default-generated here
    email: text("email").notNull(),
    phone: text("phone"),
    fullName: text("full_name").notNull(),
    role: text("role").notNull().default("seller"), // seller | staff | super_admin
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index("idx_users_email").on(table.email),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

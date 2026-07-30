import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { users } from "./users";

/**
 * Single audit trail for the whole platform (reviewed ARCHITECTURE.md §5.3).
 * Subsumes the v1 `admin_actions` table — admin events are written here
 * with actor_role = 'super_admin' instead of living in a second table.
 * Written by application code in the same transaction as the state change
 * it records — NOT via DB trigger — so it can capture ip_address/user_agent.
 */
export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").references(() => stores.id, { onDelete: "cascade" }), // null = platform-level event
    actorUserId: uuid("actor_user_id").references(() => users.id),
    actorRole: text("actor_role"), // seller | staff | super_admin | system
    action: text("action").notNull(), // login | product.create | order.status_change | admin.* | ...
    entityType: text("entity_type"), // product | order | store | user
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata").default({}),
    ipAddress: text("ip_address"), // stored as text; validated as IP at the application layer
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    storeTimeIdx: index("idx_activity_logs_store_time").on(table.storeId, table.createdAt),
    actorIdx: index("idx_activity_logs_actor").on(table.actorUserId, table.createdAt),
  }),
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    recipientUserId: uuid("recipient_user_id")
      .notNull()
      .references(() => users.id),
    type: text("type").notNull(), // new_order | low_stock | trial_expiry | subscription_reminder | system_announcement
    title: text("title").notNull(),
    body: text("body"),
    linkUrl: text("link_url"),
    readAt: timestamp("read_at", { withTimezone: true }),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Partial index on unread notifications only — keeps the unread-count
    // badge query cheap at scale (reviewed ARCHITECTURE.md §5.4). Drizzle
    // doesn't yet support partial index `.where()` in all versions; if
    // unsupported, this is added as a raw SQL migration statement instead.
    recipientUnreadIdx: index("idx_notifications_recipient_unread").on(
      table.recipientUserId,
      table.readAt,
    ),
  }),
);

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Notification = typeof notifications.$inferSelect;

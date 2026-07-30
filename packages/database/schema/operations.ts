import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { products } from "./catalog";
import { orders } from "./orders";

export const inventoryLogs = pgTable(
  "inventory_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    changeQty: integer("change_qty").notNull(), // +/-
    reason: text("reason").notNull(), // order | manual_adjustment | restock
    // FK added per reviewed ARCHITECTURE.md §5.7/§8 — v1 had this as a bare
    // uuid with no FK, an unenforced integrity gap.
    orderId: uuid("order_id").references(() => orders.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productIdx: index("idx_inventory_logs_product").on(table.productId),
  }),
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    plan: text("plan").notNull().default("trial"), // trial | monthly | yearly
    status: text("status").notNull().default("active"), // active | past_due | cancelled
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Needed daily by the trial-expiry job (reviewed ARCHITECTURE.md §5.7).
    storeStatusIdx: index("idx_subscriptions_store_status").on(table.storeId, table.status),
  }),
);

export type InventoryLog = typeof inventoryLogs.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;

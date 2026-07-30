import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { customers } from "./customers";
import { products } from "./catalog";
import { productVariants } from "./catalog";
import { users } from "./users";

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    orderNumber: text("order_number").notNull(), // human-friendly, per-store sequence
    status: text("status").notNull().default("pending"),
    // pending | confirmed | packed | dispatched | delivered | cancelled
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
    deliveryCharge: numeric("delivery_charge", { precision: 10, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),

    // Snapshots at order time — order history must survive customer edits.
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerAddress: text("customer_address").notNull(),
    customerCity: text("customer_city").notNull(),
    notes: text("notes"),

    trackingToken: text("tracking_token").notNull(), // public track/{token} URL — random, non-guessable
    idempotencyKey: text("idempotency_key"), // reviewed ARCHITECTURE.md §9 — prevents duplicate checkout submits

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    storeOrderNumberUnique: uniqueIndex("uq_orders_store_order_number").on(
      table.storeId,
      table.orderNumber,
    ),
    trackingTokenUnique: uniqueIndex("uq_orders_tracking_token").on(table.trackingToken),
    storeStatusCreatedIdx: index("idx_orders_store_status_created").on(
      table.storeId,
      table.status,
      table.createdAt,
    ),
    storeCreatedIdx: index("idx_orders_store_created").on(table.storeId, table.createdAt),
    idempotencyKeyIdx: index("idx_orders_idempotency_key").on(table.idempotencyKey),
  }),
);

/**
 * Deliberately has NO store_id column (reviewed ARCHITECTURE.md §5.7) —
 * denormalizing it here would let it drift from orders.store_id. RLS on
 * this table is expressed as a subquery policy against `orders` instead
 * (see packages/database/policies/07_order_items.sql).
 */
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    variantId: uuid("variant_id").references(() => productVariants.id), // nullable until variants ship
    productName: text("product_name").notNull(), // snapshot
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(), // snapshot
    quantity: integer("quantity").notNull(),
    lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
  },
  (table) => ({
    orderIdx: index("idx_order_items_order").on(table.orderId),
  }),
);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    changedBy: uuid("changed_by").references(() => users.id), // null = system/webhook-originated
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orderIdx: index("idx_order_status_history_order").on(table.orderId),
  }),
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;

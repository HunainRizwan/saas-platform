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

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    address: text("address"),
    city: text("city"),
    // Denormalized aggregates — updated transactionally by application code
    // alongside the order-status write to `delivered` (reviewed ARCHITECTURE.md
    // §5.8), NOT via a DB trigger. Do not write to these columns directly
    // from any other code path.
    totalOrders: integer("total_orders").default(0),
    totalSpent: numeric("total_spent", { precision: 12, scale: 2 }).default("0"),
    lastPurchaseAt: timestamp("last_purchase_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    storePhoneUnique: uniqueIndex("uq_customers_store_phone").on(table.storeId, table.phone),
    storeLastPurchaseIdx: index("idx_customers_store_last_purchase").on(
      table.storeId,
      table.lastPurchaseAt,
    ),
  }),
);

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

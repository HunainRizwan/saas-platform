import {
  pgTable,
  uuid,
  text,
  numeric,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const stores = pgTable(
  "stores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    logoUrl: text("logo_url"),
    bannerUrl: text("banner_url"),
    whatsappNumber: text("whatsapp_number"),
    phone: text("phone"),
    address: text("address"),
    city: text("city"),
    deliveryCharge: numeric("delivery_charge", { precision: 10, scale: 2 }).default("0"),
    freeDeliveryMin: numeric("free_delivery_min", { precision: 10, scale: 2 }),
    socialLinks: jsonb("social_links").default({}),
    theme: jsonb("theme").default({}),
    status: text("status").notNull().default("trial"), // trial | active | suspended | expired
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }).notNull(),
    preferredCourier: text("preferred_courier"), // nullable, future §17 — not used in Phase 2

    // Store Setup Wizard fields (Phase 3)
    country: text("country").notNull().default("Pakistan"),
    currency: text("currency").notNull().default("PKR"),
    description: text("description"), // optional, seller-facing "about this store"
    businessCategory: text("business_category"), // optional, free-form for MVP (e.g. "Clothing", "Cosmetics")

    // Ad tracking (Phase 3c / Beta MVP Scope §6) — lets sellers run TikTok
    // and Facebook/Meta ads to their store with working conversion
    // tracking/retargeting. Both nullable/optional: most beta sellers
    // won't have one on day one, and neither is required for the store
    // to function.
    facebookPixelId: text("facebook_pixel_id"),
    tiktokPixelId: text("tiktok_pixel_id"),

    // SEO fields (reviewed ARCHITECTURE.md §5.5)
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    ogImageUrl: text("og_image_url"),
    canonicalUrl: text("canonical_url"),
    structuredData: jsonb("structured_data").default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex("uq_stores_slug").on(table.slug),
    ownerIdx: index("idx_stores_owner").on(table.ownerId),
  }),
);

export const storeStaff = pgTable(
  "store_staff",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("staff"), // owner | manager | staff
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    storeUserUnique: uniqueIndex("uq_store_staff_store_user").on(table.storeId, table.userId),
  }),
);

export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;
export type StoreStaff = typeof storeStaff.$inferSelect;

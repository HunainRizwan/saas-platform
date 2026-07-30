import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  jsonb,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    storeSlugUnique: uniqueIndex("uq_categories_store_slug").on(table.storeId, table.slug),
  }),
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    sku: text("sku"),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    salePrice: numeric("sale_price", { precision: 10, scale: 2 }),
    // Simple-product path (no variants): stock/price live here directly.
    // A product with rows in product_variants treats these as fallback only.
    stockQty: integer("stock_qty").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").default(5),
    status: text("status").notNull().default("active"), // active | draft | out_of_stock | archived
    attributes: jsonb("attributes").default({}),

    // SEO fields (reviewed ARCHITECTURE.md §5.5)
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    ogImageUrl: text("og_image_url"),
    canonicalUrl: text("canonical_url"),
    structuredData: jsonb("structured_data").default({}),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    storeSlugUnique: uniqueIndex("uq_products_store_slug").on(table.storeId, table.slug),
    storeStatusCreatedIdx: index("idx_products_store_status_created").on(
      table.storeId,
      table.status,
      table.createdAt,
    ),
    categoryIdx: index("idx_products_category").on(table.categoryId),
  }),
);

/**
 * Dedicated image table (reviewed ARCHITECTURE.md §5.1) — replaces the v1
 * `products.images` jsonb array. Row-level updates, ordering, and per-image
 * metadata (dimensions, alt text, primary flag) all need a real table.
 */
export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    altText: text("alt_text"),
    sortOrder: integer("sort_order").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productSortIdx: index("idx_product_images_product").on(table.productId, table.sortOrder),
  }),
);

/**
 * Variant schema exists now so turning on variant UI later is additive, not
 * a breaking migration (reviewed ARCHITECTURE.md §5.2). NOT used by any
 * Phase 2–6 UI — a product with zero variant rows is priced/stocked from
 * the parent `products` row.
 */
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku"),
    barcode: text("barcode"),
    optionValues: jsonb("option_values").notNull().default({}), // {size: "M", color: "Red"}
    price: numeric("price", { precision: 10, scale: 2 }), // NULL = inherit product.price
    salePrice: numeric("sale_price", { precision: 10, scale: 2 }),
    stockQty: integer("stock_qty").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold"),
    imageId: uuid("image_id").references(() => productImages.id),
    isDefault: boolean("is_default").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    storeSkuUnique: uniqueIndex("uq_product_variants_store_sku").on(table.storeId, table.sku),
  }),
);

export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;

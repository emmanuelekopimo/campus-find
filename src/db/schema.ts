import { sql } from "drizzle-orm";
import { check, customType, date, index, integer, pgEnum, pgTable, serial, text, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["student", "staff"]);
export const itemTypeEnum = pgEnum("item_type", ["lost", "found"]);
export const itemStatusEnum = pgEnum("item_status", ["open", "claimed", "resolved"]);
export const claimStatusEnum = pgEnum("claim_status", ["pending", "accepted", "declined"]);
export const categoryEnum = pgEnum("item_category", [
  "Phones",
  "Electronics",
  "Bags",
  "Wallets",
  "IDs and Cards",
  "Keys",
  "Books",
  "Clothing",
  "Accessories",
  "Other",
]);

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 160 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("student"),
  department: varchar("department", { length: 120 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const items = pgTable(
  "items",
  {
    id: serial("id").primaryKey(),
    type: itemTypeEnum("type").notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    description: text("description").notNull(),
    category: categoryEnum("category").notNull(),
    location: varchar("location", { length: 140 }).notNull(),
    /** The day the item was lost or found. */
    happenedOn: date("happened_on").notNull(),
    imageUrl: text("image_url"),
    status: itemStatusEnum("status").notNull().default("open"),
    postedBy: integer("posted_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [index("items_type_status_idx").on(t.type, t.status), index("items_category_idx").on(t.category), index("items_posted_by_idx").on(t.postedBy)],
);

export const claims = pgTable(
  "claims",
  {
    id: serial("id").primaryKey(),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    claimantId: integer("claimant_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    contact: varchar("contact", { length: 40 }),
    status: claimStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("claims_item_claimant_unique").on(t.itemId, t.claimantId), check("claims_message_length", sql`length(${t.message}) >= 10`)],
);

export const uploads = pgTable("uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  mime: varchar("mime", { length: 60 }).notNull(),
  data: bytea("data").notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Item = typeof items.$inferSelect;
export type Claim = typeof claims.$inferSelect;
export type Category = (typeof categoryEnum.enumValues)[number];
export const CATEGORIES = categoryEnum.enumValues;

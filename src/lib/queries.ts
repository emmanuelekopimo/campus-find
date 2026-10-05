import { and, desc, eq, gte, ilike, ne, or, sql, inArray } from "drizzle-orm";
import type { DB } from "@/db";
import { claims, items, users, type Category, type Item } from "@/db/schema";
import { claimBlocker, canAcceptClaim, canResolve } from "./items";
import { findMatches, type Match } from "./matching";
import { addDays } from "./today";

export type FeedItem = Item & { posterName: string; claimCount: number };

const claimCount = sql<number>`(select count(*)::int from claims c where c.item_id = "items"."id")`;

export type Filter = { q?: string; type?: "lost" | "found" | ""; category?: Category | ""; status?: "open" | "resolved" | "all" };

export async function listItems(database: DB, f: Filter): Promise<FeedItem[]> {
  const conds = [];
  if (f.type) conds.push(eq(items.type, f.type));
  if (f.category) conds.push(eq(items.category, f.category));
  if (!f.status || f.status === "open") conds.push(ne(items.status, "resolved"));
  else if (f.status === "resolved") conds.push(eq(items.status, "resolved"));
  if (f.q?.trim()) {
    const like = `%${f.q.trim()}%`;
    conds.push(or(ilike(items.title, like), ilike(items.description, like), ilike(items.location, like)));
  }
  const rows = await database
    .select({ item: items, posterName: users.name, claimCount })
    .from(items)
    .innerJoin(users, eq(users.id, items.postedBy))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(items.createdAt));
  return rows.map((r) => ({ ...r.item, posterName: r.posterName, claimCount: r.claimCount }));
}

export async function feedStats(database: DB, today: string) {
  const r = await database.execute(sql`
    select
      count(*) filter (where type = 'lost' and status <> 'resolved')::int as lost,
      count(*) filter (where type = 'found' and status <> 'resolved')::int as found,
      count(*) filter (where status = 'resolved' and resolved_at >= ${addDays(today, -30)}::date)::int as returned
    from items`);
  return r.rows[0] as { lost: number; found: number; returned: number };
}

export type ClaimView = {
  id: number;
  message: string;
  contact: string | null;
  status: "pending" | "accepted" | "declined";
  createdAt: Date;
  claimantId: number;
  claimantName: string;
  claimantEmail: string;
};

/** One item as seen by `userId`. Claims are only included when the viewer posted the item. */
export async function getItem(database: DB, userId: number, id: number) {
  const [row] = await database
    .select({ item: items, poster: { id: users.id, name: users.name, email: users.email, phone: users.phone, department: users.department } })
    .from(items)
    .innerJoin(users, eq(users.id, items.postedBy))
    .where(eq(items.id, id));
  if (!row) return null;
  const isOwner = row.item.postedBy === userId;
  const all = await database
    .select({
      id: claims.id,
      message: claims.message,
      contact: claims.contact,
      status: claims.status,
      createdAt: claims.createdAt,
      claimantId: claims.claimantId,
      claimantName: users.name,
      claimantEmail: users.email,
    })
    .from(claims)
    .innerJoin(users, eq(users.id, claims.claimantId))
    .where(eq(claims.itemId, id))
    .orderBy(desc(claims.createdAt));
  const myClaim = all.find((c) => c.claimantId === userId) ?? null;
  return { ...row, isOwner, claims: isOwner ? (all as ClaimView[]) : [], claimTotal: all.length, myClaim };
}

/** Possible matches for an item among open posts of the opposite type. */
export async function matchesFor(database: DB, item: Item): Promise<Match<FeedItem>[]> {
  const opposite = item.type === "lost" ? "found" : "lost";
  const pool = await database
    .select({ item: items, posterName: users.name, claimCount })
    .from(items)
    .innerJoin(users, eq(users.id, items.postedBy))
    .where(and(eq(items.type, opposite), ne(items.status, "resolved"), gte(items.happenedOn, addDays(item.happenedOn, -60))));
  const candidates = pool.map((r) => ({ ...r.item, posterName: r.posterName, claimCount: r.claimCount }));
  return findMatches(item, candidates);
}

export type NewItem = {
  type: "lost" | "found";
  title: string;
  description: string;
  category: Category;
  location: string;
  happenedOn: string;
  imageUrl: string | null;
};

export async function createItem(database: DB, userId: number, input: NewItem) {
  const [r] = await database.insert(items).values({ ...input, postedBy: userId }).returning({ id: items.id });
  return r.id;
}

export type Result = { ok: true } | { ok: false; error: string };

export async function submitClaim(database: DB, userId: number, itemId: number, message: string, contact: string | null): Promise<Result> {
  return database.transaction(async (tx) => {
    await tx.execute(sql`select id from items where id = ${itemId} for update`);
    const [item] = await tx.select().from(items).where(eq(items.id, itemId));
    if (!item) return { ok: false, error: "Item not found" } as const;
    const mine = await tx.select({ id: claims.id }).from(claims).where(and(eq(claims.itemId, itemId), eq(claims.claimantId, userId)));
    const blocked = claimBlocker(item, userId, mine.length > 0);
    if (blocked) return { ok: false, error: blocked } as const;
    await tx.insert(claims).values({ itemId, claimantId: userId, message, contact });
    return { ok: true } as const;
  });
}

/** Owner accepts or declines a claim. Accepting marks the item claimed and declines the other pending claims. */
export async function decideClaim(database: DB, userId: number, claimId: number, decision: "accept" | "decline"): Promise<Result> {
  return database.transaction(async (tx) => {
    const [c] = await tx.select().from(claims).where(eq(claims.id, claimId));
    if (!c) return { ok: false, error: "Claim not found" } as const;
    await tx.execute(sql`select id from items where id = ${c.itemId} for update`);
    const [item] = await tx.select().from(items).where(eq(items.id, c.itemId));
    if (!canAcceptClaim(item, userId, c.status)) return { ok: false, error: "You cannot change this claim" } as const;
    if (decision === "decline") {
      await tx.update(claims).set({ status: "declined" }).where(eq(claims.id, claimId));
      return { ok: true } as const;
    }
    await tx.update(claims).set({ status: "accepted" }).where(eq(claims.id, claimId));
    await tx.update(claims).set({ status: "declined" }).where(and(eq(claims.itemId, item.id), eq(claims.status, "pending")));
    await tx.update(items).set({ status: "claimed" }).where(eq(items.id, item.id));
    return { ok: true } as const;
  });
}

export async function markResolved(database: DB, userId: number, itemId: number, now: Date): Promise<Result> {
  const [item] = await database.select().from(items).where(eq(items.id, itemId));
  if (!item || !canResolve(item, userId)) return { ok: false, error: "Only the poster can close this item" };
  await database.update(items).set({ status: "resolved", resolvedAt: now }).where(eq(items.id, itemId));
  return { ok: true };
}

/** Posts made by the signed-in user, with pending claim counts. */
export async function myItems(database: DB, userId: number) {
  return database
    .select({
      item: items,
      pending: sql<number>`(select count(*)::int from claims c where c.item_id = "items"."id" and c.status = 'pending')`,
      total: claimCount,
    })
    .from(items)
    .where(eq(items.postedBy, userId))
    .orderBy(desc(items.createdAt));
}

/** Claims sent by the signed-in user. */
export async function myClaims(database: DB, userId: number) {
  return database
    .select({ claim: claims, item: items, posterName: users.name, posterEmail: users.email, posterPhone: users.phone })
    .from(claims)
    .innerJoin(items, eq(items.id, claims.itemId))
    .innerJoin(users, eq(users.id, items.postedBy))
    .where(eq(claims.claimantId, userId))
    .orderBy(desc(claims.createdAt));
}

export async function findUserByEmail(database: DB, email: string) {
  const [u] = await database.select().from(users).where(eq(users.email, email));
  return u ?? null;
}

export async function usersByIds(database: DB, ids: number[]) {
  if (!ids.length) return [];
  return database.select().from(users).where(inArray(users.id, ids));
}

/** Pending claims waiting on the signed-in user's own posts (for the sidebar badge). */
export async function pendingForUser(database: DB, userId: number): Promise<number> {
  const r = await database.execute(
    sql`select count(*)::int as n from claims c join items i on i.id = c.item_id where i.posted_by = ${userId} and c.status = 'pending' and i.status = 'open'`,
  );
  return Number((r.rows[0] as { n: number }).n);
}

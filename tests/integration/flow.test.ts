import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Pool } from "pg";
import type { DB } from "@/db";
import { claims, items, users } from "@/db/schema";
import { createItem, decideClaim, feedStats, getItem, listItems, markResolved, matchesFor, myClaims, myItems, pendingForUser, submitClaim } from "@/lib/queries";
import { DEMO } from "@/db/seed-data";
import { freshDb, NOW } from "./setup";

let pool: Pool;
let database: DB;
let demoId: number;
let counts: { users: number; items: number; claims: number };
const userId = async (name: string) => (await database.select().from(users).where(eq(users.name, name)))[0].id;
const itemId = async (title: string) => (await database.select().from(items).where(eq(items.title, title)))[0].id;

beforeAll(async () => {
  ({ pool, database, counts } = await freshDb());
  demoId = (await database.select().from(users).where(eq(users.email, DEMO.email)))[0].id;
});
afterAll(() => pool.end());

describe("seed", () => {
  it("loads 40 users, 40+ items with a mix of states", async () => {
    expect(counts.users).toBe(40);
    expect(counts.items).toBeGreaterThanOrEqual(40);
    const all = await listItems(database, { status: "all" });
    expect(all.filter((i) => i.status === "resolved").length).toBeGreaterThan(2);
    expect(all.filter((i) => i.status === "claimed").length).toBeGreaterThan(0);
    expect(all.filter((i) => !i.imageUrl).length).toBeGreaterThan(2);
    const s = await feedStats(database, "2026-10-05");
    expect(s.lost + s.found).toBe(all.filter((i) => i.status !== "resolved").length);
  });
});

describe("posting a found item suggests the matching lost item", () => {
  it("finds the lost Casio calculator first", async () => {
    const id = await createItem(database, demoId, {
      type: "found",
      title: "Black scientific calculator",
      description: "Found a black Casio calculator under a seat in LT2 after the test.",
      category: "Electronics",
      location: "Faculty of Science",
      happenedOn: "2026-10-04",
      imageUrl: null,
    });
    const item = (await getItem(database, demoId, id))!.item;
    const m = await matchesFor(database, item);
    expect(m[0].item.title).toBe("Casio fx-991ES calculator");
    expect(m[0].score).toBeGreaterThanOrEqual(80);
    expect(m.map((x) => x.item.title)).toContain("HP scientific calculator");
    expect(m.every((x) => x.item.type === "lost")).toBe(true);
  });
});

describe("claims", () => {
  it("lets a student claim someone else's found item once", async () => {
    const id = await itemId("Earbuds charging case found in library reading room");
    expect(await submitClaim(database, demoId, id, "Black Oraimo buds, the left one has a scratch.", "08031234501")).toEqual({ ok: true });
    expect(await submitClaim(database, demoId, id, "Sending again to be safe.", null)).toEqual({ ok: false, error: "You have already sent a message about this item" });
    expect((await myClaims(database, demoId)).some((c) => c.item.id === id)).toBe(true);
  });
  it("blocks claims on your own post", async () => {
    const id = await itemId("Brown leather wallet with ATM card");
    expect((await submitClaim(database, demoId, id, "This is my own wallet post.", null)).ok).toBe(false);
  });
  it("only shows claims to the poster", async () => {
    const id = await itemId("Brown leather wallet with ATM card");
    expect((await getItem(database, demoId, id))!.claims.length).toBe(2);
    const other = await userId("Precious Etuk");
    const view = (await getItem(database, other, id))!;
    expect(view.claims).toEqual([]);
    expect(view.myClaim?.status).toBe("pending");
  });
  it("accepting one claim declines the rest and marks the item claimed; then the owner resolves it", async () => {
    const id = await itemId("Brown leather wallet with ATM card");
    expect(await pendingForUser(database, demoId)).toBeGreaterThanOrEqual(2);
    const ifiok = await userId("Ifiok Essien");
    const rows = await database.select().from(claims).where(eq(claims.itemId, id));
    const good = rows.find((r) => r.claimantId === ifiok)!;
    const stranger = await userId("Precious Etuk");
    expect((await decideClaim(database, stranger, good.id, "accept")).ok).toBe(false);
    expect(await decideClaim(database, demoId, good.id, "accept")).toEqual({ ok: true });
    const after = await database.select().from(claims).where(eq(claims.itemId, id));
    expect(after.find((r) => r.id === good.id)!.status).toBe("accepted");
    expect(after.filter((r) => r.id !== good.id).every((r) => r.status === "declined")).toBe(true);
    expect((await getItem(database, demoId, id))!.item.status).toBe("claimed");
    expect((await submitClaim(database, await userId("Joy Nkanta"), id, "Is it still available?", null)).ok).toBe(false);
    expect((await markResolved(database, stranger, id, NOW)).ok).toBe(false);
    expect(await markResolved(database, demoId, id, NOW)).toEqual({ ok: true });
    const done = (await getItem(database, demoId, id))!.item;
    expect(done.status).toBe("resolved");
    expect(done.resolvedAt).not.toBeNull();
  });
  it("keeps one claim per student per item in the database", async () => {
    const id = await itemId("Green water bottle");
    const u = await userId("Ngozi Obi");
    await database.insert(claims).values({ itemId: id, claimantId: u, message: "My bottle, has a dent." });
    await expect(database.insert(claims).values({ itemId: id, claimantId: u, message: "My bottle, has a dent." })).rejects.toThrow();
  });
});

describe("scoping and filters", () => {
  it("My posts returns only the signed-in student's items", async () => {
    const mine = await myItems(database, demoId);
    expect(mine.length).toBeGreaterThanOrEqual(2);
    expect(mine.every((r) => r.item.postedBy === demoId)).toBe(true);
  });
  it("filters by type, category and search text, hiding resolved by default", async () => {
    const lostPhones = await listItems(database, { type: "lost", category: "Phones" });
    expect(lostPhones.length).toBeGreaterThan(0);
    expect(lostPhones.every((i) => i.type === "lost" && i.category === "Phones")).toBe(true);
    const q = await listItems(database, { q: "keys" });
    expect(q.length).toBeGreaterThan(0);
    expect((await listItems(database, {})).some((i) => i.status === "resolved")).toBe(false);
    expect((await listItems(database, { status: "resolved" })).every((i) => i.status === "resolved")).toBe(true);
  });
});

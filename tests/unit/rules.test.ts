import { describe, expect, it } from "vitest";
import { agoLabel, canAcceptClaim, canResolve, checkHappenedOn, claimBlocker, isStale, whatsappLink } from "@/lib/items";
import { addDays, campusDay, daysBetween, resolveNow } from "@/lib/today";
import { claimSchema, itemSchema, checkImageFile, fieldErrors } from "@/lib/validation";
import { signSession, verifySession } from "@/lib/auth";

const item = { status: "open" as const, postedBy: 1, type: "found" as const, happenedOn: "2026-10-03" };

describe("claim rules", () => {
  it("allows another student to claim an open item once", () => expect(claimBlocker(item, 2, false)).toBeNull());
  it("blocks your own post, claimed or resolved items and repeat claims", () => {
    expect(claimBlocker(item, 1, false)).toMatch(/your own/);
    expect(claimBlocker({ ...item, status: "claimed" }, 2, false)).toMatch(/already accepted/);
    expect(claimBlocker({ ...item, status: "resolved" }, 2, false)).toMatch(/returned/);
    expect(claimBlocker(item, 2, true)).toMatch(/already sent/);
  });
  it("only the poster can accept pending claims on open items", () => {
    expect(canAcceptClaim(item, 1, "pending")).toBe(true);
    expect(canAcceptClaim(item, 2, "pending")).toBe(false);
    expect(canAcceptClaim(item, 1, "declined")).toBe(false);
    expect(canAcceptClaim({ ...item, status: "claimed" }, 1, "pending")).toBe(false);
  });
  it("only the poster can resolve, and only once", () => {
    expect(canResolve(item, 1)).toBe(true);
    expect(canResolve(item, 2)).toBe(false);
    expect(canResolve({ ...item, status: "resolved" }, 1)).toBe(false);
  });
});

describe("dates", () => {
  it("labels age in days and weeks", () => {
    expect(agoLabel("2026-10-05", "2026-10-05")).toBe("Today");
    expect(agoLabel("2026-10-04", "2026-10-05")).toBe("Yesterday");
    expect(agoLabel("2026-10-01", "2026-10-05")).toBe("4 days ago");
    expect(agoLabel("2026-09-14", "2026-10-05")).toBe("3 weeks ago");
  });
  it("flags open posts older than 30 days", () => {
    expect(isStale({ ...item, happenedOn: "2026-08-30" }, "2026-10-05")).toBe(true);
    expect(isStale({ ...item, happenedOn: "2026-08-30", status: "resolved" }, "2026-10-05")).toBe(false);
  });
  it("validates the lost or found date", () => {
    expect(checkHappenedOn("2026-10-05", "2026-10-05")).toBeUndefined();
    expect(checkHappenedOn("2026-10-06", "2026-10-05")).toMatch(/future/);
    expect(checkHappenedOn("2025-01-01", "2026-10-05")).toMatch(/6 months/);
    expect(checkHappenedOn("yesterday", "2026-10-05")).toMatch(/valid/);
  });
  it("supports the CAMPUSFIND_TODAY override and campus day math", () => {
    expect(resolveNow("2026-10-05").toISOString()).toBe("2026-10-05T09:00:00.000Z");
    expect(campusDay(new Date("2026-10-05T23:30:00Z"))).toBe("2026-10-06");
    expect(addDays("2026-10-01", -2)).toBe("2026-09-29");
    expect(daysBetween("2026-09-29", "2026-10-05")).toBe(6);
  });
});

describe("contact links", () => {
  it("builds WhatsApp links for Nigerian numbers", () => {
    expect(whatsappLink("0803 123 4567", "Hi there")).toBe("https://wa.me/2348031234567?text=Hi%20there");
    expect(whatsappLink("+234 803 123 4567", "x")).toBe("https://wa.me/2348031234567?text=x");
    expect(whatsappLink("12345", "x")).toBeNull();
  });
});

describe("validation", () => {
  it("reports every missing field inline", () => {
    const r = itemSchema.safeParse({ type: "", title: "", description: "", category: "", location: "", happenedOn: "" });
    expect(Object.keys(fieldErrors(r.error!)).sort()).toEqual(["category", "description", "happenedOn", "location", "title", "type"]);
  });
  it("checks claim message and phone", () => {
    expect(claimSchema.safeParse({ message: "mine", contact: "" }).success).toBe(false);
    expect(claimSchema.safeParse({ message: "It has my name inside", contact: "abc" }).success).toBe(false);
    expect(claimSchema.safeParse({ message: "It has my name inside", contact: "0803 123 4567" }).success).toBe(true);
  });
  it("checks photo type and size", () => {
    expect(checkImageFile(new File(["x"], "a.gif", { type: "image/gif" }))).toMatch(/JPG/);
    expect(checkImageFile(new File([new Uint8Array(5 * 1024 * 1024)], "a.jpg", { type: "image/jpeg" }))).toMatch(/4 MB/);
    expect(checkImageFile(new File(["x"], "a.png", { type: "image/png" }))).toBeUndefined();
  });
});

describe("sessions", () => {
  it("round-trips and rejects forged tokens", async () => {
    const t = await signSession({ userId: 3, role: "student", name: "Ini" });
    expect((await verifySession(t))?.userId).toBe(3);
    expect(await verifySession(await signSession({ userId: 3, role: "student", name: "x" }, "a-different-secret-123456"))).toBeNull();
  });
});

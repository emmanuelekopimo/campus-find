import { describe, expect, it } from "vitest";
import { findMatches, matchLabel, matchScore, normalise, placeWords, tokenize, type MatchItem } from "@/lib/matching";

const base: MatchItem = { id: 1, type: "lost", title: "", description: "", category: "Electronics", location: "Faculty of Science", happenedOn: "2026-10-03", status: "open", postedBy: 1 };
const mk = (o: Partial<MatchItem>): MatchItem => ({ ...base, ...o });

describe("tokenize", () => {
  it("drops stop words, numbers and punctuation", () => {
    expect([...tokenize("I lost my Black calculator in LT2, 2 days ago!")]).toEqual(["black", "calculator", "lt2", "day", "ago"]);
  });
  it("maps brand names and plurals to shared words", () => {
    expect(normalise("iPhone")).toBe("phone");
    expect(normalise("AirPods")).toBe("earbud");
    expect(normalise("backpack")).toBe("bag");
    expect(normalise("keys")).toBe("key");
    expect(normalise("glasses")).toBe("glass");
    expect(normalise("batteries")).toBe("battery");
    expect(normalise("campus")).toBe("campus");
  });
  it("ignores generic place words", () => expect([...placeWords("Cafeteria, Main Campus")]).toEqual(["cafeteria"]));
});

describe("matchScore", () => {
  const lost = mk({ id: 1, title: "Casio fx-991ES calculator", description: "Black scientific calculator left in LT2", happenedOn: "2026-10-03" });
  const found = mk({ id: 2, type: "found", postedBy: 2, title: "Black calculator found", description: "Black Casio calculator on a desk in LT2", happenedOn: "2026-10-04" });

  it("scores a strong match with reasons", () => {
    const r = matchScore(lost, found);
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.reasons).toContain("Same category: Electronics");
    expect(r.reasons).toContain("Same place: Faculty of Science");
    expect(r.shared).toEqual(expect.arrayContaining(["calculator", "black"]));
    expect(matchLabel(r.score)).toBe("Strong match");
  });
  it("is symmetric", () => expect(matchScore(found, lost).score).toBe(matchScore(lost, found).score));
  it("never matches two lost posts, the same poster, or resolved posts", () => {
    expect(matchScore(lost, { ...found, type: "lost" }).score).toBe(0);
    expect(matchScore(lost, { ...found, postedBy: 1 }).score).toBe(0);
    expect(matchScore(lost, { ...found, status: "resolved" }).score).toBe(0);
  });
  it("rejects items found long before they were lost", () => expect(matchScore(lost, { ...found, happenedOn: "2026-09-20" }).score).toBe(0));
  it("rejects different categories without strong word overlap", () =>
    expect(matchScore(lost, mk({ id: 3, type: "found", postedBy: 3, category: "Clothing", title: "Black hoodie", description: "size L" })).score).toBe(0));
  it("gives a lower score for a different place and a week gap", () => {
    const far = { ...found, location: "Sports Complex", happenedOn: "2026-10-12" };
    expect(matchScore(lost, far).score).toBeLessThan(matchScore(lost, found).score);
  });
});

describe("findMatches", () => {
  it("ranks candidates above the threshold best first", () => {
    const item = mk({ id: 10, type: "found", postedBy: 9, title: "Black calculator", description: "Casio calculator found in LT2", happenedOn: "2026-10-04" });
    const cands = [
      mk({ id: 11, title: "HP calculator", description: "Black HP calculator, grey cover", location: "Faculty of Engineering", happenedOn: "2026-09-29" }),
      mk({ id: 12, title: "Casio calculator", description: "Black Casio fx-991ES left in LT2", happenedOn: "2026-10-03" }),
      mk({ id: 13, category: "Keys", title: "Room keys", description: "Keys with red tag", happenedOn: "2026-10-03" }),
    ];
    const r = findMatches(item, cands);
    expect(r.map((m) => m.item.id)).toEqual([12, 11]);
    expect(r[0].score).toBeGreaterThan(r[1].score);
  });
});

/**
 * "Possible match" engine. Pure functions: give it an item and candidates, get back a ranked list
 * with the reasons, so the UI can explain why two posts might be the same thing.
 */
import { daysBetween } from "./today";

export type MatchItem = {
  id: number;
  type: "lost" | "found";
  title: string;
  description: string;
  category: string;
  location: string;
  happenedOn: string;
  status: "open" | "claimed" | "resolved";
  postedBy: number;
};

const STOP = new Set(
  "a an the and or of in on at to for with my i me is was it its this that from near by under inside around have has had lost found left please someone some any call if you your our we they them their my mine one two very small big new old color colour".split(" "),
);

/** Words that mean the same thing for matching purposes. */
const SYNONYMS: Record<string, string> = {
  iphone: "phone", android: "phone", samsung: "phone", tecno: "phone", infinix: "phone", itel: "phone", mobile: "phone", handset: "phone", cellphone: "phone",
  airpod: "earbud", airpods: "earbud", earpiece: "earbud", earphone: "earbud", earphones: "earbud", buds: "earbud", oraimo: "earbud",
  backpack: "bag", rucksack: "bag", schoolbag: "bag", handbag: "bag", purse: "bag", satchel: "bag",
  specs: "glass", spectacles: "glass", eyeglasses: "glass", sunglasses: "glass", shades: "glass", glasses: "glass",
  macbook: "laptop", notebook: "laptop", hp: "hp", lenovo: "laptop", dell: "laptop",
  casio: "calculator", fx991: "calculator", "fx-991es": "calculator",
  keychain: "key", keyholder: "key",
  powerbank: "power", charger: "charger", cable: "charger", adapter: "charger",
  id: "id", identity: "id", card: "card",
  flash: "flashdrive", flashdrive: "flashdrive", usb: "flashdrive", pendrive: "flashdrive",
  textbook: "book", textbooks: "book", novel: "book", bible: "bible",
  jacket: "jacket", hoodie: "jacket", sweater: "jacket",
  wristwatch: "watch", smartwatch: "watch",
  black: "black", blk: "black", grey: "gray",
};

export function normalise(word: string): string {
  let w = word.toLowerCase();
  if (SYNONYMS[w]) return SYNONYMS[w];
  if (w.length > 4 && w.endsWith("sses")) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith("ies")) w = `${w.slice(0, -3)}y`;
  else if (w.length > 4 && /(x|ch|sh)es$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);
  return SYNONYMS[w] ?? w;
}

export function tokenize(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9-]+/)) {
    const w = raw.replace(/^-+|-+$/g, "");
    if (w.length < 2 || STOP.has(w) || /^\d+$/.test(w)) continue;
    out.add(normalise(w));
  }
  return out;
}

/** Generic place words that do not mean two places are close. */
const PLACE_STOP = new Set(["main", "campus", "faculty", "hall", "building", "block", "centre", "center", "room", "town", "university", "gate", "park"]);

export function placeWords(location: string): Set<string> {
  return new Set([...tokenize(location)].filter((w) => !PLACE_STOP.has(w)));
}

export type Match<T extends MatchItem = MatchItem> = { item: T; score: number; shared: string[]; reasons: string[] };

/** Score how likely two posts describe the same object (0 to 100). Returns 0 when they cannot match. */
export function matchScore(a: MatchItem, b: MatchItem): { score: number; shared: string[]; reasons: string[] } {
  const none = { score: 0, shared: [], reasons: [] };
  if (a.id === b.id || a.type === b.type || a.postedBy === b.postedBy) return none;
  if (a.status === "resolved" || b.status === "resolved") return none;
  const lost = a.type === "lost" ? a : b;
  const found = a.type === "found" ? a : b;
  // Something cannot be found well before it was lost (allow one day for wrong dates).
  const gap = daysBetween(lost.happenedOn, found.happenedOn);
  if (gap < -1 || gap > 45) return none;

  const reasons: string[] = [];
  let score = 0;
  const sameCategory = a.category === b.category;
  if (sameCategory) {
    score += 35;
    reasons.push(`Same category: ${a.category}`);
  }

  const titleA = tokenize(a.title);
  const titleB = tokenize(b.title);
  const allA = new Set([...titleA, ...tokenize(a.description)]);
  const allB = new Set([...titleB, ...tokenize(b.description)]);
  const shared = [...allA].filter((w) => allB.has(w));
  const sharedTitle = [...titleA].filter((w) => titleB.has(w));
  const union = new Set([...allA, ...allB]).size || 1;
  score += Math.min(40, Math.round((shared.length / union) * 100) + sharedTitle.length * 8);
  if (shared.length) reasons.push(`Shared words: ${shared.slice(0, 5).join(", ")}`);

  const locA = placeWords(a.location);
  const locB = placeWords(b.location);
  if (a.location.trim().toLowerCase() === b.location.trim().toLowerCase()) {
    score += 15;
    reasons.push(`Same place: ${a.location}`);
  } else if ([...locA].some((w) => locB.has(w))) {
    score += 7;
    reasons.push("Nearby place");
  }

  if (gap <= 3) {
    score += 10;
    reasons.push(gap <= 0 ? "Found the same day it was lost" : `Found ${gap} day${gap === 1 ? "" : "s"} after it was lost`);
  } else if (gap <= 14) score += 5;

  if (!sameCategory && shared.length < 2) return none;
  return { score: Math.min(100, score), shared, reasons };
}

export const MATCH_THRESHOLD = 45;

/** Ranked possible matches for an item, best first. */
export function findMatches<T extends MatchItem>(item: MatchItem, candidates: T[], limit = 5): Match<T>[] {
  return candidates
    .map((c) => ({ item: c, ...matchScore(item, c) }))
    .filter((m) => m.score >= MATCH_THRESHOLD)
    .sort((x, y) => y.score - x.score || x.item.id - y.item.id)
    .slice(0, limit);
}

export function matchLabel(score: number): "Strong match" | "Likely match" | "Possible match" {
  if (score >= 80) return "Strong match";
  if (score >= 62) return "Likely match";
  return "Possible match";
}

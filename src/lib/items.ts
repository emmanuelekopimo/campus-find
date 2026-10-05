import { daysBetween } from "./today";

export type ItemState = { status: "open" | "claimed" | "resolved"; postedBy: number; type: "lost" | "found"; happenedOn: string };

/** Can this user send a claim (or "I found it" message) on the item? */
export function claimBlocker(item: ItemState, userId: number, alreadyClaimed: boolean): string | null {
  if (item.postedBy === userId) return "This is your own post";
  if (item.status === "resolved") return "This item has been returned to its owner";
  if (item.status === "claimed") return "The poster has already accepted a claim";
  if (alreadyClaimed) return "You have already sent a message about this item";
  return null;
}

export function canAcceptClaim(item: ItemState, userId: number, claimStatus: "pending" | "accepted" | "declined") {
  return item.postedBy === userId && item.status === "open" && claimStatus === "pending";
}

export function canResolve(item: ItemState, userId: number) {
  return item.postedBy === userId && item.status !== "resolved";
}

/** How long ago something happened, in campus days. */
export function agoLabel(day: string, today: string): string {
  const d = daysBetween(day, today);
  if (d <= 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  if (d < 14) return "1 week ago";
  if (d < 60) return `${Math.floor(d / 7)} weeks ago`;
  return `${Math.floor(d / 30)} months ago`;
}

/** Open posts older than 30 days are flagged so the poster can close or refresh them. */
export function isStale(item: ItemState, today: string): boolean {
  return item.status === "open" && daysBetween(item.happenedOn, today) > 30;
}

export function checkHappenedOn(day: string, today: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day))) return "Pick a valid date";
  if (daysBetween(day, today) < 0) return "The date cannot be in the future";
  if (daysBetween(day, today) > 180) return "Only items from the last 6 months can be posted";
  return undefined;
}

/** Contact link: WhatsApp for Nigerian mobile numbers, mailto otherwise. */
export function whatsappLink(phone: string, text: string): string | null {
  const digits = phone.replace(/\D/g, "");
  let intl = digits;
  if (digits.length === 11 && digits.startsWith("0")) intl = `234${digits.slice(1)}`;
  if (!/^234\d{10}$/.test(intl)) return null;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

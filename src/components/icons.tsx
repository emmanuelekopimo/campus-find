import { Backpack, BookOpen, Glasses, Headphones, IdCard, KeyRound, Package, Shirt, Smartphone, Wallet, type LucideIcon } from "lucide-react";
import type { Category } from "@/db/schema";

export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  Phones: Smartphone,
  Electronics: Headphones,
  Bags: Backpack,
  Wallets: Wallet,
  "IDs and Cards": IdCard,
  Keys: KeyRound,
  Books: BookOpen,
  Clothing: Shirt,
  Accessories: Glasses,
  Other: Package,
};

export function ItemImage({ src, category, size = 44 }: { src: string | null; category: Category; size?: number }) {
  if (src) return <img src={src} alt="" loading="lazy" />;
  const Icon = CATEGORY_ICON[category];
  return (
    <div className="placeholder" aria-label={`${category}, no photo`}>
      <Icon size={size} strokeWidth={1.4} />
    </div>
  );
}

export function TypeTag({ type }: { type: "lost" | "found" }) {
  return (
    <span className="tag" data-testid="type-tag">
      <i className={`dot dot-${type}`} /> {type}
    </span>
  );
}

import Link from "next/link";
import { MapPin, MessageCircle } from "lucide-react";
import type { FeedItem } from "@/lib/queries";
import { agoLabel, isStale } from "@/lib/items";
import { ItemImage, TypeTag } from "./icons";

export function StatusChip({ status, stale }: { status: "open" | "claimed" | "resolved"; stale?: boolean }) {
  if (status === "resolved") return <span className="chip-status resolved">Returned</span>;
  if (status === "claimed") return <span className="chip-status claimed">Claimed</span>;
  if (stale) return <span className="chip-status stale">Old post</span>;
  return null;
}

export function ItemCard({ item, today }: { item: FeedItem; today: string }) {
  return (
    <Link href={`/items/${item.id}`} className={`card ${item.status}`} data-testid="item-card">
      <div className="media">
        <ItemImage src={item.imageUrl} category={item.category} />
        <TypeTag type={item.type} />
        <StatusChip status={item.status} stale={isStale(item, today)} />
      </div>
      <div className="body">
        <h3>{item.title}</h3>
        <div className="meta"><MapPin size={14} /><span>{item.location}</span></div>
        <div className="foot">
          <span>{item.category} · {agoLabel(item.happenedOn, today)}</span>
          {item.claimCount > 0 && <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><MessageCircle size={13} /> {item.claimCount}</span>}
        </div>
      </div>
    </Link>
  );
}

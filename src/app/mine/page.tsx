import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { requireUser } from "@/lib/session";
import { myItems, pendingForUser } from "@/lib/queries";
import { agoLabel, isStale } from "@/lib/items";
import { campusDay, now } from "@/lib/today";
import { Shell } from "@/components/Shell";
import { ItemImage, TypeTag } from "@/components/icons";
import { StatusChip } from "@/components/ItemCard";

export const metadata: Metadata = { title: "My posts" };

export default async function MinePage() {
  const user = await requireUser();
  const rows = await myItems(db(), user.id);
  const today = campusDay(now());
  return (
    <Shell user={user} active="mine" pendingForMe={await pendingForUser(db(), user.id)}>
      <div className="wrap" style={{ maxWidth: 900 }}>
        <div className="page-head">
          <div><h1>My posts</h1><p className="muted" style={{ marginTop: 8 }}>Only you can see claims on your posts.</p></div>
          <Link href="/post" className="btn btn-white">Post an item</Link>
        </div>
        {rows.length ? (
          <div className="list">
            {rows.map(({ item, pending, total }) => (
              <Link href={`/items/${item.id}`} className="list-row" key={item.id} data-testid="my-item">
                <ItemImage src={item.imageUrl} category={item.category} size={22} />
                <div style={{ minWidth: 0 }}>
                  <b>{item.title}</b>
                  <span className="muted" style={{ fontSize: 13 }}>{item.location} · {agoLabel(item.happenedOn, today)}</span>
                </div>
                <div className="right">
                  <TypeTag type={item.type} />
                  <StatusChip status={item.status} stale={isStale(item, today)} />
                  {pending > 0 ? <span className="chip-status pending">{pending} new {pending === 1 ? "claim" : "claims"}</span> : <span className="mono dim" style={{ fontSize: 12 }}>{total} replies</span>}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">You have not posted anything yet.</div>
        )}
      </div>
    </Shell>
  );
}

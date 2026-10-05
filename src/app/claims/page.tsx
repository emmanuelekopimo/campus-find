import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { requireUser } from "@/lib/session";
import { myClaims, pendingForUser } from "@/lib/queries";
import { fmtStamp } from "@/lib/format";
import { Shell } from "@/components/Shell";
import { ItemImage, TypeTag } from "@/components/icons";

export const metadata: Metadata = { title: "My claims" };

export default async function ClaimsPage() {
  const user = await requireUser();
  const rows = await myClaims(db(), user.id);
  return (
    <Shell user={user} active="claims" pendingForMe={await pendingForUser(db(), user.id)}>
      <div className="wrap" style={{ maxWidth: 900 }}>
        <div className="page-head"><div><h1>My claims</h1><p className="muted" style={{ marginTop: 8 }}>Messages you sent about other people&apos;s posts.</p></div></div>
        {rows.length ? (
          <div className="list">
            {rows.map(({ claim, item, posterName, posterPhone }) => (
              <Link href={`/items/${item.id}`} className="list-row" key={claim.id} data-testid="my-claim-row">
                <ItemImage src={item.imageUrl} category={item.category} size={22} />
                <div style={{ minWidth: 0 }}>
                  <b>{item.title}</b>
                  <span className="muted" style={{ fontSize: 13 }}>
                    To {posterName} · {fmtStamp(claim.createdAt)}
                    {claim.status === "accepted" && posterPhone ? ` · call ${posterPhone}` : ""}
                  </span>
                </div>
                <div className="right"><TypeTag type={item.type} /><span className={`chip-status ${claim.status}`}>{claim.status}</span></div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">You have not claimed anything. When you spot your item, open it and send a claim.</div>
        )}
      </div>
    </Shell>
  );
}

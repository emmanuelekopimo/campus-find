import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, CircleCheck, Mail, MessageCircle, Phone, Sparkles, X } from "lucide-react";
import { db } from "@/db";
import { requireUser } from "@/lib/session";
import { getItem, matchesFor, pendingForUser } from "@/lib/queries";
import { agoLabel, claimBlocker, isStale, whatsappLink } from "@/lib/items";
import { matchLabel } from "@/lib/matching";
import { campusDay, now } from "@/lib/today";
import { fmtDay, fmtStamp } from "@/lib/format";
import { avatarUri } from "@/lib/avatar";
import { decideAction, resolveAction } from "@/app/actions/items";
import { Shell } from "@/components/Shell";
import { ItemImage, TypeTag } from "@/components/icons";
import { StatusChip } from "@/components/ItemCard";
import { ClaimForm } from "@/components/ClaimForm";
import { LiveRefresh } from "@/components/LiveRefresh";

export default async function ItemPage(props: PageProps<"/items/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const sp = await props.searchParams;
  const data = await getItem(db(), user.id, Number(id));
  if (!data) notFound();
  const { item, poster, isOwner, claims, myClaim, claimTotal } = data;
  const today = campusDay(now());
  const matches = item.status === "resolved" ? [] : await matchesFor(db(), item);
  const blocked = claimBlocker(item, user.id, !!myClaim);
  const wa = poster.phone ? whatsappLink(poster.phone, `Hi ${poster.name.split(" ")[0]}, I am contacting you about "${item.title}" on campusfind.`) : null;

  return (
    <Shell user={user} active={isOwner ? "mine" : "feed"} pendingForMe={await pendingForUser(db(), user.id)}>
      <LiveRefresh seconds={8} />
      <div className="wrap">
        <div style={{ paddingTop: 24 }}><Link href="/" className="btn btn-sm btn-ghost"><ArrowLeft size={15} /> Feed</Link></div>
        {sp.posted && (
          <div className="notice ok" style={{ marginTop: 16 }} data-testid="posted-notice">
            <CircleCheck size={18} /> Posted. {matches.length ? `We found ${matches.length} possible ${matches.length === 1 ? "match" : "matches"} below.` : "No matches yet. We will show them here as new posts come in."}
          </div>
        )}
        <div className="item-layout">
          <div>
            <div className="photo">
              <ItemImage src={item.imageUrl} category={item.category} size={80} />
              <TypeTag type={item.type} />
            </div>
          </div>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="mono dim" style={{ fontSize: 12 }}>#{String(item.id).padStart(4, "0")}</span>
              <StatusChip status={item.status} stale={isStale(item, today)} />
            </div>
            <h1 className="item-title" data-testid="item-title">{item.title}</h1>
            <div className="kv">
              <div><span>{item.type === "lost" ? "Lost on" : "Found on"}</span><b>{fmtDay(item.happenedOn)}</b><span style={{ marginTop: 2, textTransform: "none", letterSpacing: 0 }}>{agoLabel(item.happenedOn, today)}</span></div>
              <div><span>Where</span><b>{item.location}</b></div>
              <div><span>Category</span><b>{item.category}</b></div>
            </div>
            <p className="desc">{item.description}</p>

            <div style={{ marginTop: 22 }}>
              <div className="box">
                <h3>Posted by</h3>
                <div className="poster">
                  <img src={avatarUri(poster.email)} alt="" />
                  <div><b>{isOwner ? "You" : poster.name}</b><div className="muted" style={{ fontSize: 13 }}>{poster.department} · {fmtStamp(item.createdAt)}</div></div>
                </div>
                {!isOwner && (
                  <div className="contact-row" data-testid="contact">
                    <a className="btn btn-sm" href={`mailto:${poster.email}?subject=${encodeURIComponent(`campusfind: ${item.title}`)}`}><Mail size={15} /> Email</a>
                    {poster.phone && <a className="btn btn-sm" href={`tel:${poster.phone}`}><Phone size={15} /> {poster.phone}</a>}
                    {wa && <a className="btn btn-sm" href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} /> WhatsApp</a>}
                  </div>
                )}
              </div>

              {!isOwner && (
                <div className="box">
                  <h3>{item.type === "found" ? "Is this yours?" : "Have you found it?"}</h3>
                  {myClaim ? (
                    <div className={`notice ${myClaim.status === "accepted" ? "ok" : myClaim.status === "declined" ? "err" : ""}`} data-testid="my-claim">
                      {myClaim.status === "accepted" ? "The poster accepted your claim. Contact them to arrange the handover." : myClaim.status === "declined" ? "The poster did not accept your claim." : "You sent a message about this item. Waiting for the poster to respond."}
                    </div>
                  ) : blocked ? (
                    <div className="notice warn">{blocked}</div>
                  ) : (
                    <ClaimForm itemId={item.id} type={item.type} />
                  )}
                </div>
              )}

              {isOwner && (
                <div className="box" data-testid="owner-panel">
                  <h3>Messages on your post <span className="badge">{claims.length}</span></h3>
                  {claims.length === 0 && <p className="muted">No one has responded yet.</p>}
                  {claims.map((c) => (
                    <div className="claim" key={c.id} data-testid="claim">
                      <div className="claim-head">
                        <img src={avatarUri(c.claimantEmail)} alt="" />
                        <div style={{ flex: 1, minWidth: 0 }}><b>{c.claimantName}</b><div className="muted mono" style={{ fontSize: 11.5 }}>{fmtStamp(c.createdAt)}{c.contact ? ` · ${c.contact}` : ""}</div></div>
                        <span className={`chip-status ${c.status}`}>{c.status}</span>
                      </div>
                      <p>{c.message}</p>
                      {c.status === "pending" && item.status === "open" && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <form action={decideAction}><input type="hidden" name="claimId" value={c.id} /><input type="hidden" name="decision" value="accept" /><button className="btn btn-white btn-sm" data-testid="accept-claim"><Check size={15} /> Accept</button></form>
                          <form action={decideAction}><input type="hidden" name="claimId" value={c.id} /><input type="hidden" name="decision" value="decline" /><button className="btn btn-sm" data-testid="decline-claim"><X size={15} /> Decline</button></form>
                        </div>
                      )}
                    </div>
                  ))}
                  {item.status !== "resolved" && (
                    <form action={resolveAction} style={{ marginTop: 14 }}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <button className="btn btn-block" data-testid="resolve"><CircleCheck size={16} /> {item.type === "found" ? "Mark as returned to owner" : "Mark as recovered"}</button>
                    </form>
                  )}
                  {item.status === "resolved" && <div className="notice ok" data-testid="resolved-notice"><CircleCheck size={16} /> Resolved {item.resolvedAt ? fmtStamp(item.resolvedAt) : ""}. This post is closed.</div>}
                </div>
              )}
              {!isOwner && claimTotal > 0 && <p className="muted mono" style={{ fontSize: 12, marginTop: 10 }}>{claimTotal} {claimTotal === 1 ? "person has" : "people have"} responded to this post.</p>}
            </div>
          </div>
        </div>

        {item.status !== "resolved" && (
          <section className="matches" data-testid="matches">
            <div className="matches-head">
              <span className="spark"><Sparkles size={18} /></span>
              <div>
                <h2>Possible matches</h2>
                <p className="muted" style={{ fontSize: 14 }}>{item.type === "found" ? "Lost" : "Found"} posts with the same category and similar words, scored by our matcher.</p>
              </div>
            </div>
            {matches.length === 0 ? (
              <div className="empty">No likely matches yet. This page checks again when new items are posted.</div>
            ) : (
              matches.map((m) => (
                <Link href={`/items/${m.item.id}`} className="match" key={m.item.id} data-testid="match">
                  <ItemImage src={m.item.imageUrl} category={m.item.category} size={30} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}><TypeTag type={m.item.type} /><span className="muted" style={{ fontSize: 12.5 }}>{m.item.location} · {agoLabel(m.item.happenedOn, today)}</span></div>
                    <h3 style={{ marginTop: 6 }}>{m.item.title}</h3>
                    <div className="reasons">{m.reasons.map((r) => <span key={r}>{r}</span>)}</div>
                  </div>
                  <div className="score">
                    <span className="mono dim" style={{ fontSize: 11 }}>{matchLabel(m.score).toUpperCase()}</span>
                    <b data-testid="match-score">{m.score}%</b>
                    <div className="bar"><i style={{ width: `${m.score}%` }} /></div>
                  </div>
                </Link>
              ))
            )}
          </section>
        )}
      </div>
    </Shell>
  );
}

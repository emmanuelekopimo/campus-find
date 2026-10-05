import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/db";
import { CATEGORIES, type Category } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { feedStats, listItems, pendingForUser } from "@/lib/queries";
import { campusDay, now } from "@/lib/today";
import { Shell } from "@/components/Shell";
import { ItemCard } from "@/components/ItemCard";
import { LiveRefresh } from "@/components/LiveRefresh";

export default async function Feed(props: PageProps<"/">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const type = sp.type === "lost" || sp.type === "found" ? sp.type : "";
  const category = typeof sp.category === "string" && (CATEGORIES as readonly string[]).includes(sp.category) ? (sp.category as Category) : "";
  const status = sp.status === "resolved" ? "resolved" : "open";
  const today = campusDay(now());
  const [list, stats, pending] = await Promise.all([listItems(db(), { q, type, category, status }), feedStats(db(), today), pendingForUser(db(), user.id)]);
  const href = (o: Record<string, string>) => {
    const p = new URLSearchParams();
    const merged = { q, type, category, status: status === "open" ? "" : status, ...o };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/?${s}` : "/";
  };
  return (
    <Shell user={user} active="feed" pendingForMe={pending}>
      <LiveRefresh seconds={8} />
      <div className="wrap">
        <section className="hero">
          <img className="mark" src="/logo.svg" alt="" />
          <h1>What did you lose or find?</h1>
          <p>Search every lost and found post on campus. New posts are checked for matches automatically.</p>
          <form className="prompt" action="/" role="search">
            <input name="q" defaultValue={q} placeholder="Try: black calculator, blue Samsung, keys with red tag" aria-label="Search items" />
            {category && <input type="hidden" name="category" value={category} />}
            {status === "resolved" && <input type="hidden" name="status" value="resolved" />}
            <div className="prompt-row">
              <div className="seg" role="radiogroup" aria-label="Type">
                {[["", "All"], ["lost", "Lost"], ["found", "Found"]].map(([v, l]) => (
                  <label key={l}>
                    <input type="radio" name="type" value={v} defaultChecked={type === v} />
                    {v && <i className={`dot dot-${v}`} />} {l}
                  </label>
                ))}
              </div>
              <span className="grow" />
              <Link href="/post" className="btn btn-sm">Post an item</Link>
              <button className="btn btn-white btn-sm" type="submit" aria-label="Search"><Search size={16} /> Search</button>
            </div>
          </form>
          <div className="stats">
            <div><b data-testid="stat-lost">{stats.lost}</b>open lost</div>
            <div><b>{stats.found}</b>open found</div>
            <div><b>{stats.returned}</b>returned in 30 days</div>
          </div>
        </section>
        <nav className="cats" aria-label="Categories">
          <Link className="cat" href={href({ category: "" })} aria-current={!category}>Everything</Link>
          {CATEGORIES.map((c) => (
            <Link className="cat" key={c} href={href({ category: c })} aria-current={category === c}>{c}</Link>
          ))}
        </nav>
        <div className="feed-head">
          <h2>{q ? `Results for "${q}"` : status === "resolved" ? "Returned to owners" : type === "lost" ? "Lost items" : type === "found" ? "Found items" : "Latest posts"}</h2>
          <div className="seg">
            <Link href={href({ status: "" })} aria-current={status === "open"}>Active</Link>
            <Link href={href({ status: "resolved" })} aria-current={status === "resolved"}>Returned</Link>
          </div>
        </div>
        {list.length ? (
          <div className="grid">{list.map((i) => <ItemCard key={i.id} item={i} today={today} />)}</div>
        ) : (
          <div className="empty"><p style={{ fontSize: 18, color: "var(--text)" }}>Nothing matches yet</p><p style={{ marginTop: 6 }}>Try fewer words, or post the item so others can find it.</p></div>
        )}
      </div>
    </Shell>
  );
}

import type { Metadata } from "next";
import { db } from "@/db";
import { requireUser } from "@/lib/session";
import { pendingForUser } from "@/lib/queries";
import { campusDay, now } from "@/lib/today";
import { Shell } from "@/components/Shell";
import { PostForm } from "@/components/PostForm";

export const metadata: Metadata = { title: "Post an item" };

export default async function PostPage() {
  const user = await requireUser();
  return (
    <Shell user={user} active="post" pendingForMe={await pendingForUser(db(), user.id)}>
      <div className="wrap" style={{ maxWidth: 760 }}>
        <div className="page-head">
          <div>
            <p className="mono dim" style={{ fontSize: 12, letterSpacing: "0.1em" }}>NEW POST</p>
            <h1>Post a lost or found item</h1>
            <p className="muted" style={{ marginTop: 8 }}>After you post, campusfind lists any posts that look like the same item.</p>
          </div>
        </div>
        <PostForm today={campusDay(now())} />
      </div>
    </Shell>
  );
}

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { uploads } from "@/db/schema";

export async function GET(_: Request, ctx: RouteContext<"/api/images/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const [img] = await db().select().from(uploads).where(eq(uploads.id, id));
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(img.data), {
    headers: { "Content-Type": img.mime, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}

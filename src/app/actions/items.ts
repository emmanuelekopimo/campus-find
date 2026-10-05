"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { uploads } from "@/db/schema";
import { checkHappenedOn } from "@/lib/items";
import { createItem, decideClaim, markResolved, submitClaim } from "@/lib/queries";
import { getSession, requireUser } from "@/lib/session";
import { campusDay, now } from "@/lib/today";
import { checkImageFile, claimSchema, fieldErrors, itemSchema, type FieldErrors } from "@/lib/validation";

export type FormState = { errors?: FieldErrors; values?: Record<string, string>; ok?: boolean };

export async function postItemAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = Object.fromEntries(["type", "title", "description", "category", "location", "happenedOn"].map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = itemSchema.safeParse(raw);
  const errors: FieldErrors = parsed.success ? {} : fieldErrors(parsed.error);
  if (!errors.happenedOn) {
    const e = checkHappenedOn(raw.happenedOn, campusDay(now()));
    if (e) errors.happenedOn = e;
  }
  const photo = formData.get("photo") as File | null;
  const photoErr = checkImageFile(photo);
  if (photoErr) errors.photo = photoErr;
  if (!parsed.success || Object.keys(errors).length) return { errors, values: raw };

  let imageUrl: string | null = null;
  if (photo && photo.size > 0) {
    const [u] = await db().insert(uploads).values({ mime: photo.type, data: Buffer.from(await photo.arrayBuffer()), uploadedBy: user.id }).returning({ id: uploads.id });
    imageUrl = `/api/images/${u.id}`;
  }
  const id = await createItem(db(), user.id, { ...parsed.data, imageUrl });
  revalidatePath("/", "layout");
  redirect(`/items/${id}?posted=1`);
}

export async function claimAction(_: FormState, formData: FormData): Promise<FormState> {
  const s = await getSession();
  if (!s) return { errors: { form: "Please sign in again" } };
  const raw = { message: String(formData.get("message") ?? ""), contact: String(formData.get("contact") ?? "") };
  const parsed = claimSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: raw };
  const r = await submitClaim(db(), s.userId, Number(formData.get("itemId")), parsed.data.message, parsed.data.contact || null);
  if (!r.ok) return { errors: { form: r.error }, values: raw };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function decideAction(formData: FormData) {
  const user = await requireUser();
  const decision = formData.get("decision") === "accept" ? "accept" : "decline";
  await decideClaim(db(), user.id, Number(formData.get("claimId")), decision);
  revalidatePath("/", "layout");
}

export async function resolveAction(formData: FormData) {
  const user = await requireUser();
  await markResolved(db(), user.id, Number(formData.get("itemId")), now());
  revalidatePath("/", "layout");
}

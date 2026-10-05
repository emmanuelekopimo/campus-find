import { z } from "zod";
import { CATEGORIES } from "@/db/schema";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const itemSchema = z.object({
  type: z.enum(["lost", "found"], { error: "Choose lost or found" }),
  title: z.string().trim().min(4, "Give it a short title, at least 4 characters").max(120, "Title is too long"),
  description: z.string().trim().min(15, "Add a few details, at least 15 characters").max(1500, "Description is too long"),
  category: z.enum(CATEGORIES, { error: "Pick a category" }),
  location: z.string().trim().min(3, "Where was it lost or found?").max(140, "Location is too long"),
  happenedOn: z.string().min(1, "Pick a date"),
});

export const claimSchema = z.object({
  message: z.string().trim().min(10, "Write at least 10 characters so the poster can check it is yours").max(800, "Message is too long"),
  contact: z
    .string()
    .trim()
    .max(40, "Contact is too long")
    .optional()
    .refine((v) => !v || /^[0-9+ ()-]{7,20}$/.test(v), "Enter a phone number like 0803 123 4567"),
});

export type FieldErrors = Record<string, string | undefined>;

export function fieldErrors(err: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err.issues) {
    const k = String(issue.path[0] ?? "form");
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export function checkImageFile(f: File | null): string | undefined {
  if (!f || f.size === 0) return undefined;
  if (!ALLOWED_IMAGE_TYPES.includes(f.type)) return "Upload a JPG, PNG or WebP photo";
  if (f.size > MAX_IMAGE_BYTES) return "Photo must be 4 MB or smaller";
  return undefined;
}

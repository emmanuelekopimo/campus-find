import { createAvatar } from "@dicebear/core";
import { loreleiNeutral } from "@dicebear/collection";

const cache = new Map<string, string>();

/** Locally generated monochrome avatar (no network). */
export function avatarUri(seed: string): string {
  let v = cache.get(seed);
  if (!v) {
    v = createAvatar(loreleiNeutral, { seed, backgroundColor: ["d9d9d9", "c4c4c4", "e6e6e6"], radius: 50 }).toDataUri();
    cache.set(seed, v);
  }
  return v;
}

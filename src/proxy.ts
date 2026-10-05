import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

/** Optimistic check: no valid session cookie means the login page. Pages verify again on the server. */
export async function proxy(req: NextRequest) {
  if (!(await verifySession(req.cookies.get(SESSION_COOKIE)?.value))) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api/health|api/images|_next|images|demo|logo.svg|icon.svg|favicon.ico).*)"],
};

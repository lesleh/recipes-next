import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { checkWriteAccess, WRITE_PASSWORD_MISSING } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const access = checkWriteAccess(request.headers.get("authorization"));

  if (access === "granted") return NextResponse.next();

  // A prompt cannot help when there is no password to type, so say what is
  // wrong instead of asking for a password no one can get right.
  if (access === "unconfigured") {
    return new NextResponse(`${WRITE_PASSWORD_MISSING}\n`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  return new NextResponse("A password is needed to change a recipe.\n", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Recipes", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

// Only the two write pages. The delete action posts to the recipe page, which
// has to stay readable, so that check lives in the action itself.
export const config = {
  matcher: ["/recipes/new", "/recipes/:slug/edit"],
};

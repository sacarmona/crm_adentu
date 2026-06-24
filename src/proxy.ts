import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = [
  "/dashboard",
  "/companies",
  "/contacts",
  "/opportunities",
  "/pipeline",
  "/interactions",
  "/tasks",
  "/market",
  "/intelligence",
  "/playbooks",
  "/import",
  "/settings",
];

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const isProtected = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  let token = null;
  let tokenError: string | null = null;
  try {
    token = await getToken({ req: request, secret });
  } catch (err) {
    tokenError = err instanceof Error ? err.message : String(err);
  }

  if (searchParams.get("__authdebug") === "1") {
    return NextResponse.json({
      hasSecret: Boolean(secret),
      secretLength: secret?.length ?? 0,
      hasCookieHeader: Boolean(request.headers.get("cookie")),
      cookieNames: request.cookies.getAll().map((c) => c.name),
      tokenFound: Boolean(token),
      tokenError,
    });
  }

  if (token) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/companies/:path*",
    "/contacts/:path*",
    "/opportunities/:path*",
    "/pipeline/:path*",
    "/interactions/:path*",
    "/tasks/:path*",
    "/market/:path*",
    "/intelligence/:path*",
    "/playbooks/:path*",
    "/import/:path*",
    "/settings/:path*",
  ],
};


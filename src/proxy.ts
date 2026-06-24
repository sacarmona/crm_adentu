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
  const { pathname } = request.nextUrl;
  const isProtected = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: request.nextUrl.protocol === "https:",
  });

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


import { NextRequest, NextResponse } from "next/server";

const backendOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

function buildTargetUrl(pathname: string, search: string): string {
  return `${backendOrigin}${pathname}${search}`;
}

function isGuestApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/v1/guest/");
}

export async function proxyToBackend(request: NextRequest, pathname: string): Promise<NextResponse> {
  const targetUrl = buildTargetUrl(pathname, request.nextUrl.search);
  const headers = new Headers(request.headers);
  const backendUrl = new URL(backendOrigin);
  const forwardedCookies = request.cookies
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
  const isGuestRequest = isGuestApiPath(pathname);

  headers.set("host", backendUrl.host);
  headers.delete("content-length");
  if (isGuestRequest) {
    headers.delete("cookie");
    headers.delete("origin");
    headers.delete("referer");
    headers.delete("x-xsrf-token");
  } else if (forwardedCookies.length > 0) {
    headers.set("cookie", forwardedCookies);
  }

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
    redirect: "manual",
    cache: "no-store",
  });

  const nextResponse = new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
  });

  response.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();

    if (lowerKey === "content-encoding" || lowerKey === "transfer-encoding" || lowerKey === "set-cookie") {
      return;
    }

    nextResponse.headers.append(key, value);
  });

  const setCookieHeaders =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : response.headers.get("set-cookie")
        ? [response.headers.get("set-cookie") as string]
        : [];

  for (const setCookie of setCookieHeaders) {
    nextResponse.headers.append("set-cookie", setCookie);
  }

  return nextResponse;
}

import { NextResponse } from "next/server";
import { buildClearSessionCookie } from "@/lib/auth";

export async function POST() {
  const cookie = buildClearSessionCookie();
  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", cookie);
  return response;
}

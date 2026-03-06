import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authenticated = verifyAdminSession(request);
  return NextResponse.json({ authenticated });
}

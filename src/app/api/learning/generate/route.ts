import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { generateWeeklyContent } from "@/lib/learning/generate";

function isValidSecret(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

async function handleGenerate(request: NextRequest) {
  try {
    const cronSecret = process.env.LEARNING_CRON_SECRET;
    if (!cronSecret) {
      console.error("LEARNING_CRON_SECRET is not configured");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization");
    const cronHeader = request.headers.get("x-cron-secret");
    const providedSecret = authHeader?.replace("Bearer ", "") || cronHeader || "";

    if (!providedSecret || !isValidSecret(providedSecret, cronSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const summary = await generateWeeklyContent(new Date());

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error generating weekly content:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Generation failed", message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleGenerate(request);
}

export async function POST(request: NextRequest) {
  return handleGenerate(request);
}

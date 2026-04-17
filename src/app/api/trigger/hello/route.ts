import { tasks } from "@trigger.dev/sdk/v3";
import { NextResponse } from "next/server";
import type { hello } from "@/trigger/hello";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const handle = await tasks.trigger<typeof hello>("hello", { name: body.name ?? "world" });
  return NextResponse.json({ runId: handle.id, publicAccessToken: handle.publicAccessToken });
}

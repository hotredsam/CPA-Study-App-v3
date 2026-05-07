import { NextResponse } from "next/server";
import { respond } from "@/lib/api-error";
import { readDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json(await readDashboardData());
  } catch (err) {
    return respond(err);
  }
}

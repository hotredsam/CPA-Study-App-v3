import { NextResponse } from "next/server";
import { respond } from "@/lib/api-error";
import { readStudyData } from "@/lib/study-data";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json(await readStudyData());
  } catch (err) {
    return respond(err);
  }
}

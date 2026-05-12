import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { respond } from "@/lib/api-error";
import { preservedLibraryLabels, resetStudyProgressPreservingLibrary } from "@/lib/study-reset";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/admin/wipe
 * Deletes study progress/activity and local AI bookkeeping while preserving
 * the indexed textbook library, generated cards, operational settings, model
 * config, and encrypted OpenRouter key material. R2 blobs are intentionally
 * not deleted here.
 */
export async function DELETE(): Promise<NextResponse> {
  try {
    if (process.env.NODE_ENV === "production" && process.env["ENABLE_ADMIN_WIPE"] !== "true") {
      return NextResponse.json(
        {
          error: {
            code: "DISABLED_IN_PRODUCTION",
            message: "Admin wipe is disabled in production unless ENABLE_ADMIN_WIPE=true.",
          },
        },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    const counts = await resetStudyProgressPreservingLibrary(prisma);

    return NextResponse.json({
      ok: true,
      counts,
      preserved: preservedLibraryLabels,
      note: "Study activity was reset; indexed textbook content and R2 objects were left in place.",
    });
  } catch (err) {
    return respond(err);
  }
}

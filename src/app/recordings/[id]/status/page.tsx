import { notFound } from "next/navigation";
import { auth } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import StatusClient from "./StatusClient";

export const dynamic = "force-dynamic";

export default async function StatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recording = await prisma.recording.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { startSec: "asc" } },
    },
  });
  if (!recording) notFound();

  let publicAccessToken: string | null = null;
  if (recording.triggerRunId && process.env.TRIGGER_SECRET_KEY) {
    try {
      publicAccessToken = await auth.createPublicToken({
        scopes: { read: { runs: [recording.triggerRunId] } },
      });
    } catch {
      publicAccessToken = null;
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold mb-2">Processing</h1>
      <p className="text-sm text-slate-500 mb-6">
        Recording <code>{recording.id}</code> — status{" "}
        <span className="font-mono">{recording.status}</span>
      </p>
      <StatusClient
        recordingId={recording.id}
        runId={recording.triggerRunId}
        publicAccessToken={publicAccessToken}
        questions={recording.questions.map((q) => ({
          id: q.id,
          status: q.status,
          startSec: q.startSec,
          endSec: q.endSec,
        }))}
      />
    </main>
  );
}

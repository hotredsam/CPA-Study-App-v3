import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { presignDownload } from "@/lib/r2";
import ReviewClient from "./ReviewClient";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ questionId: string }>;
}) {
  const { questionId } = await params;
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { feedback: true, recording: true },
  });
  if (!question) notFound();

  const siblings = await prisma.question.findMany({
    where: { recordingId: question.recordingId },
    orderBy: { startSec: "asc" },
    select: { id: true },
  });
  const pos = siblings.findIndex((s) => s.id === question.id);
  const prev = pos > 0 ? siblings[pos - 1]?.id : null;
  const next = pos >= 0 && pos < siblings.length - 1 ? siblings[pos + 1]?.id : null;

  let clipUrl: string | null = null;
  if (question.clipR2Key) {
    try {
      clipUrl = await presignDownload(question.clipR2Key, 3600);
    } catch {
      clipUrl = null;
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between text-sm text-slate-500">
        <Link href={`/recordings/${question.recordingId}/status`} className="hover:underline">
          ← Session status
        </Link>
        <span>
          Question {pos + 1} of {siblings.length}
        </span>
      </div>
      <ReviewClient
        question={{
          id: question.id,
          status: question.status,
          section: question.section,
          transcript: question.transcript,
          extracted: question.extracted,
          noAudio: question.noAudio,
          clipUrl,
        }}
        feedback={question.feedback}
        prevId={prev ?? null}
        nextId={next ?? null}
      />
    </main>
  );
}

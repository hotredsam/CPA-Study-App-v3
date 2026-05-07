import Link from "next/link";
import { readStudyChunkData, type ChunkData } from "@/lib/study-data";
import { StudyReaderClient } from "./StudyReaderClient";

interface Props {
  params: Promise<{ textbookId: string; chunkId: string }>;
}

async function fetchChunkData(
  textbookId: string,
  chunkId: string,
): Promise<ChunkData | null> {
  try {
    return await readStudyChunkData(textbookId, chunkId);
  } catch {
    return null;
  }
}

export default async function StudyChunkPage({ params }: Props) {
  const { textbookId, chunkId } = await params;
  const data = await fetchChunkData(textbookId, chunkId);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-[color:var(--ink-faint)]">Chunk not found.</p>
        <Link
          href="/study"
          className="text-sm text-[color:var(--accent)] underline underline-offset-2 hover:brightness-110"
        >
          Back to Study
        </Link>
      </div>
    );
  }

  return (
    <StudyReaderClient
      textbook={data.textbook}
      chunk={data.chunk}
      topic={data.topic}
      practiceCards={data.practiceCards}
      prevChunkIdx={data.prevChunkIdx}
      nextChunkIdx={data.nextChunkIdx}
    />
  );
}

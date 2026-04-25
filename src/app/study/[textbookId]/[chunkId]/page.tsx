import Link from "next/link";
import { StudyReaderClient } from "./StudyReaderClient";

interface Props {
  params: Promise<{ textbookId: string; chunkId: string }>;
}

type Textbook = {
  id: string;
  title: string;
  sections: string[];
  chunkCount: number;
};

type Chunk = {
  id: string;
  order: number;
  title: string | null;
  chapterRef: string | null;
  content: string;
  htmlContent: string | null;
  topicId: string | null;
  fasbCitation: string | null;
};

type Topic = {
  id: string;
  name: string;
  section: string;
  mastery: number;
} | null;

type ChunkData = {
  textbook: Textbook;
  chunk: Chunk;
  topic: Topic;
  prevChunkIdx: number | null;
  nextChunkIdx: number | null;
};

async function fetchChunkData(
  textbookId: string,
  chunkId: string,
): Promise<ChunkData | null> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const res = await fetch(
      `${baseUrl}/api/study/${encodeURIComponent(textbookId)}/${encodeURIComponent(chunkId)}`,
      { cache: "no-store" },
    );

    if (!res.ok) return null;
    return res.json() as Promise<ChunkData>;
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
      prevChunkIdx={data.prevChunkIdx}
      nextChunkIdx={data.nextChunkIdx}
    />
  );
}

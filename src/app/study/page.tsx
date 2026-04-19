import { EyebrowHeading } from "@/components/ui/EyebrowHeading";
import { StudyHomeClient } from "./StudyHomeClient";

export const metadata = { title: "Study — CPA Study Servant" };

type RecentTextbook = {
  id: string;
  title: string;
  lastChunkIdx: number;
  totalChunks: number;
} | null;

type TextbookItem = {
  id: string;
  title: string;
  sections: string[];
  chunkCount: number;
  indexStatus: string;
};

type StudyData = {
  recentTextbook: RecentTextbook;
  textbooks: TextbookItem[];
  cardsDue: number;
};

async function fetchStudyData(): Promise<StudyData> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const res = await fetch(`${baseUrl}/api/study`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return { recentTextbook: null, textbooks: [], cardsDue: 0 };
    }

    return res.json() as Promise<StudyData>;
  } catch {
    return { recentTextbook: null, textbooks: [], cardsDue: 0 };
  }
}

export default async function StudyPage() {
  const data = await fetchStudyData();

  return (
    <div>
      <EyebrowHeading eyebrow="Study" title="Textbook Study" />
      <StudyHomeClient
        recentTextbook={data.recentTextbook}
        textbooks={data.textbooks}
        cardsDue={data.cardsDue}
      />
    </div>
  );
}

import { EyebrowHeading } from "@/components/ui/EyebrowHeading";
import { EMPTY_STUDY_DATA, readStudyData, type StudyData } from "@/lib/study-data";
import { StudyHomeClient } from "./StudyHomeClient";

export const metadata = { title: "Study — CPA Study Servant" };

export const dynamic = "force-dynamic";

async function fetchStudyData(): Promise<StudyData> {
  try {
    return await readStudyData();
  } catch {
    return EMPTY_STUDY_DATA;
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

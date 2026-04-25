import { EyebrowHeading } from "@/components/ui/EyebrowHeading";
import { RecordClient } from "./RecordClient";

export const metadata = { title: "Record - CPA Study Servant" };

export default function RecordPage() {
  return (
    <div>
      <EyebrowHeading
        eyebrow="NEW RECORDING"
        title="Preflight"
        sub="Capture screen and mic. Claude will segment the video into questions, transcribe your reasoning, and grade each one."
      />
      <RecordClient />
    </div>
  );
}

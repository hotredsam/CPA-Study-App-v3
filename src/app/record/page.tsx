import { EyebrowHeading } from "@/components/ui/EyebrowHeading";
import { RecordClient } from "./RecordClient";

export const metadata = { title: "Record — CPA Study Servant" };

export default function RecordPage() {
  return (
    <div>
      <EyebrowHeading
        eyebrow="Record"
        title="Record a Session"
        sub="Capture your screen and microphone while working through practice questions. The pipeline grades your performance automatically."
      />
      <RecordClient />
    </div>
  );
}

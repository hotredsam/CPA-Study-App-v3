import { EyebrowHeading } from "@/components/ui/EyebrowHeading";
import { RecordClient } from "./RecordClient";

export const metadata = { title: "Record - CPA Study Servant" };

export default function RecordPage() {
  return (
    <div>
      <EyebrowHeading
        eyebrow="NEW RECORDING"
        title="Preflight"
        sub="Capture screen and mic. AI will segment the video into questions, transcribe your reasoning, and grade each one."
      />
      <a
        href="#screen-recording-upload"
        className="mb-4 flex min-h-11 items-center justify-center rounded-[3px] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-sm font-medium text-[color:var(--ink)] hover:border-[color:var(--border-hi)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)] lg:hidden"
      >
        Upload iPhone screen recording
      </a>
      <RecordClient />
    </div>
  );
}

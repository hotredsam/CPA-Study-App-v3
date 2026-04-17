import RecordClient from "./RecordClient";

export default function RecordPage() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold mb-2">Record a session</h1>
      <p className="text-sm text-slate-500 mb-6">
        Pick a mic + a screen source, hit start, and run through your Becker practice questions.
        When you stop, the recording uploads to R2 and the pipeline kicks off.
      </p>
      <RecordClient />
    </main>
  );
}

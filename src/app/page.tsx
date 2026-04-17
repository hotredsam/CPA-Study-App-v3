export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-8 px-6 py-12">
      <h1 className="text-4xl font-semibold tracking-tight text-brand-500">
        CPA Study Servant
      </h1>
      <p className="max-w-xl text-center text-lg text-neutral-300">
        Record a Becker practice session. Get a graded rundown of both your accounting
        knowledge and your spoken reasoning.
      </p>
      <div className="flex gap-3">
        <a
          href="/record"
          className="rounded-md bg-brand-500 px-4 py-2 font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-neutral-950"
        >
          Start recording
        </a>
        <a
          href="/review"
          className="rounded-md border border-neutral-700 px-4 py-2 font-medium text-neutral-200 hover:border-neutral-500"
        >
          Review past sessions
        </a>
      </div>
      <p className="text-xs text-neutral-500">Phase 1 MVP scaffold — wire-up in progress.</p>
    </main>
  );
}

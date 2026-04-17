---
name: realtime-ui
description: Frontend patterns for useRealtimeRun — progress bars, per-question sub-progress, error states, keyboard navigation. Use for anything under src/app or src/components that shows pipeline status.
---

# Realtime UI

Trigger.dev's `@trigger.dev/react-hooks` is the only progress transport. No SSE. No polling. No WebSockets we manage.

## Minting the public-access token

Server (App Router route handler):

```ts
// src/app/api/runs/[runId]/token/route.ts
import { auth } from "@trigger.dev/sdk/v3";

export async function GET(_: Request, { params }: { params: { runId: string } }) {
  const token = await auth.createPublicToken({
    scopes: { read: { runs: [params.runId] } },
    expirationTime: "1h",
  });
  return Response.json({ token });
}
```

Client fetches once on mount, stores for the hook.

## Binding progress

```tsx
"use client";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { StageProgress } from "@/lib/schemas/stageProgress";

export function Pipeline({ runId, token }: { runId: string; token: string }) {
  const { run, error } = useRealtimeRun(runId, { accessToken: token });

  if (error) return <FailedState error={error.message} />;
  if (!run) return <LoadingState />;

  const progress = StageProgress.safeParse(run.metadata?.stageProgress);
  const stage = progress.success ? progress.data : null;

  return (
    <section aria-label="Recording pipeline status">
      <StatusHeader status={run.status} />
      {stage && <StageBar stage={stage} />}
      {run.status === "FAILED" && <FailedState error={run.error?.message ?? "Unknown error"} />}
    </section>
  );
}
```

## Per-question sub-progress

`stage.sub = { current: 3, total: 7, itemLabel: "Transcribing question 3/7" }` — render a second bar under the main one.

```tsx
<progress value={stage.pct} max={100} aria-valuetext={`${stage.pct}%`} />
{stage.sub && (
  <progress
    className="mt-1 h-1"
    value={stage.sub.current}
    max={stage.sub.total}
    aria-label={stage.sub.itemLabel}
  />
)}
```

## Failed-stage error state

Show the `run.error.message` verbatim. Offer a "retry" button that POSTs to `/api/runs/:id/retry` — server-side calls `runs.replay(runId)` from `@trigger.dev/sdk/v3`.

## Accessibility

- Every progress bar has `aria-label` and `aria-valuetext`.
- Status transitions announce via `role="status"` + `aria-live="polite"` wrapper.
- Keyboard nav: left/right to prev/next question on `/review/[id]`, space to play/pause the clip, `?` opens a keybind cheat sheet.

## Do not

- Do not set up an SSE route. Do not poll `/api/runs/:id`. Realtime is the only transport.
- Do not render the full `run` object — it changes constantly and will thrash React. Render only the scoped fields you actually use.

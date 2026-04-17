import { task } from "@trigger.dev/sdk/v3";

// Round-trip smoke task exercised by Task 1's Verification block.
// The route handler at /api/trigger/hello enqueues this task.

export const hello = task({
  id: "hello",
  maxDuration: 30,
  run: async (payload: { name?: string }) => {
    const name = payload?.name ?? "world";
    return { greeting: `hello, ${name}` };
  },
});

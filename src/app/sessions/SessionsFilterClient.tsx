"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";

export function SessionsFilterClient() {
  const router = useRouter();
  const params = useSearchParams();
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams();
    const from = fromRef.current?.value;
    const to = toRef.current?.value;
    if (from) sp.set("from", new Date(from).toISOString());
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      sp.set("to", toDate.toISOString());
    }
    router.push(`/sessions?${sp.toString()}`);
  }

  function handleClear() {
    router.push("/sessions");
  }

  const currentFrom = params.get("from") ? new Date(params.get("from")!).toISOString().slice(0, 10) : "";
  const currentTo = params.get("to") ? new Date(params.get("to")!).toISOString().slice(0, 10) : "";

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-neutral-400" htmlFor="from">
          From
        </label>
        <input
          id="from"
          ref={fromRef}
          type="date"
          defaultValue={currentFrom}
          className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-neutral-400" htmlFor="to">
          To
        </label>
        <input
          id="to"
          ref={toRef}
          type="date"
          defaultValue={currentTo}
          className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <button
        type="submit"
        className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
      >
        Filter
      </button>
      {(currentFrom || currentTo) && (
        <button
          type="button"
          onClick={handleClear}
          className="rounded-md border border-neutral-600 px-3 py-1.5 text-sm text-neutral-300 hover:border-neutral-400"
        >
          Clear
        </button>
      )}
    </form>
  );
}

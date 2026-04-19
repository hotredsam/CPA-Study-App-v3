// Type stub for @xenova/transformers — installed at runtime in Trigger.dev container.
// TODO(night6): run `pnpm add @xenova/transformers` once ML model download is acceptable.
declare module "@xenova/transformers" {
  export function pipeline(
    task: string,
    model: string
  ): Promise<(input: string | string[]) => Promise<{ data: Float32Array | number[] }[]>>;
}

import {
  createReactiveActionStore,
  isAbortError,
  type ReactiveActionState,
  type ReactiveActionStore,
} from "./kit";

/**
 * Framework-agnostic action state machine for Solana async work.
 *
 * Wraps an async function receiving a fresh `AbortSignal` per call and exposes a
 * `{ getState, subscribe, dispatch, reset, withSignal }` store that UI frameworks
 * can bridge into reactive state (Vue composables, React hooks, etc.).
 *
 * - Each `dispatch` aborts the previous in-flight call (fresh signal per dispatch).
 * - Superseded calls reject with an abort error; real failures surface on state.
 * - `withSignal` composes a caller-provided cancellation source per dispatch
 *   (per-attempt timeouts, shared kill switches).
 *
 * @see `createReactiveActionStore` from `@solana/kit`, which this wraps.
 */
export type SolanaActionStore<TArgs extends readonly unknown[], TResult> = ReactiveActionStore<
  TArgs,
  TResult
>;

export function createSolanaActionStore<TArgs extends readonly unknown[], TResult>(
  fn: (signal: AbortSignal, ...args: TArgs) => Promise<TResult>,
): SolanaActionStore<TArgs, TResult> {
  return createReactiveActionStore(fn);
}

/**
 * Snapshot shape bridged into reactive state by framework composables.
 */
export type SolanaActionState<TResult> = ReactiveActionState<TResult>;

export { isAbortError };

export function isSolanaActionAborted(error: unknown): boolean {
  return isAbortError(error);
}

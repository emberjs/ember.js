import { scheduleOnce } from '@ember/runloop';

// Indirection between environment.ts (which needs to schedule revalidation
// from the glimmer global context) and base-renderer.ts (which owns the
// renderers and implements the flush), so neither has to import the other.

let flushFn: () => void = () => {};

export function _setAsyncRenderFlush(fn: () => void): void {
  flushFn = fn;
}

function runAsyncRenderFlush(): void {
  flushFn();
}

// Schedules the async rendering pass (deduplicated) into the scheduler's
// render phase. Only used when the `use-async-scheduler` optional feature
// is enabled.
export function _scheduleAsyncRevalidate(): void {
  scheduleOnce('render', null, runAsyncRenderFlush);
}

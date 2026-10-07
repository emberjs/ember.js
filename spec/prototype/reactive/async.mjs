// An asynchronous reactive resource built only from the [Proposed] core (§07-2.7). This is an
// exploration, not a proposal for the core: it shows that `tracked`, `cached`, `isValid`,
// `untrack` and `effect` are enough to track consumption across `await`.
//
//   let r = resource(async ({ signal, read }) => {
//     let id = this.id;                         // read before the first await: tracked
//     let res = await fetch(`/x/${id}`, { signal });
//     let filter = read(() => this.filter);     // read after an await: tracked through read()
//     return (await res.json()).filter(filter);
//   }, { onChange: 'restart' });
//
//   r.value, r.error, r.isPending              // tracked; usable in templates
//
// Each run records the computations it read as `cached()` values: one for the synchronous
// prefix of `fn`, and one per `read()`. A per-run watcher effect re-reads that list; when it
// finds one that is no longer valid, an input of the run has changed since the run read it.
//
// `onChange` decides what happens then:
//   'restart'  abort the run (signal) and start a new one; its result is discarded.
//   'finish'   let the run finish and publish its result, then start a new run.
// In both, `value` keeps the last published result while a new run is pending.

import {
  tracked,
  cached,
  isValid,
  untrack,
  effect,
  destroy,
  registerDestructor,
} from './core.mjs';

export function resource(fn, { onChange = 'restart', schedule } = {}) {
  let status = tracked('pending');
  let value = tracked(undefined);
  let error = tracked(undefined);
  let current;

  function start() {
    let run = {
      controller: new AbortController(),
      reads: tracked([], { equals: () => false }),
      stale: false,
      watcher: undefined,
    };
    current = run;
    status.value = 'pending';

    let record = (c) => {
      run.reads.value = [...untrack(() => run.reads.value), c];
    };
    let read = (thunk) => {
      let c = cached(thunk);
      let v = untrack(() => c.value);
      if (run === current) record(c);
      return v;
    };

    // The synchronous prefix (everything up to the first await) runs as a `cached()`
    // computation, so plain reads there are tracked without read().
    let prefix = cached(() => fn({ signal: run.controller.signal, read }));
    let promise = untrack(() => prefix.value);
    record(prefix);

    run.watcher = effect(
      () => {
        for (let c of run.reads.value) {
          if (!isValid(c)) return untrack(() => changed(run));
          c.value; // still valid: consume its dependencies, nothing re-runs
        }
      },
      { schedule, description: 'resource watcher' }
    );

    Promise.resolve(promise).then(
      (v) => settle(run, 'resolved', v),
      (e) => settle(run, 'rejected', e)
    );
  }

  function changed(run) {
    if (run !== current) return;
    destroy(run.watcher);
    if (onChange === 'restart') {
      run.controller.abort();
      start();
    } else {
      run.stale = true; // 'finish': settle() starts the next run
    }
  }

  function settle(run, outcome, result) {
    if (run !== current) return; // superseded by a restart
    if (outcome === 'resolved') {
      value.value = result;
      error.value = undefined;
    } else {
      error.value = result;
    }
    status.value = outcome;
    if (run.stale) start();
  }

  let handle = {
    get value() {
      return value.value;
    },
    get error() {
      return error.value;
    },
    get isPending() {
      return status.value === 'pending';
    },
    get status() {
      return status.value;
    },
  };

  registerDestructor(handle, () => {
    let run = current;
    current = undefined;
    run.controller.abort();
    destroy(run.watcher);
  });

  start();
  return handle;
}

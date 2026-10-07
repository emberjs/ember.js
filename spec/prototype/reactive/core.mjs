// Prototype of the [Proposed] reactive core of §07-2.2, layered on the built
// `@glimmer/validator` (dist/dev). It exists to test the spec's claims, not to be shipped:
// a real implementation would live inside the validator and keep its own private state.
//
//   tracked(v, options)   root state        (existing, RFC 1071; re-exported unchanged)
//   cached(fn, options)   derived state     (RFC 1218)
//   isValid(c), isConst(c)                  introspection of a `cached()` value
//   untrack(fn)                             untracked frame
//   effect(fn, options)                     consumption: runs `fn` again when what it read changes
//
// The only private hook used is the global-context `scheduleRevalidate`, which the validator
// calls on every invalidation (§07-1.1 item 5). Here it drives effect scheduling and nothing else.

const DIST = new URL('../../../dist/dev/packages/@glimmer/', import.meta.url);
const V = await import(new URL('validator/index.js', DIST));
const GC = await import(new URL('global-context/index.js', DIST));
const D = await import(new URL('destroyable/index.js', DIST));

const {
  beginTrackFrame,
  endTrackFrame,
  consumeTag,
  validateTag,
  valueForTag,
  isConstTag,
  untrack,
  trackedValue: tracked,
} = V;

export { tracked, untrack };
export const { destroy, registerDestructor, associateDestroyableChild, isDestroying } = D;

// ---------------------------------------------------------------------------------------------
// cached()

const STATE = new WeakMap(); // cached value -> { fn, value, tag, snapshot, description }

class CachedValue {
  constructor(fn, description) {
    STATE.set(this, { fn, value: undefined, tag: undefined, snapshot: -1, description });
    // An own arrow-function property, like `TrackedValue#get`, so it works detached.
    this.get = () => this.value;
    Object.freeze(this);
  }

  get value() {
    let s = STATE.get(this);
    if (s.tag === undefined || !validateTag(s.tag, s.snapshot)) {
      beginTrackFrame(s.description);
      try {
        s.value = s.fn();
      } finally {
        // Same order as `getValue` today (tracking.ts): a throw keeps the old value but records
        // the partial dependency set (§07-1.8 item 3).
        s.tag = endTrackFrame();
        s.snapshot = valueForTag(s.tag);
        consumeTag(s.tag);
      }
    } else {
      consumeTag(s.tag);
    }
    return s.value;
  }
}

export function cached(fn, { description } = {}) {
  if (typeof fn !== 'function') {
    throw new TypeError(`cached() must be passed a function. Called with: ${String(fn)}`);
  }
  return new CachedValue(fn, description);
}

function stateOf(c, name) {
  let s = typeof c === 'object' && c !== null ? STATE.get(c) : undefined;
  if (s === undefined) {
    throw new TypeError(`${name}() must be passed a value created by cached(). Called with: ${String(c)}`);
  }
  return s;
}

export function isCachedValue(c) {
  return typeof c === 'object' && c !== null && STATE.has(c);
}

export function isValid(c) {
  let s = stateOf(c, 'isValid');
  return s.tag !== undefined && validateTag(s.tag, s.snapshot);
}

export function isConst(c) {
  let s = stateOf(c, 'isConst');
  if (s.tag === undefined) {
    throw new Error(
      `isConst() can only be used on a cached value once it has been read at least once. Called with:\n\n${String(s.fn)}`
    );
  }
  return isConstTag(s.tag);
}

// ---------------------------------------------------------------------------------------------
// effect()

let defaultSchedule = (flush) => queueMicrotask(flush);

// Host configuration, not user API: a host (Ember) may pick where effects without an explicit
// `schedule` run, e.g. a run-loop queue.
export function setDefaultEffectSchedule(schedule) {
  defaultSchedule = schedule;
}

let nextId = 0;
const live = new Set(); // effects that may need to run again, in creation order
let unscheduled = 0; // how many of `live` are not in a batch; 0 makes notify() O(1)
const batches = new Map(); // schedule function -> Set of effects waiting for its flush

class Effect {
  constructor(fn, schedule, description) {
    this.id = nextId++;
    this.fn = fn;
    this.schedule = schedule;
    this.description = description;
    this.tag = undefined;
    this.snapshot = -1;
    this.cleanup = undefined;
    this.scheduled = false;
    this.stopped = false;
  }
}

function enqueue(e) {
  e.scheduled = true;
  unscheduled--;
  let batch = batches.get(e.schedule);
  if (batch === undefined) {
    batch = new Set();
    batches.set(e.schedule, batch);
    let schedule = e.schedule;
    schedule(() => flush(schedule));
  }
  batch.add(e);
}

// The invalidation hook. Tags have no reverse edges, so the core cannot tell which effects a
// write affects: it schedules every live effect once and checks validity when the batch runs.
function notify() {
  if (unscheduled === 0) return;
  for (let e of live) if (!e.scheduled) enqueue(e);
}

function flush(schedule) {
  let batch = batches.get(schedule);
  if (batch === undefined) return; // a second call for the same batch does nothing
  batches.delete(schedule);
  let errors = [];
  for (let e of [...batch].sort((a, b) => a.id - b.id)) {
    if (!live.has(e)) continue; // destroyed, or constant since it was scheduled
    e.scheduled = false;
    unscheduled++;
    if (e.tag !== undefined && validateTag(e.tag, e.snapshot)) continue; // spurious: still valid
    try {
      run(e);
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, 'Several effects threw');
}

function run(e) {
  if (e.cleanup !== undefined) {
    let cleanup = e.cleanup;
    e.cleanup = undefined;
    untrack(cleanup);
  }
  let result;
  // A fresh computation: nothing it reads is consumed by whatever frame is active outside.
  untrack(() => {
    beginTrackFrame(e.description);
    try {
      result = e.fn();
    } finally {
      e.tag = endTrackFrame();
      e.snapshot = valueForTag(e.tag);
    }
  });
  if (typeof result === 'function') {
    if (e.stopped) untrack(result); // destroyed during its own run
    else e.cleanup = result;
  }
  if (!e.stopped && isConstTag(e.tag) && live.delete(e)) {
    // Read nothing: it can never run again. Its cleanup still runs on destroy.
    if (!e.scheduled) unscheduled--;
  }
}

export function effect(fn, { schedule = defaultSchedule, description } = {}) {
  if (typeof fn !== 'function') {
    throw new TypeError(`effect() must be passed a function. Called with: ${String(fn)}`);
  }
  let e = new Effect(fn, schedule, description);
  let handle = Object.freeze({});
  live.add(e);
  unscheduled++;
  registerDestructor(
    handle,
    () => {
      e.stopped = true;
      if (live.delete(e) && !e.scheduled) unscheduled--;
      batches.get(e.schedule)?.delete(e);
    },
    true // eager: stops synchronously inside destroy()
  );
  registerDestructor(handle, () => {
    if (e.cleanup !== undefined) {
      let cleanup = e.cleanup;
      e.cleanup = undefined;
      untrack(cleanup);
    }
  });
  enqueue(e); // the first run is scheduled like any other
  return handle;
}

// ---------------------------------------------------------------------------------------------
// Host wiring for this prototype: route invalidations to the effect core, and run destructors
// synchronously (Ember defers them to the run loop's `destroy` queue).

GC.testOverrideGlobalContext({
  scheduleRevalidate: notify,
  scheduleDestroy: (destroyable, destructor) => destructor(destroyable),
  scheduleDestroyed: (finalizer) => finalizer(),
  assert: (test, msg) => {
    if (!test) throw new Error(msg);
  },
  deprecate: () => {},
});

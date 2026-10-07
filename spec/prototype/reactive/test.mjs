// node --test spec/prototype/reactive/   (needs `pnpm build` output in dist/dev)
// Each test names the § rule it checks.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tracked,
  cached,
  isValid,
  isConst,
  untrack,
  effect,
  destroy,
} from './core.mjs';
import { createCache, getValue, isConst as compatIsConst, cachedDecorator } from './compat.mjs';
import { resource } from './async.mjs';

const tick = () => new Promise((r) => setTimeout(r, 0));

function deferred() {
  let resolve, reject;
  let promise = new Promise((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}

// --- cached() §07-2.2.2 ----------------------------------------------------------------------

test('cached: lazy, memoized while valid, re-evaluated after a dependency changes', () => {
  let n = tracked(1);
  let calls = 0;
  let c = cached(() => (calls++, n.value * 2));
  assert.equal(calls, 0);
  assert.equal(c.value, 2);
  assert.equal(c.get(), 2);
  assert.equal(calls, 1);
  n.value = 5;
  assert.equal(calls, 1, 'invalidation does not re-evaluate (§07-1.5 item 5)');
  assert.equal(c.value, 10);
  assert.equal(calls, 2);
});

test('cached: get is detachable; the value is read-only', () => {
  let c = cached(() => 3);
  let { get } = c;
  assert.equal(get(), 3);
  assert.throws(() => {
    'use strict';
    c.value = 4;
  }, TypeError);
});

test('cached: a reader consumes the dependencies even when the value is cached (§07-1.3 item 2)', () => {
  let n = tracked(1);
  let inner = cached(() => n.value);
  inner.value;
  let outer = cached(() => inner.value);
  outer.value;
  assert.ok(isValid(outer));
  n.value = 2;
  assert.equal(isValid(outer), false);
  assert.equal(outer.value, 2);
});

test('cached: a throw keeps the previous value and does not rethrow while valid (§07-1.8 item 3)', () => {
  let n = tracked(1);
  let c = cached(() => {
    if (n.value === 2) throw new Error('boom');
    return n.value;
  });
  assert.equal(c.value, 1);
  n.value = 2;
  assert.throws(() => c.value, /boom/);
  assert.equal(c.value, 1, 'stale value, no rethrow');
});

// --- isValid / isConst §07-2.2.3 ---------------------------------------------------------------

test('isValid: false before the first read, true after, false after a dependency changes', () => {
  let n = tracked(1);
  let calls = 0;
  let c = cached(() => (calls++, n.value));
  assert.equal(isValid(c), false);
  assert.equal(calls, 0, 'isValid does not evaluate');
  c.value;
  assert.equal(isValid(c), true);
  n.value = 2;
  assert.equal(isValid(c), false);
  assert.equal(calls, 1);
});

test('isValid: consumes nothing', () => {
  let n = tracked(1);
  let inner = cached(() => n.value);
  inner.value;
  let outer = cached(() => isValid(inner));
  outer.value;
  assert.equal(isConst(outer), true);
});

test('isConst: throws before the first read; true iff the last evaluation read nothing', () => {
  let n = tracked(1);
  let c = cached(() => n.value);
  assert.throws(() => isConst(c), /once it has been read/);
  c.value;
  assert.equal(isConst(c), false);
  let k = cached(() => 42);
  k.value;
  assert.equal(isConst(k), true);
});

test('isValid/isConst reject values not created by cached()', () => {
  assert.throws(() => isValid({}), TypeError);
  assert.throws(() => isValid(tracked(1)), TypeError);
});

// --- untrack §07-2.2.4 --------------------------------------------------------------------------

test('untrack: reads inside it are not consumed', () => {
  let n = tracked(1);
  let c = cached(() => untrack(() => n.value));
  c.value;
  assert.equal(isConst(c), true);
});

// --- effect() §07-2.2.5 ---------------------------------------------------------------------------

test('effect: first run is scheduled, not synchronous', async () => {
  let runs = 0;
  let e = effect(() => void runs++);
  assert.equal(runs, 0);
  await tick();
  assert.equal(runs, 1);
  destroy(e);
});

test('effect: re-runs once per batch, however many writes', async () => {
  let n = tracked(0);
  let seen = [];
  let e = effect(() => void seen.push(n.value));
  await tick();
  n.value = 1;
  n.value = 2;
  n.value = 3;
  await tick();
  assert.deepEqual(seen, [0, 3]);
  destroy(e);
});

test('effect: an unrelated write does not re-run it', async () => {
  let a = tracked(0);
  let b = tracked(0);
  let runs = 0;
  let e = effect(() => void (a.value, runs++));
  await tick();
  b.value = 1;
  await tick();
  assert.equal(runs, 1);
  destroy(e);
});

test('effect: dependencies are re-collected on every run', async () => {
  let which = tracked('a');
  let a = tracked(0);
  let b = tracked(0);
  let runs = 0;
  let e = effect(() => void (runs++, which.value === 'a' ? a.value : b.value));
  await tick();
  which.value = 'b';
  await tick();
  assert.equal(runs, 2);
  a.value = 1;
  await tick();
  assert.equal(runs, 2, 'a is no longer a dependency');
  b.value = 1;
  await tick();
  assert.equal(runs, 3);
  destroy(e);
});

test('effect: cleanup runs before the next run and on destroy', async () => {
  let n = tracked(0);
  let log = [];
  let e = effect(() => {
    let v = n.value;
    log.push(`run ${v}`);
    return () => log.push(`cleanup ${v}`);
  });
  await tick();
  n.value = 1;
  await tick();
  destroy(e);
  assert.deepEqual(log, ['run 0', 'cleanup 0', 'run 1', 'cleanup 1']);
  n.value = 2;
  await tick();
  assert.equal(log.length, 4, 'a destroyed effect never runs');
});

test('effect: destroying a scheduled effect cancels its run', async () => {
  let runs = 0;
  let e = effect(() => void runs++);
  destroy(e);
  await tick();
  assert.equal(runs, 0);
});

test('effect: destroyed during its own run, it finishes the run and cleans up', async () => {
  let n = tracked(0);
  let log = [];
  let e = effect(() => {
    n.value;
    destroy(e);
    return () => log.push('cleanup');
  });
  await tick();
  assert.deepEqual(log, ['cleanup']);
  n.value = 1;
  await tick();
  assert.deepEqual(log, ['cleanup']);
});

test('effect: reading nothing makes it constant; it never runs again', async () => {
  let n = tracked(0);
  let runs = 0;
  let e = effect(() => void runs++);
  await tick();
  n.value = 1;
  await tick();
  assert.equal(runs, 1);
  destroy(e);
});

test('effect: creating one inside a computation adds nothing to that computation', async () => {
  let n = tracked(0);
  let e;
  let c = cached(() => {
    e = effect(() => void n.value);
    return 1;
  });
  c.value;
  await tick();
  assert.equal(isConst(c), true);
  destroy(e);
});

test('effect: a custom schedule is called once per batch; the batch runs in creation order', async () => {
  let n = tracked(0);
  let pending = [];
  let schedule = (flush) => pending.push(flush);
  let log = [];
  let e1 = effect(() => void log.push(`one ${n.value}`), { schedule });
  let e2 = effect(() => void log.push(`two ${n.value}`), { schedule });
  assert.equal(pending.length, 1);
  pending.shift()();
  assert.deepEqual(log, ['one 0', 'two 0']);
  n.value = 1;
  n.value = 2;
  assert.equal(pending.length, 1);
  pending.shift()();
  assert.deepEqual(log, ['one 0', 'two 0', 'one 2', 'two 2']);
  destroy(e1);
  destroy(e2);
});

test('effect: a write inside an effect schedules effects that read it', async () => {
  let source = tracked(1);
  let derived = tracked(0);
  let seen = [];
  let reader = effect(() => void seen.push(derived.value));
  let writer = effect(() => {
    let v = source.value;
    untrack(() => (derived.value = v * 10));
  });
  await tick();
  await tick();
  assert.deepEqual(seen.at(-1), 10);
  source.value = 2;
  await tick();
  await tick();
  assert.deepEqual(seen.at(-1), 20);
  destroy(reader);
  destroy(writer);
});

test('effect: reading then writing the same cell in one run asserts (§07-1.9) [Dev]', async () => {
  let n = tracked(0);
  let pending = [];
  let e = effect(
    () => {
      n.value;
      n.value = 1;
    },
    { schedule: (f) => pending.push(f) }
  );
  assert.throws(() => pending.shift()(), /You attempted to update/);
  destroy(e);
});

test('effect: one throwing effect does not stop the others in its batch', async () => {
  let pending = [];
  let schedule = (f) => pending.push(f);
  let ran = false;
  let e1 = effect(() => { throw new Error('first'); }, { schedule });
  let e2 = effect(() => void (ran = true), { schedule });
  assert.throws(() => pending.shift()(), /first/);
  assert.equal(ran, true);
  destroy(e1);
  destroy(e2);
});

// --- compatibility §07-2.2.6 ----------------------------------------------------------------------

test('compat: createCache/getValue/isConst are cached()/value/isConst', () => {
  let n = tracked(1);
  let c = createCache(() => n.value + 1);
  assert.equal(getValue(c), 2);
  assert.equal(compatIsConst(c), false);
  assert.equal(isValid(c), true, 'a createCache cache is a cached() value');
  assert.equal(c.value, 2);
  assert.throws(() => createCache(1), /must be passed a function/);
  assert.throws(() => getValue({}), /can only be used on an instance of a cache/);
});

test('compat: @cached as sugar over cached()', () => {
  let calls = 0;
  class P {
    first = tracked('a');
    get full() {
      calls++;
      return `${this.first.value}!`;
    }
  }
  let desc = Object.getOwnPropertyDescriptor(P.prototype, 'full');
  Object.defineProperty(P.prototype, 'full', cachedDecorator(P.prototype, 'full', desc));
  let p = new P();
  assert.equal(p.full, 'a!');
  assert.equal(p.full, 'a!');
  assert.equal(calls, 1);
  p.first.value = 'b';
  assert.equal(p.full, 'b!');
  assert.equal(calls, 2);
});

// --- asynchronous resources §07-2.7 --------------------------------------------------------------

test('resource: resolves; reads before the first await are tracked', async () => {
  let id = tracked(1);
  let calls = [];
  let r = resource(async () => {
    let v = id.value;
    calls.push(v);
    await tick();
    return v * 100;
  });
  assert.equal(r.isPending, true);
  await tick();
  await tick();
  assert.equal(r.value, 100);
  id.value = 2;
  await tick();
  assert.equal(r.isPending, true);
  assert.equal(r.value, 100, 'the last result stays visible while pending');
  await tick();
  await tick();
  assert.equal(r.value, 200);
  assert.deepEqual(calls, [1, 2]);
  destroy(r);
});

test('resource: restart aborts the run and discards its result', async () => {
  let id = tracked(1);
  let runs = [];
  let r = resource(async ({ signal }) => {
    let v = id.value;
    let d = deferred();
    runs.push({ v, d, signal });
    return d.promise;
  });
  id.value = 2;
  await tick();
  assert.equal(runs.length, 2);
  assert.equal(runs[0].signal.aborted, true);
  runs[1].d.resolve('two');
  runs[0].d.resolve('one');
  await tick();
  assert.equal(r.value, 'two');
  destroy(r);
});

test('resource: read() tracks reads made after an await', async () => {
  let id = tracked(1);
  let filter = tracked('x');
  let runs = 0;
  let r = resource(async ({ read }) => {
    runs++;
    let v = id.value;
    await tick();
    return `${v}-${read(() => filter.value)}`;
  });
  await tick();
  await tick();
  assert.equal(r.value, '1-x');
  filter.value = 'y';
  await tick();
  await tick();
  await tick();
  assert.equal(r.value, '1-y');
  assert.equal(runs, 2);
  destroy(r);
});

test('resource: a plain read after an await is not tracked (the pitfall read() avoids)', async () => {
  let filter = tracked('x');
  let runs = 0;
  let r = resource(async () => {
    runs++;
    await tick();
    return filter.value;
  });
  await tick();
  await tick();
  filter.value = 'y';
  await tick();
  await tick();
  assert.equal(runs, 1);
  assert.equal(r.value, 'x', 'stale');
  destroy(r);
});

test('resource: a change between a read and the watcher\'s first run is still seen (isValid)', async () => {
  let id = tracked(1);
  let runs = 0;
  let pending = [];
  let r = resource(
    async () => {
      runs++;
      return id.value;
    },
    { schedule: (f) => pending.push(f) }
  );
  id.value = 2; // the watcher has not run yet
  while (pending.length) pending.shift()();
  assert.equal(runs, 2);
  while (pending.length) pending.shift()();
  await tick();
  assert.equal(r.value, 2);
  destroy(r);
});

test("resource: onChange 'finish' publishes the run's result, then starts a new run", async () => {
  let id = tracked(1);
  let runs = [];
  let r = resource(
    async ({ signal }) => {
      let v = id.value;
      let d = deferred();
      runs.push({ v, d, signal });
      return d.promise;
    },
    { onChange: 'finish' }
  );
  await tick();
  id.value = 2;
  await tick();
  assert.equal(runs.length, 1, 'no restart while running');
  assert.equal(runs[0].signal.aborted, false);
  runs[0].d.resolve('one');
  await tick();
  assert.equal(r.value, 'one');
  assert.equal(runs.length, 2);
  assert.equal(r.isPending, true);
  runs[1].d.resolve('two');
  await tick();
  assert.equal(r.value, 'two');
  destroy(r);
});

test('resource: destroy aborts the run and stops watching', async () => {
  let id = tracked(1);
  let signals = [];
  let r = resource(async ({ signal }) => {
    id.value;
    signals.push(signal);
    return deferred().promise;
  });
  await tick();
  destroy(r);
  assert.equal(signals[0].aborted, true);
  id.value = 2;
  await tick();
  assert.equal(signals.length, 1);
});

// --- a promise-based scheduler strategy (RFC 957) §07-2.8 --------------------------------------

// RFC 957 Example 1, reduced to `render` and `layout`, with the frame driven by the test instead
// of requestAnimationFrame. Scheduling into `render` while it flushes resolves in this frame.
class FakeFrameStrategy {
  frame = null;
  flushing = null;
  phase(name) {
    if (name === 'render' && this.flushing === 'render') return Promise.resolve();
    this.frame ??= { render: Promise.withResolvers(), layout: Promise.withResolvers() };
    return this.frame[name].promise;
  }
  render() {
    return this.phase('render');
  }
  layout() {
    return this.phase('layout');
  }
  async runFrame(log) {
    let frame = this.frame;
    this.frame = null;
    for (let name of ['render', 'layout']) {
      this.flushing = name;
      log.push(`-- ${name}`);
      frame[name].resolve();
      await tick(); // drains the microtasks of this phase
    }
    this.flushing = null;
    log.push('-- paint');
  }
}

test('RFC 957: effects sharing the renderer schedule run after it, and re-render in the same frame', async () => {
  let strategy = new FakeFrameStrategy();
  let renderPhase = (flush) => strategy.render().then(flush);
  let count = tracked(0);
  let doubled = tracked(0);
  let log = [];
  let renderer = effect(() => void log.push(`render ${count.value}/${doubled.value}`), {
    schedule: renderPhase,
  });
  let user = effect(
    () => {
      let c = count.value;
      log.push(`user ${c}`);
      untrack(() => (doubled.value = c * 2));
    },
    { schedule: renderPhase }
  );
  await strategy.runFrame(log);
  count.value = 1;
  await strategy.runFrame(log);
  assert.deepEqual(log, [
    '-- render', 'render 0/0', 'user 0', '-- layout', '-- paint',
    '-- render', 'render 1/0', 'user 1', 'render 1/2', '-- layout', '-- paint',
  ]);
  destroy(renderer);
  destroy(user);
});

function renderingSetup(strategy, { hostPass }) {
  let a = tracked(0);
  let dom = { a: 0 };
  let log = [];
  let rendererSchedule, userSchedule;
  if (hostPass) {
    // The host owns one render pass per frame: the renderer's batch, then user effects.
    let pending = { renderer: [], user: [] };
    let passScheduled = false;
    let pass = () => {
      passScheduled = false;
      for (let f of pending.renderer.splice(0)) f();
      for (let f of pending.user.splice(0)) f();
    };
    let ensurePass = () => {
      if (!passScheduled) (passScheduled = true), strategy.render().then(pass);
    };
    rendererSchedule = (flush) => (pending.renderer.push(flush), ensurePass());
    userSchedule = (flush) => (pending.user.push(flush), ensurePass());
  } else {
    rendererSchedule = (flush) => strategy.render().then(flush);
    userSchedule = (flush) => strategy.render().then(flush);
  }
  // The user effect is created first, e.g. at module scope before the app boots.
  let user = effect(() => void log.push(`user: state ${a.value}, DOM ${dom.a}`), {
    schedule: userSchedule,
  });
  let renderer = effect(() => void (dom.a = a.value), { schedule: rendererSchedule });
  return { a, log, effects: [user, renderer] };
}

test('RFC 957: with separate schedules, an effect can run before the renderer and see stale DOM', async () => {
  let strategy = new FakeFrameStrategy();
  let { a, log, effects } = renderingSetup(strategy, { hostPass: false });
  await strategy.runFrame(log);
  a.value = 1;
  await strategy.runFrame(log);
  assert.ok(log.includes('user: state 1, DOM 0'), log.join('\n'));
  effects.forEach(destroy);
});

test('RFC 957: a host render pass runs the renderer before user effects', async () => {
  let strategy = new FakeFrameStrategy();
  let { a, log, effects } = renderingSetup(strategy, { hostPass: true });
  await strategy.runFrame(log);
  a.value = 1;
  await strategy.runFrame(log);
  assert.ok(log.includes('user: state 1, DOM 1'), log.join('\n'));
  assert.ok(!log.some((l) => l.includes('DOM 0') && l.includes('state 1')));
  effects.forEach(destroy);
});

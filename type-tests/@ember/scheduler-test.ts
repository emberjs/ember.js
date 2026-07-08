import { render, layout, composite, next, idle, registerStrategy } from '@ember/scheduler';
import type { Strategy } from '@ember/scheduler';
import strategy, { FrameStrategy } from '@ember/scheduler/strategy';
import { expectTypeOf } from 'expect-type';

expectTypeOf(render()).toEqualTypeOf<Promise<void>>();
expectTypeOf(layout()).toEqualTypeOf<Promise<void>>();
expectTypeOf(composite()).toEqualTypeOf<Promise<void>>();
expectTypeOf(next()).toEqualTypeOf<Promise<void>>();
expectTypeOf(idle()).toEqualTypeOf<Promise<void>>();

expectTypeOf(registerStrategy(strategy)).toEqualTypeOf<void>();
expectTypeOf(strategy).toMatchTypeOf<Strategy>();
expectTypeOf(new FrameStrategy()).toMatchTypeOf<Strategy>();

// @ts-expect-error requires a strategy
registerStrategy();

registerStrategy({
  render: () => Promise.resolve(),
  layout: () => Promise.resolve(),
  composite: () => Promise.resolve(),
  next: () => Promise.resolve(),
  idle: () => Promise.resolve(),
});

// @ts-expect-error an incomplete strategy is rejected
registerStrategy({ render: () => Promise.resolve() });

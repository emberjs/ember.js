// This module contains a `@glimmer/component`-like base class and the
// declarations necessary for it to be used as a component in glint, as
// well as simple examples of a helper and modifier.

import { ComponentLike, ModifierLike } from '../-private/index';
import { Context, TemplateContext } from '../-private/integration';
import { LetKeyword } from '../-private/keywords';

export default TestComponent;
export declare const globals: {
  let: LetKeyword;
  on: abstract new <T extends keyof HTMLElementEventMap>() => InstanceType<
    ModifierLike<{
      Element: Element;
      Args: {
        Positional: [eventName: T, callback: (event: HTMLElementEventMap[T]) => void];
      };
    }>
  >;
};

type Get<T, K, Otherwise = {}> = K extends keyof T ? Exclude<T[K], undefined> : Otherwise;

interface TestComponent<T = {}> extends InstanceType<ComponentLike<T>> {}
declare class TestComponent<T = {}> {
  readonly args: Get<T, 'Args'>;
  [Context]: TemplateContext<this, Get<T, 'Args'>, Get<T, 'Blocks'>, Get<T, 'Element', null>>;
}

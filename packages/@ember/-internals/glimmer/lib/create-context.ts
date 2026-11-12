/**
@module @ember/helper
*/
import type { TemplateOnlyComponent } from '@ember/component/template-only';
import type { InternalOwner } from '@ember/-internals/owner';
import { precompileTemplate } from '@ember/template-compilation';
import type { CapturedArguments } from '@glimmer/interfaces';
import { valueForRef } from '@glimmer/reference/lib/reference';
import { lookupRenderContext, provideRenderContext } from '@glimmer/runtime/lib/render-scope';
import InternalComponent, { opaquify } from './components/internal';

export interface Context<T> {
  Provide: TemplateOnlyComponent<{
    Args: { value: T };
    Blocks: { default: [] };
  }>;

  readonly value: T;
}

const PROVIDE_TEMPLATE = precompileTemplate('{{yield}}', { strictMode: true });

export function createContext<T>(): Context<T> {
  /**
   * The identity of this context.
   *
   * Two contexts never match each other, even with the same `T`.
   */
  const key = {};

  class Provide extends InternalComponent {
    static override toString(): string {
      return 'Provide';
    }

    constructor(owner: InternalOwner, args: CapturedArguments, caller: unknown) {
      super(owner, args, caller);

      /**
       * The read is lazy, so a reader consumes the tags of `@value`
       * and renders again when it changes.
       *
       * Without `@value`, the provider still exists and provides `undefined`.
       */
      const valueRef = args.named['value'];
      const read = (): unknown => (valueRef === undefined ? undefined : valueForRef(valueRef));

      provideRenderContext(key, read);
    }
  }

  return {
    Provide: opaquify(Provide, PROVIDE_TEMPLATE) as unknown as Context<T>['Provide'],

    get value(): T {
      let read = lookupRenderContext(key);

      if (read === undefined) {
        throw new Error(
          'A context `value` was read outside of rendering. Read the context while rendering, for example in a component constructor, and keep the value.'
        );
      }

      if (read === null) {
        throw new Error(
          'No matching `<Provide>` was found in the render tree. Wrap consumers in `<context.Provide @value={{...}}>...</context.Provide>`, or provide a value at the application root.'
        );
      }

      return read() as T;
    },
  };
}

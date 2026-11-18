import { expectTypeOf } from 'expect-type';
import {
  applyModifier,
  emitComponent,
  emitElement,
  emitContent,
  resolve,
  resolveOrReturn,
  templateForBackingValue,
  yieldToBlock,
  NamedArgsMarker,
} from '../-private/dsl';
import TestComponent, { globals } from './test-component';

type MyComponentSignature<T> = {
  Args: {
    name?: string;
    value: T;
  };
  Blocks: {
    body?: [boolean, T];
  };
  Element: HTMLDivElement;
};

class MyComponent<T> extends TestComponent<MyComponentSignature<T>> {
  private state = { ready: false };

  private wrapperClicked(event: MouseEvent): void {
    console.log('clicked', event.x, event.y);
  }

  /**
   * ```hbs
   * {{#let this.state.ready as |isReady|}}
   *   <div {{on 'click' this.wrapperClicked}}>
   *     {{yield isReady @value to="body"}}
   *   </div>
   * {{/let}}
   * ```
   */
  static {
    templateForBackingValue(this, function (__glintRef__) {
      const component = emitComponent(resolve(globals.let)(__glintRef__.this.state.ready));
      const [isReady] = component.blockParams.default;

      {
        const __glintY__ = emitElement('div');
        expectTypeOf(__glintY__).toEqualTypeOf<{ element: HTMLDivElement }>();
        applyModifier(
          resolve(globals.on)(__glintY__.element, 'click', __glintRef__.this.wrapperClicked),
        );
      }

      yieldToBlock(__glintRef__, 'body')(isReady, __glintRef__.args.value);

      yieldToBlock(
        __glintRef__,
        // @ts-expect-error: bad block
        'bad',
      )(isReady, __glintRef__.args.value);

      // @ts-expect-error: missing params
      yieldToBlock(__glintRef__, 'body')();

      yieldToBlock(__glintRef__, 'body')(
        isReady,
        // @ts-expect-error: wrong param type
        Symbol(),
      );
    });
  }
}

/**
 * Instantiate `T` to `string` and verify it's threaded through:
 *
 * hbs```
 * <MyComponent @value="hi">
 *   <:body as |isReady value|>
 *     Ready? {{value}}: {{isReady}}
 *   </:body>
 * </MyComponent>
 */
{
  const component = emitComponent(resolve(MyComponent)({ value: 'hi', ...NamedArgsMarker }));

  {
    const [isReady, value] = component.blockParams.body;
    expectTypeOf(isReady).toEqualTypeOf<boolean>();
    expectTypeOf(value).toEqualTypeOf<string>();

    emitContent(resolveOrReturn(value)());
    emitContent(resolveOrReturn(isReady)());
  }
}

/**
 * Instantiate `T` to `number` and verify it's threaded through:
 *
 * hbs```
 * <MyComponent @value={{123}}>
 *   <:body as |isReady value|>
 *     Ready? {{value}}: {{isReady}}
 *   </:body>
 * </MyComponent>
 */
{
  const component = emitComponent(resolve(MyComponent)({ value: 123, ...NamedArgsMarker }));

  {
    const [isReady, value] = component.blockParams.body;
    expectTypeOf(isReady).toEqualTypeOf<boolean>();
    expectTypeOf(value).toEqualTypeOf<number>();

    emitContent(resolveOrReturn(value)());
    emitContent(resolveOrReturn(isReady)());
  }
}

/**
 * Invoke the component inline, which is valid since it has no
 * required blocks.
 *
 * hbs```
 * {{MyComponent value=123}}
 * ```
 */
emitContent(resolve(MyComponent)({ value: 123, ...NamedArgsMarker }));

/**
 * Ensure we can invoke a maybe-undefined component.
 */
declare const MaybeMyComponent: typeof MyComponent | undefined;

emitComponent(resolve(MaybeMyComponent)({ value: 'hi', ...NamedArgsMarker }));

emitComponent(resolveOrReturn(MaybeMyComponent)({ value: 'hi', ...NamedArgsMarker }));

/**
 * Invoking an `any` or `unknown` component should error at the invocation site
 * if appropriate, but not produce cascading errors.
 */
{
  let anyComponent = emitComponent({} as any);
  let [anyComponentParam] = anyComponent.blockParams.default;

  expectTypeOf(anyComponent.element).toBeAny();
  expectTypeOf(anyComponentParam).toBeAny();

  // @ts-expect-error: unknown is an invalid component
  let unknownComponent = emitComponent({} as unknown);
  let [unknownComponentParam] = unknownComponent.blockParams['default'];

  expectTypeOf(unknownComponent.element).toBeAny();
  expectTypeOf(unknownComponentParam).toBeAny();
}

/**
 * Constrained type parameters can be tricky, and `expect-type` doesn't
 * work well with type assertions directly against them, but we can assert
 * against a property that the constraint dictates must exist to ensure
 * that we don't break or degrade them to `unknown` or `any` when used
 * in a template.
 */
export function testConstrainedTypeParameter<T extends { foo: 'bar' }>(value: T): void {
  let result = resolveOrReturn(value)();
  expectTypeOf(result.foo).toEqualTypeOf<'bar'>();
}

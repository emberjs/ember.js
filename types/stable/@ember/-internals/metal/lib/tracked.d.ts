declare module '@ember/-internals/metal/lib/tracked' {
  import type {
    ExtendedMethodDecorator,
    DecoratorPropertyDescriptor,
  } from '@ember/-internals/metal/lib/decorator';
  /**
      @decorator
      @private

      Marks a property as tracked.

      By default, a component's properties are expected to be static,
      meaning you are not able to update them and have the template update accordingly.
      Marking a property as tracked means that when that property changes,
      a rerender of the component is scheduled so the template is kept up to date.

      There are two usages for the `@tracked` decorator, shown below.

      @example No dependencies

      If you don't pass an argument to `@tracked`, only changes to that property
      will be tracked:

      ```typescript
      import Component from '@glimmer/component';
      import { tracked } from '@glimmer/tracking';

      export default class MyComponent extends Component {
        @tracked
        remainingApples = 10
      }
      ```

      When something changes the component's `remainingApples` property, the rerender
      will be scheduled.

      @example Dependents

      In the case that you have a computed property that depends other
      properties, you want to track both so that when one of the
      dependents change, a rerender is scheduled.

      In the following example we have two properties,
      `eatenApples`, and `remainingApples`.

      ```typescript
      import Component from '@glimmer/component';
      import { tracked } from '@glimmer/tracking';

      const totalApples = 100;

      export default class MyComponent extends Component {
        @tracked
        eatenApples = 0

        get remainingApples() {
          return totalApples - this.eatenApples;
        }

        increment() {
          this.eatenApples = this.eatenApples + 1;
        }
      }
      ```

      @param dependencies Optional dependents to be tracked.
    */
  export function tracked(propertyDesc: {
    value: any;
    initializer: () => any;
  }): ExtendedMethodDecorator;
  export function tracked(target: object, key: string): void;
  export function tracked(
    target: object,
    key: string,
    desc: DecoratorPropertyDescriptor
  ): DecoratorPropertyDescriptor;
  export class TrackedDescriptor {
    private _get;
    private _set;
    constructor(_get: () => unknown, _set: (value: unknown) => void);
    get(obj: object): unknown;
    set(obj: object, _key: string, value: unknown): void;
  }
}

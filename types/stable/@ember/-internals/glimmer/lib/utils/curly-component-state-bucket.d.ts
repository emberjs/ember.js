declare module '@ember/-internals/glimmer/lib/utils/curly-component-state-bucket' {
  import type { CapturedNamedArguments } from '@glimmer/interfaces';
  import type { Reference } from '@glimmer/reference';
  import type { Revision, Tag } from '@glimmer/validator';
  import type Component from '@ember/-internals/glimmer/lib/component';
  type Finalizer = () => void;
  /**
      @module ember
    */
  /**
      Represents the internal state of the component.

      @class ComponentStateBucket
      @private
    */
  export default class ComponentStateBucket {
    component: Component;
    args: CapturedNamedArguments | null;
    argsTag: Tag;
    finalizer: Finalizer;
    hasWrappedElement: boolean;
    isInteractive: boolean;
    classRef: Reference | null;
    rootRef: Reference<Component>;
    argsRevision: Revision;
    constructor(
      component: Component,
      args: CapturedNamedArguments | null,
      argsTag: Tag,
      finalizer: Finalizer,
      hasWrappedElement: boolean,
      isInteractive: boolean
    );
    willDestroy(): void;
    finalize(): void;
  }
  export {};
}

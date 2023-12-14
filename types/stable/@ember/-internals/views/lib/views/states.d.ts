declare module '@ember/-internals/views/lib/views/states' {
  import type Component from '@ember/component';
  export interface ViewState {
    enter?(view: Component): void;
    exit?(view: Component): void;
    appendChild(): void;
    handleEvent(view: Component, eventName: string, event: Event): boolean;
    rerender(view: Component): void;
    destroy(view: Component): void;
  }
  const states: Readonly<{
    preRender: Readonly<ViewState>;
    inDOM: Readonly<ViewState>;
    hasElement: Readonly<ViewState>;
    destroying: Readonly<ViewState>;
  }>;
  export default states;
}

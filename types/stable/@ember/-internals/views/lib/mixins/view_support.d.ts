declare module '@ember/-internals/views/lib/mixins/view_support' {
  import Mixin from '@ember/object/mixin';
  import type { SimpleElement } from '@simple-dom/interface';
  /**
     @class ViewMixin
     @namespace Ember
     @private
    */
  interface ViewMixin {
    rerender(): unknown;
    element: Element;
    appendTo(selector: string | Element | SimpleElement): this;
    append(): this;
    elementId: string | null;
    willInsertElement(): void;
    didInsertElement(): void;
    willClearRender(): void;
    willDestroyElement(): void;
    parentViewDidChange(): void;
    tagName: string | null;
    handleEvent(eventName: string, evt: Event): boolean;
  }
  const ViewMixin: Mixin;
  export default ViewMixin;
}

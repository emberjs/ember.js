import Mixin from '@ember/object/mixin';

interface ViewSupport {
  concatenatedProperties: string[];
  rerender(): unknown;
  element: Element;
  appendTo(selector: string | Element): this;
  append(): this;
  elementId: string | null;
  willInsertElement(): void;
  didInsertElement(): void;
  willClearRender(): void;
  willDestroyElement(): void;
  parentViewDidChange(): void;
  tagName: string | null;
  handleEvent(eventName: string, evt: unknown): unknown;
}
declare const ViewSupport: Mixin;

export default ViewSupport;

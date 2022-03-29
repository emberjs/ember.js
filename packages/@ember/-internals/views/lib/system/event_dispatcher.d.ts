import EmberObject from '@ember/object';

export default class EventDispatcher extends EmberObject {
  finalEventNameMapping: Record<string, string>;
  lazyEvents: Map<string, string>;
  setupHandlerForBrowserEvent(event: string): void;
  setupHandlerForEmberEvent(event: string): void;

  /** @private */
  setup(addedEvents: Record<string, string | null>, rootElement: string | Element | null): void;
}

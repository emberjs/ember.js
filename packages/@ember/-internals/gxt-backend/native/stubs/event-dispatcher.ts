// gxt NATIVE layer — alias target for
// `@ember/-internals/views/lib/system/event_dispatcher`.
//
// The classic EventDispatcher delegates DOM events to classic Component
// instances (`click() {}` handlers on curly components) — a documented legacy
// drop. Modern templates bind listeners directly (`{{on}}`, compiled by gxt to
// element listeners), so the native dispatcher is a NO-OP that keeps the
// Application boot contract: registered as `event_dispatcher:main`,
// `instanceof`-checked by ApplicationInstance, `setup(customEvents, root)`
// called once, destroyed with the container.
import EmberObject from '@ember/object';

export default class EventDispatcher extends EmberObject {
  setup(_addedEvents: Record<string, string | null>, _rootElement: string | Element | null): void {
    // intentionally empty: no delegated (classic-component) events in native
  }

  toString(): string {
    return '(EventDispatcher)';
  }
}

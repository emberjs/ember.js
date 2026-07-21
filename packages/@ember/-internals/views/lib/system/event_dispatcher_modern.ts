/*
  Build-level replacement for the EventDispatcher in variants without classic
  components. The dispatcher exists solely to invoke classic components'
  element event methods; modern code uses the {{on}} modifier. Registration
  and setup are compiled out behind the CLASSIC_COMPONENTS flag; this class
  remains because @ember/test-helpers instantiates a dispatcher when testing
  with a mock owner, where a no-op is the correct behavior.
*/
export default class EventDispatcher {
  static create(): EventDispatcher {
    return new this();
  }

  setup(_addedEvents?: unknown, _rootElement?: unknown) {}

  destroy() {}
}

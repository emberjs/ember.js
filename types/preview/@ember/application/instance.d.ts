declare module '@ember/application/instance' {
  import EngineInstance from '@ember/engine/instance';

  /**
   * The `ApplicationInstance` encapsulates all of the stateful aspects of a
   * running `Application`.
   */
  export default class ApplicationInstance extends EngineInstance {}
}

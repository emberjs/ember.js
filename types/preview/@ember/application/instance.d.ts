declare module '@ember/application/instance' {
  import EngineInstance from '@ember/engine/instance';
  import { SimpleElement } from '@simple-dom/interface';

  export interface BootOptions {
    isBrowser?: boolean;
    shouldRender?: boolean;
    document?: Document | null;
    rootElement?: string | Element | SimpleElement | null;
    location?: string | null;
    // Private?
    isInteractive?: boolean;
    _renderMode?: string;
  }

  /**
   * The `ApplicationInstance` encapsulates all of the stateful aspects of a
   * running `Application`.
   */
  export default class ApplicationInstance extends EngineInstance {}
}

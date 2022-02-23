import EngineInstance from '@ember/engine/instance';

export interface BootOptions {
  isBrowser?: boolean;
  shouldRender?: boolean;
  document?: Document | null;
  rootElement?: string | Element | null;
  location?: string | null;
  // Private?
  isInteractive?: boolean;
}

export default class ApplicationInstance extends EngineInstance {
  visit(url: string): Promise<this>;
}

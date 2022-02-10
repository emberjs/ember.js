import EngineInstance from '@ember/engine/instance';

export class BootOptions {
  isBrowser: boolean;
  shouldRender: boolean;
  document: Document | null;
  rootElement: string | Element | null;
  location: string | null;

  constructor(options?: {
    isBrowser?: boolean;
    shouldRender?: boolean;
    document?: Document;
    rootElement?: string | Element;
    location?: string;
    isInteractive?: boolean;
  });

  toEnvironment(): Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ApplicationInstance extends EngineInstance {}
declare class ApplicationInstance {}

export default ApplicationInstance;

import { EventDispatcher } from '@ember/-internals/views';
import Engine from '@ember/engine';
import { EngineInstanceOptions } from '@ember/engine/instance';
import ApplicationInstance, { BootOptions } from '../instance';

export default class Application extends Engine {
  rootElement: string | Element;
  eventDispatcher: EventDispatcher;
  customEvents: Record<string, string | null> | null;
  buildInstance(options?: EngineInstanceOptions): ApplicationInstance;
  deferReadiness(): void;
  advanceReadiness(): void;
  boot(): Promise<this>;
  ready(): void;
  reset(): void;
  visit(url: string, options?: BootOptions): Promise<ApplicationInstance>;
  /** @private */
  __deprecatedInstance__?: ApplicationInstance;
}

import EngineInstance, { EngineInstanceOptions } from './instance';
import { Namespace, RegistryProxyMixin } from '@ember/-internals/runtime';
import { Registry } from '@ember/-internals/container';

export { getEngineParent } from '@ember/engine/lib/engine-parent';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Engine extends RegistryProxyMixin {}
declare class Engine extends Namespace {
  static buildRegistry(engine: Engine): Registry;
  buildInstance(options?: EngineInstanceOptions): EngineInstance;
  initializer: (initializer: unknown) => void;
  instanceInitializer: (initializer: unknown) => void;
  Resolver: unknown | null;
}

export { Engine as default };

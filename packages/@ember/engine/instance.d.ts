import { ContainerProxyMixin, RegistryProxyMixin } from '@ember/-internals/runtime';
import { Owner } from '@ember/-internals/owner';
import { BootOptions } from '@ember/application/instance';
import EmberObject from '@ember/object';

export interface EngineInstanceOptions {
  mountPoint: string;
  routable: boolean;
}

interface EngineInstance extends RegistryProxyMixin, ContainerProxyMixin, Owner {}

declare class EngineInstance extends EmberObject {
  boot(options?: BootOptions): void;
  mountPoint: string;
  routable: boolean;
  buildChildEngineInstance(name: string, options?: EngineInstanceOptions): EngineInstance;
}

export default EngineInstance;

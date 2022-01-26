import { ContainerProxyMixin, RegistryProxyMixin } from '@ember/-internals/runtime';
import { Owner } from '@ember/-internals/owner';
import { BootOptions } from '@ember/application/instance';
import EmberObject from '@ember/object';

interface EngineInstance extends RegistryProxyMixin, ContainerProxyMixin, Owner {}

declare class EngineInstance extends EmberObject {
  init(...args: unknown[]): void;
  boot(options?: BootOptions): void;
  unregister(fullName: string): void;
}

export default EngineInstance;

import { getOwner as glimmerGetOwner, setOwner as glimmerSetOwner } from '@glimmer/owner';
import { TypeOptions } from '../container/lib/registry';

/**
@module @ember/application
*/

export { TypeOptions };

export interface FactoryClass {
  positionalParams?: string | string[] | undefined | null;
}

export interface Factory<T, C extends FactoryClass | object = FactoryClass> {
  class?: C;
  name?: string;
  fullName?: string;
  normalizedName?: string;
  create(props?: { [prop: string]: any }): T;
}

// A combination of the public methods on ContainerProxyMixin and RegistryProxyMixin
export interface Owner {
  // From ContainerProxy
  ownerInjection(): void;
  lookup(fullName: string, options?: TypeOptions): unknown;
  factoryFor(fullName: string): Factory<unknown> | undefined;

  // From RegistryProxy
  resolveRegistration<T, C>(fullName: string): Factory<T, C> | undefined;
  register(fullName: string, factory: Factory<unknown>, options?: TypeOptions): void;
  unregister(fullName: string): void;
  hasRegistration(fullName: string): boolean;
  registeredOption<K extends keyof TypeOptions>(
    fullName: string,
    optionName: K
  ): TypeOptions[K] | undefined;
  registerOptions(fullName: string, options: TypeOptions): void;
  registeredOptions(fullName: string): TypeOptions | undefined;
  registerOptionsForType(type: string, options: TypeOptions): void;
  registeredOptionsForType(type: string): TypeOptions | undefined;
}

/**
  Framework objects in an Ember application (components, services, routes, etc.)
  are created via a factory and dependency injection system. Each of these
  objects is the responsibility of an "owner", which handled its
  instantiation and manages its lifetime.

  `getOwner` fetches the owner object responsible for an instance. This can
  be used to lookup or resolve other class instances, or register new factories
  into the owner.

  For example, this component dynamically looks up a service based on the
  `audioType` passed as an argument:

  ```app/components/play-audio.js
  import Component from '@glimmer/component';
  import { action } from '@ember/object';
  import { getOwner } from '@ember/application';

  // Usage:
  //
  //   <PlayAudio @audioType={{@model.audioType}} @audioFile={{@model.file}}/>
  //
  export default class extends Component {
    get audioService() {
      let owner = getOwner(this);
      return owner.lookup(`service:${this.args.audioType}`);
    }

    @action
    onPlay() {
      let player = this.audioService;
      player.play(this.args.audioFile);
    }
  }
  ```

  @method getOwner
  @static
  @for @ember/application
  @param {Object} object An object with an owner.
  @return {Object} An owner object.
  @since 2.3.0
  @public
*/
export function getOwner(object: any): Owner | undefined {
  return glimmerGetOwner(object);
}

/**
  `setOwner` forces a new owner on a given object instance. This is primarily
  useful in some testing cases.

  @method setOwner
  @static
  @for @ember/application
  @param {Object} object An object instance.
  @param {Object} object The new owner object of the object instance.
  @since 2.3.0
  @public
*/
export function setOwner(object: any, owner: Owner): void {
  glimmerSetOwner(object, owner);
}

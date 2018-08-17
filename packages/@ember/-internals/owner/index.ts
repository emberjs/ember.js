/**
@module @ember/application
*/

export interface LookupOptions {
  singleton?: boolean;
  instantiate?: boolean;
  source?: string;
  namespace?: string;
}

export interface FactoryClass {
  positionalParams?: string | string[] | undefined | null;
}

export interface Factory<T, C extends FactoryClass | object = FactoryClass> {
  class?: C;
  fullName?: string;
  normalizedName?: string;
  create(props?: { [prop: string]: any }): T;
}

export interface Owner {
  lookup<T>(fullName: string, options?: LookupOptions): T;
  lookup(fullName: string, options?: LookupOptions): any;
  factoryFor<T, C>(fullName: string, options?: LookupOptions): Factory<T, C> | undefined;
  factoryFor(fullName: string, options?: LookupOptions): Factory<any, any> | undefined;
  buildChildEngineInstance<T>(name: string): T;
  hasRegistration(name: string, options?: LookupOptions): boolean;
}

import { symbol } from '@ember/-internals/utils';

export const OWNER = symbol('OWNER');

/**
  Framework objects in an Ember application (components, services, routes, etc.)
  are created via a factory and dependency injection system. Each of these
  objects is the responsibility of an "owner", which handled its
  instantiation and manages its lifetime.

  `getOwner` fetches the owner object responsible for an instance. This can
  be used to lookup or resolve other class instances, or register new factories
  into the owner.

  For example, this component dynamically looks up a service based on the
  `audioType` passed as an attribute:

  ```app/components/play-audio.js
  import Component from '@ember/component';
  import { computed } from '@ember/object';
  import { getOwner } from '@ember/application';

  // Usage:
  //
  //   {{play-audio audioType=model.audioType audioFile=model.file}}
  //
  export default Component.extend({
    audioService: computed('audioType', function() {
      let owner = getOwner(this);
      return owner.lookup(`service:${this.get('audioType')}`);
    }),

    click() {
      let player = this.get('audioService');
      player.play(this.get('audioFile'));
    }
  });
  ```

  @method getOwner
  @static
  @for @ember/application
  @param {Object} object An object with an owner.
  @return {Object} An owner object.
  @since 2.3.0
  @public
*/
export function getOwner(object: any): Owner {
  return object[OWNER];
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
  object[OWNER] = owner;
}

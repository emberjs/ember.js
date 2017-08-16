/**
@module ember
@submodule ember-runtime
*/

import symbol from './symbol';

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
  @for Ember
  @param {Object} object An object with an owner.
  @return {Object} An owner object.
  @since 2.3.0
  @public
*/
export function getOwner(object) {
  return object[OWNER];
}

/**
  `setOwner` forces a new owner on a given object instance. This is primarily
  useful in some testing cases.

  @method setOwner
  @for Ember
  @param {Object} object An object instance.
  @param {Object} object The new owner object of the object instance.
  @since 2.3.0
  @public
*/
export function setOwner(object, owner) {
  object[OWNER] = owner;
}

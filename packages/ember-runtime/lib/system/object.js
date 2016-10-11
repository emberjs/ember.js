/**
@module ember
@submodule ember-runtime
*/

import CoreObject from './core_object';
import Observable from '../mixins/observable';

/**
  `Ember.Object` is the main base class for all Ember objects. It is a subclass
  of `Ember.CoreObject` with the `Ember.Observable` mixin applied. For details,
  see the documentation for each of these.

  @class Object
  @namespace Ember
  @extends Ember.CoreObject
  @uses Ember.Observable
  @public
*/
const EmberObject = CoreObject.extend(Observable);
EmberObject.toString = () => 'Ember.Object';

export default EmberObject;

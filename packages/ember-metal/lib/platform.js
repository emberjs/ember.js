import {
  hasES5CompliantDefineProperty,
  defineProperty
} from 'ember-metal/platform/define_property';
import defineProperties from 'ember-metal/platform/define_properties';
import create from 'ember-metal/platform/create';

/**
@module ember-metal
*/

var hasPropertyAccessors = hasES5CompliantDefineProperty;
var canDefineNonEnumerableProperties = hasES5CompliantDefineProperty;

/**
  Platform specific methods and feature detectors needed by the framework.

  @class platform
  @namespace Ember
  @static
*/

export {
  create,
  defineProperty,
  defineProperties,
  hasPropertyAccessors,
  canDefineNonEnumerableProperties
};


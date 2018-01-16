import { Mixin } from 'ember-metal';

/**
@module ember
*/

/**
  The methods in this mixin have been moved to MutableArray. This mixin has
  been intentionally preserved to avoid breaking Enumerable.detect checks
  until the community migrates away from them.

  @class Enumerable
  @namespace Ember
  @private
*/
export default Mixin.create();

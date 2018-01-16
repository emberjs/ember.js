import Enumerable from './enumerable';
import { Mixin } from 'ember-metal';

/**
@module ember
*/

/**
  The methods in this mixin have been moved to MutableArray. This mixin has
  been intentionally preserved to avoid breaking MutableEnumerable.detect
  checks until the community migrates away from them.

  @class MutableEnumerable
  @namespace Ember
  @uses Enumerable
  @private
*/
export default Mixin.create(Enumerable);

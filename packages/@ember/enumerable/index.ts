import Mixin from '@ember/object/mixin';

/**
@module @ember/enumerable
@private
*/

/**
  The methods in this mixin have been moved to [MutableArray](/ember/release/classes/MutableArray). This mixin has
  been intentionally preserved to avoid breaking Enumerable.detect checks
  until the community migrates away from them.

  @class Enumerable
  @private
*/
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Enumerable {}
const Enumerable = Mixin.create();

export default Enumerable;

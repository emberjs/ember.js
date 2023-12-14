import Mixin from '@ember/object/mixin';
const Comparable = Mixin.create({
  /**
    __Required.__ You must implement this method to apply this mixin.
       Override to return the result of the comparison of the two parameters. The
    compare method should return:
       - `-1` if `a < b`
    - `0` if `a == b`
    - `1` if `a > b`
       Default implementation raises an exception.
       @method compare
    @param a {Object} the first object to compare
    @param b {Object} the second object to compare
    @return {Number} the result of the comparison
    @private
  */
  compare: null
});
export default Comparable;
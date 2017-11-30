import { Suite } from './suite';

const CopyableTests = Suite.extend({

  /*
    __Required.__ You must implement this method to apply this mixin.

    Must be able to create a new object for testing.

    @returns {Object} object
  */
  newObject: null,

  /*
    __Required.__ You must implement this method to apply this mixin.

    Compares the two passed in objects.  Returns true if the two objects
    are logically equivalent.

    @param {Object} a
      First object

    @param {Object} b
      Second object

    @returns {Boolean}
  */
  isEqual: null

});

import copyTests from './copyable/copy';

CopyableTests.importModuleTests(copyTests);

export default CopyableTests;

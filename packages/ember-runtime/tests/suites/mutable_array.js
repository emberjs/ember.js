import { ArrayTests } from 'ember-runtime/tests/suites/array';

import insertAtTests from 'ember-runtime/tests/suites/mutable_array/insertAt';
import popObjectTests from 'ember-runtime/tests/suites/mutable_array/popObject';
import pushObjectTests from 'ember-runtime/tests/suites/mutable_array/pushObject';
import pushObjectsTest from 'ember-runtime/tests/suites/mutable_array/pushObjects';
import removeAtTests from 'ember-runtime/tests/suites/mutable_array/removeAt';
import replaceTests from 'ember-runtime/tests/suites/mutable_array/replace';
import shiftObjectTests from 'ember-runtime/tests/suites/mutable_array/shiftObject';
import unshiftObjectTests from 'ember-runtime/tests/suites/mutable_array/unshiftObject';
import reverseObjectsTests from 'ember-runtime/tests/suites/mutable_array/reverseObjects';

var MutableArrayTests = ArrayTests.extend();
MutableArrayTests.importModuleTests(insertAtTests);
MutableArrayTests.importModuleTests(popObjectTests);
MutableArrayTests.importModuleTests(pushObjectTests);
MutableArrayTests.importModuleTests(pushObjectsTest);
MutableArrayTests.importModuleTests(removeAtTests);
MutableArrayTests.importModuleTests(replaceTests);
MutableArrayTests.importModuleTests(shiftObjectTests);
MutableArrayTests.importModuleTests(unshiftObjectTests);
MutableArrayTests.importModuleTests(reverseObjectsTests);

export default MutableArrayTests;

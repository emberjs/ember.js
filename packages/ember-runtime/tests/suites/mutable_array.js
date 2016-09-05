import { ArrayTests } from './array';

import insertAtTests from './mutable_array/insertAt';
import popObjectTests from './mutable_array/popObject';
import pushObjectTests from './mutable_array/pushObject';
import pushObjectsTest from './mutable_array/pushObjects';
import removeAtTests from './mutable_array/removeAt';
import replaceTests from './mutable_array/replace';
import shiftObjectTests from './mutable_array/shiftObject';
import unshiftObjectTests from './mutable_array/unshiftObject';
import reverseObjectsTests from './mutable_array/reverseObjects';

const MutableArrayTests = ArrayTests.extend();
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

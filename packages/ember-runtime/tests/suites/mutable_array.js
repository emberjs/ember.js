import { ArrayTests } from './array';

import removeAtTests from './mutable_array/removeAt';
import replaceTests from './mutable_array/replace';
import shiftObjectTests from './mutable_array/shiftObject';
import unshiftObjectTests from './mutable_array/unshiftObject';
import reverseObjectsTests from './mutable_array/reverseObjects';

const MutableArrayTests = ArrayTests.extend();
MutableArrayTests.importModuleTests(removeAtTests);
MutableArrayTests.importModuleTests(replaceTests);
MutableArrayTests.importModuleTests(shiftObjectTests);
MutableArrayTests.importModuleTests(unshiftObjectTests);
MutableArrayTests.importModuleTests(reverseObjectsTests);

export default MutableArrayTests;

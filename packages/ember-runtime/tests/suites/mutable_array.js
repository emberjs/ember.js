import { ArrayTests } from './array';

import shiftObjectTests from './mutable_array/shiftObject';
import unshiftObjectTests from './mutable_array/unshiftObject';

const MutableArrayTests = ArrayTests.extend();
MutableArrayTests.importModuleTests(shiftObjectTests);
MutableArrayTests.importModuleTests(unshiftObjectTests);

export default MutableArrayTests;

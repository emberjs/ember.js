import { EnumerableTests } from './enumerable';

import addObjectTests from './mutable_enumerable/addObject';
import removeObjectTests from './mutable_enumerable/removeObject';
import removeObjectsTests from './mutable_enumerable/removeObjects';

const MutableEnumerableTests = EnumerableTests.extend();
MutableEnumerableTests.importModuleTests(addObjectTests);
MutableEnumerableTests.importModuleTests(removeObjectTests);
MutableEnumerableTests.importModuleTests(removeObjectsTests);

export default MutableEnumerableTests;

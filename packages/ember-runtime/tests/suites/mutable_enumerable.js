import { EnumerableTests } from 'ember-runtime/tests/suites/enumerable';

import addObjectTests from 'ember-runtime/tests/suites/mutable_enumerable/addObject';
import removeObjectTests from 'ember-runtime/tests/suites/mutable_enumerable/removeObject';
import removeObjectsTests from 'ember-runtime/tests/suites/mutable_enumerable/removeObjects';

var MutableEnumerableTests = EnumerableTests.extend();
MutableEnumerableTests.importModuleTests(addObjectTests);
MutableEnumerableTests.importModuleTests(removeObjectTests);
MutableEnumerableTests.importModuleTests(removeObjectsTests);

export default MutableEnumerableTests;

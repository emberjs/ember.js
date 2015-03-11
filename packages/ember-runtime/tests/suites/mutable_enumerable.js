import { EnumerableTests } from 'ember-runtime/tests/suites/enumerable';

import addObjectTests from 'ember-runtime/tests/suites/mutable_enumerable/addObject';
import addObjectsTests from 'ember-runtime/tests/suites/mutable_enumerable/addObjects';
import removeObjectTests from 'ember-runtime/tests/suites/mutable_enumerable/removeObject';
import removeObjectsTests from 'ember-runtime/tests/suites/mutable_enumerable/removeObjects';

var MutableEnumerableTests = EnumerableTests.extend();
MutableEnumerableTests.importModuleTests(addObjectTests);
MutableEnumerableTests.importModuleTests(addObjectsTests);
MutableEnumerableTests.importModuleTests(removeObjectTests);
MutableEnumerableTests.importModuleTests(removeObjectsTests);

export default MutableEnumerableTests;

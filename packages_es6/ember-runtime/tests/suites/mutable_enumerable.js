import {EnumerableTests, ObserverClass} from 'ember-runtime/tests/suites/enumerable';

import addObjectTests from 'ember-runtime/tests/suites/mutable_enumerable/addObject';
import removeObjectTests from 'ember-runtime/tests/suites/mutable_enumerable/removeObject';

var MutableEnumerableTests = EnumerableTests.extend();
MutableEnumerableTests.importModuleTests(addObjectTests);
MutableEnumerableTests.importModuleTests(removeObjectTests);

export default MutableEnumerableTests;

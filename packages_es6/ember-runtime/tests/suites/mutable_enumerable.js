import {EnumerableTests, ObserverClass} from 'ember-runtime/tests/suites/enumerable';

var MutableEnumerableTests = EnumerableTests.extend();

import addObjectTests from 'ember-runtime/tests/suites/mutable_enumerable/addObject';
import removeObjectTests from 'ember-runtime/tests/suites/mutable_enumerable/removeObject';

export default MutableEnumerableTests;

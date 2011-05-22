// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime/~tests/suites/array');

SC.MutableArrayTests = SC.ArrayTests.extend();

require('./mutable_array/insertAt');
require('./mutable_array/popObject');
require('./mutable_array/pushObject');
require('./mutable_array/removeAt');
require('./mutable_array/replace');
require('./mutable_array/shiftObject');
require('./mutable_array/unshiftObject');

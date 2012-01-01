// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/array');

Ember.MutableArrayTests = Ember.ArrayTests.extend();

require('ember-runtime/~tests/suites/mutable_array/insertAt');
require('ember-runtime/~tests/suites/mutable_array/popObject');
require('ember-runtime/~tests/suites/mutable_array/pushObject');
require('ember-runtime/~tests/suites/mutable_array/removeAt');
require('ember-runtime/~tests/suites/mutable_array/replace');
require('ember-runtime/~tests/suites/mutable_array/shiftObject');
require('ember-runtime/~tests/suites/mutable_array/unshiftObject');

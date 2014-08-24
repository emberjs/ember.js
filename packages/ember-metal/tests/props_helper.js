import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';

// used by unit tests to test both accessor mode and non-accessor mode
export default function(testname, callback) {
  test(testname+' using Ember.get()/Ember.set()', function() {
    callback(get, set);
  });

  // test(testname+' using accessors', function() {
  //   if (Ember.USES_ACCESSORS) callback(aget, aset);
  //   else ok('SKIPPING ACCESSORS');
  // });
}

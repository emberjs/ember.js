// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('Ember.MixinDelegate');

test('Basic usage', function() {
  var obj = {};
  Ember.mixin(obj, Ember.MixinDelegate, {
       
    foo: 'BAR',
     
    willApplyProperty: function(keyName) {
      if (keyName === 'foo') {
        this._before = [keyName, Ember.get(this, keyName)];
      }
    },
    
    didApplyProperty: function(keyName) {
      if (keyName === 'foo') {
        this._after = [keyName, Ember.get(this, keyName)];
      }
    }
  });
  
  ok(Ember.MixinDelegate.detect(obj), 'should have PropMixinDelegate applied');
  ok(!!obj._before, 'should have called with props');
  ok(!!obj._after,  'should have called with props');

  Ember.mixin(obj, { foo: 'FOO' });
  same(obj._before, ['foo', 'BAR'], 'should have called before apply');
  same(obj._after,  ['foo', 'FOO'], 'should have called after apply');
  
});

test('Only invokes callbacks once mixin is applied', function() {
  var obj = {};
  
  // NOTE: does not apply mixin
  Ember.mixin(obj, Ember.MixinDelegate, {
    foo: 'BAR',

    _before: null, 
    _after: null,
    
    willApplyProperty: function(keyName, desc) {
      this._before = Ember.get(this, keyName);
    },
    
    didApplyProperty: function(keyName, desc) {
      this._after = Ember.get(this, keyName);
    }
  });
  
  Ember.mixin(obj, { foo: 'FOO' });
  equals(obj._before, 'BAR', 'should not have called yet');
  equals(obj._after,  'FOO', 'should not have called yet');
  
});


// test('Uses existing callbacks until mixin applied', function() {
//   var obj = {};
//   Ember.mixin(obj, Ember.Accessors);
//   Ember.mixin(obj, Ember.MixinDelegate, {
//     
//     _before: null, 
//     _after: null,
// 
//     willApplyProperty: function(keyName, desc) {
//       if (!this._before) this._before = {};
//       this._before[keyName] = this.get(keyName);
//       this._super(keyName, desc);
//     },
//     
//     didApplyProperty: function(keyName, desc) {
//       if (!this._after) this._after = {};
//       this._after[keyName] = this.get(keyName);
//       this._super(keyName, desc);
//     },
//     
//     foo: 'FOO'
//   });
//   
//   ok(!!obj._before, 'should have invoked willApply yet');
//   ok(!!obj._after, 'should have invoked didApply yet');  
//   obj._before = obj._after = null;
//   
//   var secondBefore, secondAfter;
//   
//   Ember.mixin(obj, { 
//     
//     willApplyProperty: function(keyName, desc) {
//       if (!secondBefore) secondBefore = {};
//       secondBefore[keyName] = true;
//       this._super(keyName, desc);
//     },
// 
//     didApplyProperty: function(keyName, desc) {
//       if (!secondAfter) secondAfter = {};
//       secondAfter[keyName] = true;
//       this._super(keyName, desc);
//     },
//     
//     bar: 'BAR'
//     
//   });
// 
//   ['willApplyProperty', 'didApplyProperty', 'bar'].forEach(function(key) {
//     ok(key in obj._before, 'should have called first willApply for '+key);
//     ok(key in obj._after, 'should have called first didApply for '+key);
//     ok(key in secondBefore, 'should have called second willApply for '+key);
//     ok(key in secondAfter, 'should have called second didApply for '+key);
//   });
//   
//   
//   // Third mixin...
//   Ember.mixin(obj, { baz: 'BAZ' });
// 
//   ok('baz' in obj._before, 'should have called first willApply');
//   ok('baz' in obj._after, 'should have called first didApply');
//   ok('baz' in secondBefore, 'should have called second willApply');
//   ok('baz' in secondAfter, 'should have called second didApply');
//   
// });

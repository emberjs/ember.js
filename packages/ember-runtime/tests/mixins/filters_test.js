module('mixins/filters');

var FilterTestResults = Ember.Mixin.create({
  beforeArgs: null,
  afterArgs: null,
  beforeAnyArgs: null,
  afterAnyArgs: null
});

var TestFiltersWithBefore = Ember.Object.extend(Ember.Filters, FilterTestResults, {
  setup: function(opts) {
    this.fbefore('setup', this, arguments);
    return this;
  },
  fbeforeSetup: function(args) {
    console.log('beforeSetup called with', args);
    this.set('beforeArgs', args);
  }
});

var TestFiltersWithoutBefore = Ember.Object.extend(Ember.Filters, FilterTestResults, {
  setup: function(opts) {
    this.fbefore('setup', this, arguments);
    return this;
  }
});

var TestFiltersWithAfter = Ember.Object.extend(Ember.Filters, FilterTestResults, {
  setup: function(opts) {
    this.fafter('setup', this, arguments);
    return this;
  },
  fafterSetup: function(args) {
    console.log('afterSetup called with', args);
    this.set('afterArgs', args);
  }
});

var TestFiltersWithoutAfter = Ember.Object.extend(Ember.Filters, FilterTestResults, {
  setup: function(opts) {
    this.fafter('setup', this, arguments);
    return this;
  }
});

var TestFiltersWithAnyAfter = Ember.Object.extend(Ember.Filters, FilterTestResults, {
  setup: function(opts) {
    this.fafter('setup', this, arguments);
    return this;
  },

  fafterAnyMethod: function(args) {
    console.log('fafterAnyMethod called with', args);
    this.set('afterAnyArgs', args);
  }
});

var TestFiltersWithAnyBefore = Ember.Object.extend(Ember.Filters, FilterTestResults, {
  setup: function(opts) {
    this.fbefore('setup', this, arguments);
    return this;
  },

  fbeforeAnyMethod: function(args) {
    console.log('fbeforeAnyMethod called with', args);
    this.set('beforeAnyArgs', args);
  }
});


test('should filter before when it has matching before filter', function() {
  var filterer   = TestFiltersWithBefore.create();
  filterer.setup('hello');

  notEqual(filterer.get('beforeArgs'), null, 'beforeArgs should be set by beforeSetup filter' );

  var beforeArgs = filterer.get('beforeArgs');

  if (beforeArgs) {
    equal("hello", beforeArgs[0]);
  }
});

test('should not filter before when it has no matching before filter', function() {
  var filterer   = TestFiltersWithoutBefore.create();
  filterer.setup('hello');

  equal(null, filterer.get('beforeArgs'), 'beforeArgs should not be set since no beforeSetup filter defined' );
});

test('should filter after when it has matching after filter', function() {
  var filterer   = TestFiltersWithAfter.create();
  filterer.setup('bye');

  notEqual(null, filterer.get('afterArgs'), 'afterArgs should be set by afterSetup filter' );

  var afterArgs = filterer.get('afterArgs');

  if (afterArgs) {  
    equal("bye", afterArgs[0], 'should set afterArgs to bye');
  }
});

test('should not filter after when it has no matching after filter', function() {
  var filterer   = TestFiltersWithoutAfter.create();
  filterer.setup('bye');

  equal(null, filterer.get('afterArgs'), 'afterArgs should not be set since no afterSetup filter defined' );
});

// AnyMethod filters

test('should filter after when it has an afterAnyMethod filter', function() {
  var filterer   = TestFiltersWithAnyAfter.create();
  filterer.setup('bye');

  equal(null, filterer.get('afterArgs'), 'afterArgs should not be set by afterSetup filter' );

  var afterAnyArgs = filterer.get('afterAnyArgs');

  if (afterAnyArgs) {  
    equal("setup", afterAnyArgs[0], 'should set afterAnyArgs[0] to setup');
    equal("bye", afterAnyArgs[0], 'should set afterAnyArgs[1] to bye');
  }
});


test('should filter after when it has matching after filter', function() {
  var filterer   = TestFiltersWithAnyBefore.create();
  filterer.setup('hello');

  equal(null, filterer.get('beforeArgs'), 'beforeArgs should not be set by beforeSetup filter' );

  var beforeAnyArgs = filterer.get('beforeAnyArgs');

  if (beforeAnyArgs) {  
    equal("setup", beforeAnyArgs[0], 'should set beforeAnyArgs[0] to setup');
    equal("hello", beforeAnyArgs[1], 'should set beforeAnyArgs[1] to hello');
  }
});

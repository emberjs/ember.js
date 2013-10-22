var getPath = Ember.getPathWithoutDeprecation;

var originalFlag, originalWarn, warnings;

var TakesOneArgView = Ember.View.extend().reopenClass({
  create: function(attrs) {
    var instance = this._super.apply(this, arguments);
    instance.set('createdWith', [].slice.call(arguments));
    return instance;
  }
});

var TakesTwoArgsView = Ember.View.extend().reopenClass({
  create: function(coreAttrs, attrs) {
    var instance = this._super.apply(this, arguments);
    instance.set('createdWith', [].slice.call(arguments));
    return instance;
  }
});

module("Backported Ember.View#createChildView behavior", {
  setup: function() {
    originalFlag = Ember.ENV.CREATE_CHILD_VIEW;
    originalWarn = Ember.Logger.warn;
    warnings = [];
    Ember.Logger.warn = function(msg) {
      warnings.push(msg.replace("WARNING: ", ""));
    };
  },
  teardown: function() {
    Ember.ENV.CREATE_CHILD_VIEW = originalFlag;
    Ember.Logger.warn = originalWarn;
  }
});

// Ember.ENV.CREATE_CHILD_VIEW = null

test("passes two arguments to create in 0.9 mode", function() {
  Ember.ENV.CREATE_CHILD_VIEW = null;
  var view = Ember.ContainerView.create().createChildView(TakesOneArgView, { food: 'ramen' });
  equal(getPath(view, 'createdWith.length'), 2);
});

test("does not warn when create expects multiple arguments in 0.9 mode", function() {
  Ember.ENV.CREATE_CHILD_VIEW = null;
  var view = Ember.ContainerView.create().createChildView(TakesTwoArgsView, { food: 'ramen' });
  equal(getPath(view, 'food'), 'ramen');
  equal(warnings.length, 0);
});

// Ember.ENV.CREATE_CHILD_VIEW = "warn"

test("passes two arguments to create in warn mode", function() {
  Ember.ENV.CREATE_CHILD_VIEW = 'warn';
  var view = Ember.ContainerView.create().createChildView(TakesOneArgView, { food: 'ramen' });
  equal(getPath(view, 'createdWith.length'), 2);
});

test("pre-merges the second argument into the first in warn mode", function() {
  Ember.ENV.CREATE_CHILD_VIEW = 'warn';
  var view = Ember.ContainerView.create().createChildView(TakesOneArgView, { food: 'ramen' });
  var firstArg = getPath(view, 'createdWith')[0];
  equal(firstArg.food, 'ramen');
  ok(firstArg._parentView);
});

test("does not warn when create expects only one argument in warn mode", function() {
  Ember.ENV.CREATE_CHILD_VIEW = 'warn';
  var view = Ember.ContainerView.create().createChildView(TakesOneArgView, { food: 'ramen' });
  equal(getPath(view, 'food'), 'ramen');
  equal(warnings.length, 0);
});

test("warns when create expects multiple arguments in warn mode", function() {
  Ember.ENV.CREATE_CHILD_VIEW = 'warn';
  var view = Ember.ContainerView.create().createChildView(TakesTwoArgsView, { food: 'ramen' });
  equal(getPath(view, 'food'), 'ramen');
  equal(warnings.length, 1);
});

// Ember.ENV.CREATE_CHILD_VIEW = "1.0"

test("does not throw an error when create expects only one argument in 1.0 mode", function() {
  Ember.ENV.CREATE_CHILD_VIEW = '1.0';
  var view = Ember.ContainerView.create().createChildView(TakesOneArgView, { food: 'ramen' });
  equal(getPath(view, 'food'), 'ramen');
});

test("throws an error when create expects multiple arguments in 1.0 mode", function() {
  Ember.ENV.CREATE_CHILD_VIEW = '1.0';
  var containerView = Ember.ContainerView.create();
  raises(function() {
    containerView.createChildView(TakesTwoArgsView, { food: 'ramen' });
    new Ember.Binding('foo.value', 'bar.value').transform({ from: function() {}, to: function() {} });
  }, /createChildView will pass only one argument.*in Ember 1.0/);
});

test("passes only one merged argument in 1.0 mode", function() {
  Ember.ENV.CREATE_CHILD_VIEW = '1.0';
  var view = Ember.ContainerView.create().createChildView(TakesOneArgView);
  equal(getPath(view, 'createdWith.length'), 1);
});

test("it doesn't override templateData when merging in 1.0 mode", function() {
  Ember.ENV.CREATE_CHILD_VIEW = '1.0';
  var parentView = Ember.ContainerView.create({ templateData: { food: 'sushi '} });
  var view = parentView.createChildView(TakesOneArgView, { templateData: { food: 'ramen' } });
  equal(getPath(view, 'templateData.food'), 'ramen');
});

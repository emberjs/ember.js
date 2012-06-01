// ==========================================================================
// Project:   Ember Views
// Copyright: ©2006-2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var view, view1, view2, App1, App2;

var append = function(view, app) {
  Ember.run(function() {
    view.append(app);
  });
  return view;
};

module('Ember.View#append', {
  setup: function() {
    Ember.$("#qunit-fixture").html('<div id="app1"></div><div id="app2" ></div>');

    Ember.run(function() {
      App1 = Ember.Application.create({ rootElement: '#app1' });
      App2 = Ember.Application.create({ rootElement: '#app2' });

      App1.View1 = Ember.View.extend();
      App2.View2 = Ember.View.extend();

      view = Ember.View.create({ elementId: 'view' });
      view1 = App1.view1 = Ember.View.create({ elementId: 'view1' });
      view2 = App2.view2 = Ember.View.create({ elementId: 'view2' });
    });
  },

  teardown: function() {
    Ember.run(function() {
      view.destroy();
      view1.destroy();
      view2.destroy();

      App1.destroy();
      App2.destroy();
    });
  }
});

test("append adds the view to the applications rootElement", function() {
  append(App1.view1);
  append(App2.view2);
  
  ok(Ember.$('#qunit-fixture').find('#app1 #view1').length === 1, 'App1.view1 is added to rootElement of it\'s App1');
  ok(Ember.$('#qunit-fixture').find('#app2 #view2').length === 1, 'App2.view2 is added to rootElement of it\'s App2');
});

test("an instance of a view class, is added to the applications's rootElement", function() {
  var v1 = append(App1.View1.create({ elementId: 'View1' }));
  var v2 = append(App2.View2.create({ elementId: 'View2' }));
  
  ok(Ember.$('#qunit-fixture').find('#app1 #View1').length === 1, 'instance of App1.View1 is added to rootElement of it\'s App1');
  ok(Ember.$('#qunit-fixture').find('#app2 #View2').length === 1, 'instance of App2.View2 is added to rootElement of it\'s App2');

  Ember.run(function() {
    v1.destroy();
    v2.destroy();
  });
});

test("a view, which is not a property of an application, is added to the first available application", function() {
  append(view);
  
  ok(Ember.$('#qunit-fixture').find('#app1 #view').length === 1, 'view is added to rootElement of it\'s App1');
});

test("append accepts a parameter application", function() {
  append(view, App2);

  ok(Ember.$('#qunit-fixture').find('#app2 #view').length === 1, 'view is added to rootElement of application parameter');
});

test("an error is thrown if passed parameter is not an instance of Ember.Application", function() {
  raises(function() {
    append(view, Ember.Object.create());
  }, Error, 'should raise an error when parameter to append is not an instance of Ember.Application');
});

test("case App.view - appending a view instance to another application throws an error", function() {
  raises(function() {
    append(App1.view1, App2);
  }, Error, 'should raise an error when view instance of an application shall be appended to another application');
});

test("case App.View - appending a view instance to another application throws an error", function() {
  raises(function() {
    append(App1.View1.create(), App2);
  }, Error, 'should raise an error when view instance of an application shall be appended to another application');
});

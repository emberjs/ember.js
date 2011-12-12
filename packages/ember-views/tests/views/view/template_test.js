// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = Ember.set, get = Ember.get;

module("Ember.View - Template Functionality");

test("should call the function of the associated template", function() {
  var view;

  view = Ember.View.create({
    templateName: 'test_template',

    templates: Ember.Object.create({
      test_template: function(dataSource) {
        return "<h1 id='twas-called'>template was called</h1>";
      }
    })
  });

  view.createElement();

  ok(view.$('#twas-called').length, "the named template was called");
});

test("should call the function of the associated template with itself as the context", function() {
  var view;

  view = Ember.View.create({
    templateName: 'test_template',

    personName: "Tom DAAAALE",

    templates: Ember.Object.create({
      test_template: function(dataSource) {
        return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>";
      }
    })
  });

  view.createElement();

  equals("template was called for Tom DAAAALE", view.$('#twas-called').text(), "the named template was called with the view as the data source");
});

test("should fall back to defaultTemplate if neither template nor templateName are provided", function() {
  var View, view;

  View = Ember.View.extend({
    defaultTemplate: function(dataSource) { return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>"; }
  });

  view = View.create({
    personName: "Tom DAAAALE"
  });

  view.createElement();

  equals("template was called for Tom DAAAALE", view.$('#twas-called').text(), "the named template was called with the view as the data source");
});

test("should not use defaultTemplate if template is provided", function() {
  var View, view;

  View = Ember.View.extend({
    template:  function() { return "foo"; },
    defaultTemplate: function(dataSource) { return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>"; }
  });

  view = View.create();
  view.createElement();

  equals("foo", view.$().text(), "default template was not printed");
});

test("should not use defaultTemplate if template is provided", function() {
  var View, view;

  View = Ember.View.extend({
    templateName: 'foobar',
    templates: Ember.Object.create({
      foobar: function() { return "foo"; }
    }),
    defaultTemplate: function(dataSource) { return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>"; }
  });

  view = View.create();
  view.createElement();

  equals("foo", view.$().text(), "default template was not printed");
});


test("should render an empty element if no template is specified", function() {
  var view;
  view = Ember.View.create();
  view.createElement();

  equals(view.$().html(), '', "view div should be empty");
});

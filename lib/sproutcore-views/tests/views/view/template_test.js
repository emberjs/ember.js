// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
module("SC.View - Template Functionality");

test("should call the function of the associated template", function() {
  var view;

  view = SC.View.create({
    templateName: 'test_template',

    templates: SC.Object.create({
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

  view = SC.View.create({
    templateName: 'test_template',

    personName: "Tom DAAAALE",

    templates: SC.Object.create({
      test_template: function(dataSource) {
        return "<h1 id='twas-called'>template was called for " + dataSource.get('personName') + "</h1>";
      }
    })
  });

  view.createElement();

  equals("template was called for Tom DAAAALE", view.$('#twas-called').text(), "the named template was called with the view as the data source");
});

test("should render an empty element if no template is specified", function() {
  var view;
  view = SC.View.create();
  view.createElement();

  equals(view.$().html(), '', "view div should be empty");
});

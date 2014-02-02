// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
module("SC.TemplateView", {
  setup: function() {
    // var view = SC.TemplateView.create();
  },

  teardown: function() {

  }
});

test("template view should call the function of the associated template", function() {
  var view;

  view = SC.TemplateView.create({
    templateName: 'test_template',

    templates: SC.Object.create({
      test_template: function(dataSource) {
        return "<h1 id='twas-called'>template was called</h1>";
      }
    })
  });

  view.createLayer();

  ok(view.$('#twas-called').length, "the named template was called");
});

test("template view should call the function of the associated template with itself as the context", function() {
  var view;

  view = SC.TemplateView.create({
    templateName: 'test_template',

    personName: "Tom DAAAALE",

    templates: SC.Object.create({
      test_template: function(dataSource) {
        return "<h1 id='twas-called'>template was called for " + dataSource.get('personName') + "</h1>";
      }
    })
  });

  view.createLayer();

  equals("template was called for Tom DAAAALE", view.$('#twas-called').text(), "the named template was called with the view as the data source");
});

test("template view defaults to a noop template", function() {
  var view;
  view = SC.TemplateView.create({});
  view.createLayer();

  equals(view.$().html(), '', "view div should be empty");
});

test("template views return YES to mouseDown if there is a mouseUp method", function() {
  var view = SC.TemplateView.create();

  ok(!view.tryToPerform('mouseDown'), "view returns NO if there is no mouseUp method");

  view = SC.TemplateView.create({
    mouseUp: function() { }
  });

  ok(view.tryToPerform('mouseDown'), "view returns YES if we add a mouseUp method");
});

test("should add a 'sc-hidden' class to a template view when isVisible is true", function() {
  var view = SC.TemplateView.create();

  ok(view.get('isVisible'), "precond - views default to being visible");

  view.set('template', function() { return "foo"; });

  view.createLayer()._doAttach(document.body);
  ok(!view.$().hasClass('sc-hidden'), "does not have hidden class applied");

  SC.run(function() { view.set('isVisible', NO); });
  ok(view.$().hasClass('sc-hidden'), "adds hidden class when isVisible changes to NO");

  SC.run(function() { view.set('isVisible', YES); });
  ok(!view.$().hasClass('sc-hidden'), "removes hidden class when isVisible changes to YES");
});

test("should add a 'sc-hidden' class to template views if isVisible is false before their layer is created", function() {
  var view = SC.TemplateView.create({
    isVisible: false
  });

  ok(!view.get('isVisible'), "precond - view is not visible");

  view.set('template', function() { return "foo"; });

  view.createLayer()._doAttach(document.body);
  ok(view.$().hasClass('sc-hidden'), "adds hidden class when rendering");
  $(document.body).append(view.$());
  ok(!view.$().is(':visible'), "should be hidden when hidden class is added");
  view.$().remove();

  SC.run(function() { view.set('isVisible', YES); });
  ok(!view.$().hasClass('sc-hidden'), "removes hidden class when isVisible changes");
});

test("should return an empty rect as its frame if no layer exists", function() {
  var view = SC.TemplateView.create({
    template: function() { return "foo"; }
  });

  var f = view.get('frame');
  ok(f, "returns a frame object");
  equals(f.width, 0, "returns 0 width");
  equals(f.height, 0, "returns 0 height");
});

test("should invalidate frame cache when layer is created", function() {
  var pane = SC.MainPane.create().append();

  var view = SC.TemplateView.create({
    template: function() { return "foo"; }
  });

  var f = view.get('frame');
  ok(f, "precond - returns a frame object");
  equals(f.width, 0, "returns zero width because there is no layer");

  pane.appendChild(view);

  f = view.get('frame');
  ok(f, "returns frame object");
  equals(f.width, view.$().width(), "returns non-zero width");
  pane.remove();
});

test("should invalidate frame cache when appended to document", function() {
  var pane = SC.MainPane.create();

  var view = SC.TemplateView.create({
    template: function() { return "foo"; }
  });

  pane.appendChild(view);

  var f = view.get('frame');
  ok(f, "precond - returns a frame object");
  equals(f.width, 0, "returns zero width because there is no layer");

  pane.append();
  f = view.get('frame');
  ok(f, "returns frame object");
  equals(f.width, view.$().width(), "returns non-zero width");
  pane.remove();
});


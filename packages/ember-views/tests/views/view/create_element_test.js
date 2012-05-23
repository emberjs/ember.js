// ==========================================================================
// Project:   Ember Views
// Copyright: ©2006-2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = Ember.set, get = Ember.get;

module("Ember.View#createElement");

test("returns the receiver", function() {
  var view = Ember.View.create(), ret;
  
  Ember.run(function(){
    ret = view.createElement();
  });
  
  equal(ret, view, 'returns receiver');
});

test("calls render and turns resultant string into element", function() {
  var view = Ember.View.create({
    tagName: 'span',

    render: function(buffer) {
      buffer.push("foo");
    }
  });

  equal(get(view, 'element'), null, 'precondition - has no element');
  Ember.run(function(){
    view.createElement();
  });
  

  var elem = get(view, 'element');
  ok(elem, 'has element now');
  equal(elem.innerHTML, 'foo', 'has innerHTML from context');
  equal(elem.tagName.toString().toLowerCase(), 'span', 'has tagName from view');
});

test("generated element include HTML from child views as well", function() {
  var view = Ember.ContainerView.create({
    childViews: [ Ember.View.create({ elementId: "foo" })]
  });

  Ember.run(function(){
    view.createElement();
  });
  
  ok(view.$('#foo').length, 'has element with child elementId');
});


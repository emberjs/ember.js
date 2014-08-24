import { get } from "ember-metal/property_get";
import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";
import ContainerView from "ember-views/views/container_view";

var view;

QUnit.module("Ember.View#createElement", {
  teardown: function() {
    run(function() {
      view.destroy();
    });
  }
});

test("returns the receiver", function() {
  var ret;

  view = EmberView.create();

  run(function() {
    ret = view.createElement();
  });

  equal(ret, view, 'returns receiver');
});

test("calls render and turns resultant string into element", function() {
  view = EmberView.create({
    tagName: 'span',

    render: function(buffer) {
      buffer.push("foo");
    }
  });

  equal(get(view, 'element'), null, 'precondition - has no element');
  run(function() {
    view.createElement();
  });


  var elem = get(view, 'element');
  ok(elem, 'has element now');
  equal(elem.innerHTML, 'foo', 'has innerHTML from context');
  equal(elem.tagName.toString().toLowerCase(), 'span', 'has tagName from view');
});

test("calls render and parses the buffer string in the right context", function() {
  view = ContainerView.create({
    tagName: 'table',
    childViews: [ EmberView.create({
      tagName: '',
      render: function(buffer) {
        // Emulate a metamorph
        buffer.push("<script></script><tr><td>snorfblax</td></tr>");
      }
    })]
  });

  equal(get(view, 'element'), null, 'precondition - has no element');
  run(function() {
    view.createElement();
  });


  var elem = get(view, 'element');
  ok(elem, 'has element now');
  equal(elem.innerHTML, '<script></script><tr><td>snorfblax</td></tr>', 'has innerHTML from context');
  equal(elem.tagName.toString().toLowerCase(), 'table', 'has tagName from view');
});

test("does not wrap many tr children in tbody elements", function() {
  view = ContainerView.create({
    tagName: 'table',
    childViews: [
      EmberView.create({
        tagName: '',
        render: function(buffer) {
          // Emulate a metamorph
          buffer.push("<script></script><tr><td>snorfblax</td></tr>");
        } }),
      EmberView.create({
        tagName: '',
        render: function(buffer) {
          // Emulate a metamorph
          buffer.push("<script></script><tr><td>snorfblax</td></tr>");
        } })
    ]
  });

  equal(get(view, 'element'), null, 'precondition - has no element');
  run(function() {
    view.createElement();
  });


  var elem = get(view, 'element');
  ok(elem, 'has element now');
  equal(elem.innerHTML, '<script></script><tr><td>snorfblax</td></tr><script></script><tr><td>snorfblax</td></tr>', 'has innerHTML from context');
  equal(elem.tagName.toString().toLowerCase(), 'table', 'has tagName from view');
});

test("generated element include HTML from child views as well", function() {
  view = ContainerView.create({
    childViews: [ EmberView.create({ elementId: "foo" })]
  });

  run(function() {
    view.createElement();
  });

  ok(view.$('#foo').length, 'has element with child elementId');
});


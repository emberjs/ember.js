import {get} from "ember-metal/property_get";
import run from "ember-metal/run_loop";
import EmberObject from "ember-runtime/system/object";
import jQuery from "ember-views/system/jquery";
import {View as EmberView} from "ember-views/views/view";
import ContainerView from "ember-views/views/container_view";

var view;

// .......................................................
//  render()
//
module("EmberView#render", {
  teardown: function() {
    run(function() {
      view.destroy();
    });
  }
});

test("default implementation does not render child views", function() {

  var rendered = 0, updated = 0, parentRendered = 0, parentUpdated = 0 ;
  view = ContainerView.createWithMixins({
    childViews: ["child"],

    render: function(buffer) {
      parentRendered++;
      this._super(buffer);
    },

    child: EmberView.createWithMixins({
      render: function(buffer) {
        rendered++;
        this._super(buffer);
      }
    })
  });

  run(function() {
    view.createElement();
  });
  equal(rendered, 1, 'rendered the child once');
  equal(parentRendered, 1);
  equal(view.$('div').length, 1);

});

test("should invoke renderChildViews if layer is destroyed then re-rendered", function() {

  var rendered = 0, parentRendered = 0, parentUpdated = 0 ;
  view = ContainerView.createWithMixins({
    childViews: ["child"],

    render: function(buffer) {
      parentRendered++;
      this._super(buffer);
    },

    child: EmberView.createWithMixins({
      render: function(buffer) {
        rendered++;
        this._super(buffer);
      }
    })
  });

  run(function() {
    view.append();
  });

  equal(rendered, 1, 'rendered the child once');
  equal(parentRendered, 1);
  equal(view.$('div').length, 1);

  run(function() {
    view.rerender();
  });

  equal(rendered, 2, 'rendered the child twice');
  equal(parentRendered, 2);
  equal(view.$('div').length, 1);

  run(function() {
    view.destroy();
  });
});

test("should render child views with a different tagName", function() {
  var rendered = 0, parentRendered = 0, parentUpdated = 0 ;

  view = ContainerView.create({
    childViews: ["child"],

    child: EmberView.create({
      tagName: 'aside'
    })
  });

  run(function() {
    view.createElement();
  });

  equal(view.$('aside').length, 1);
});

test("should add ember-view to views", function() {
  view = EmberView.create();

  run(function() {
    view.createElement();
  });

  ok(view.$().hasClass('ember-view'), "the view has ember-view");
});

test("should allow hX tags as tagName", function() {

  view = ContainerView.create({
    childViews: ["child"],

    child: EmberView.create({
      tagName: 'h3'
    })
  });

  run(function() {
    view.createElement();
  });

  ok(view.$('h3').length, "does not render the h3 tag correctly");
});

test("should not add role attribute unless one is specified", function() {
  view = EmberView.create();

  run(function() {
    view.createElement();
  });

  ok(view.$().attr('role') === undefined, "does not have a role attribute");
});

test("should re-render if the context is changed", function() {
  view = EmberView.create({
    elementId: 'template-context-test',
    context: { foo: "bar" },
    render: function(buffer) {
      var value = get(get(this, 'context'), 'foo');
      buffer.push(value);
    }
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(jQuery('#qunit-fixture #template-context-test').text(), "bar", "precond - renders the view with the initial value");

  run(function() {
    view.set('context', {
      foo: "bang baz"
    });
  });

  equal(jQuery('#qunit-fixture #template-context-test').text(), "bang baz", "re-renders the view with the updated context");
});

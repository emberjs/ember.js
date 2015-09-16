import { get } from "ember-metal/property_get";
import run from "ember-metal/run_loop";
import jQuery from "ember-views/system/jquery";
import EmberView from "ember-views/views/view";

var rootView, childView;

QUnit.module("virtual views", {
  teardown() {
    run(function() {
      rootView.destroy();
      childView.destroy();
    });
  }
});

QUnit.test("a virtual view does not appear as a view's parentView", function() {
  rootView = EmberView.create({
    elementId: 'root-view',

    render(buffer) {
      buffer.push("<h1>Hi</h1>");
      this.appendChild(virtualView);
    }
  });

  var virtualView = EmberView.create({
    isVirtual: true,
    tagName: '',

    render(buffer) {
      buffer.push("<h2>Virtual</h2>");
      this.appendChild(childView);
    }
  });

  childView = EmberView.create({
    render(buffer) {
      buffer.push("<p>Bye!</p>");
    }
  });

  run(function() {
    jQuery("#qunit-fixture").empty();
    rootView.appendTo("#qunit-fixture");
  });

  equal(jQuery("#root-view > h2").length, 1, "nodes with '' tagName do not create wrappers");
  equal(get(childView, 'parentView'), rootView);

  var children = get(rootView, 'childViews');

  equal(get(children, 'length'), 1, "there is one child element");
  equal(children.objectAt(0), childView, "the child element skips through the virtual view");
});

QUnit.test("when a virtual view's child views change, the parent's childViews should reflect", function() {
  rootView = EmberView.create({
    elementId: 'root-view',

    render(buffer) {
      buffer.push("<h1>Hi</h1>");
      this.appendChild(virtualVirtualView);
    }
  });

  var virtualVirtualView = EmberView.create({
    isVirtual: true,
    tagName: '',

    render(buffer) {
      buffer.push("<h2>Virtual</h2>");
      this.appendChild(virtualView);
    }
  });

  var virtualView = EmberView.create({
    isVirtual: true,
    tagName: '',

    render(buffer) {
      buffer.push("<h3>Virtual</h3>");
      this.appendChild(childView);
    }
  });

  childView = EmberView.create({
    render(buffer) {
      buffer.push("<p>Bye!</p>");
    }
  });

  run(function() {
    jQuery("#qunit-fixture").empty();
    rootView.appendTo("#qunit-fixture");
  });

  equal(virtualVirtualView.get('childViews.length'), 1, "has childView - precond");
  equal(rootView.get('childViews.length'), 1, "has childView - precond");

  run(function() {
    childView.removeFromParent();
  });

  equal(virtualVirtualView.get('childViews.length'), 0, "has no childView");
  equal(rootView.get('childViews.length'), 0, "has no childView");
});

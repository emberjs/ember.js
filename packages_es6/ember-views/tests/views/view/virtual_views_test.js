var get = Ember.get, set = Ember.set, rootView, childView;

module("virtual views", {
  teardown: function() {
    Ember.run(function() {
      rootView.destroy();
      childView.destroy();
    });
  }
});

test("a virtual view does not appear as a view's parentView", function() {
  rootView = Ember.View.create({
    elementId: 'root-view',

    render: function(buffer) {
      buffer.push("<h1>Hi</h1>");
      this.appendChild(virtualView);
    }
  });

  var virtualView = Ember.View.create({
    isVirtual: true,
    tagName: '',

    render: function(buffer) {
      buffer.push("<h2>Virtual</h2>");
      this.appendChild(childView);
    }
  });

  childView = Ember.View.create({
    render: function(buffer) {
      buffer.push("<p>Bye!</p>");
    }
  });

  Ember.run(function() {
    Ember.$("#qunit-fixture").empty();
    rootView.appendTo("#qunit-fixture");
  });

  equal(Ember.$("#root-view > h2").length, 1, "nodes with '' tagName do not create wrappers");
  equal(get(childView, 'parentView'), rootView);

  var children = get(rootView, 'childViews');

  equal(get(children, 'length'), 1, "there is one child element");
  equal(children.objectAt(0), childView, "the child element skips through the virtual view");
});

test("when a virtual view's child views change, the parent's childViews should reflect", function() {
  rootView = Ember.View.create({
    elementId: 'root-view',

    render: function(buffer) {
      buffer.push("<h1>Hi</h1>");
      this.appendChild(virtualView);
    }
  });

  var virtualView = Ember.View.create({
    isVirtual: true,
    tagName: '',

    render: function(buffer) {
      buffer.push("<h2>Virtual</h2>");
      this.appendChild(childView);
    }
  });

  childView = Ember.View.create({
    render: function(buffer) {
      buffer.push("<p>Bye!</p>");
    }
  });

  Ember.run(function() {
    Ember.$("#qunit-fixture").empty();
    rootView.appendTo("#qunit-fixture");
  });

  equal(virtualView.get('childViews.length'), 1, "has childView - precond");
  equal(rootView.get('childViews.length'), 1, "has childView - precond");

  Ember.run(function() {
    childView.removeFromParent();
  });

  equal(virtualView.get('childViews.length'), 0, "has no childView");
  equal(rootView.get('childViews.length'), 0, "has no childView");
});

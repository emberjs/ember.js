module("virtual views");

var get = Ember.get, set = Ember.set;

test("a virtual view does not appear as a view's parentView", function() {
  var rootView = Ember.View.create({
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

  var childView = Ember.View.create({
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
  var rootView = Ember.View.create({
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

  var childView = Ember.View.create({
    render: function(buffer) {
      buffer.push("<p>Bye!</p>");
    }
  });

  Ember.run(function() {
    Ember.$("#qunit-fixture").empty();
    rootView.appendTo("#qunit-fixture");
  });

  equal(virtualView.getPath('childViews.length'), 1, "has childView - precond");
  equal(rootView.getPath('childViews.length'), 1, "has childView - precond");

  Ember.run(function() {
    childView.removeFromParent();
  });

  equal(virtualView.getPath('childViews.length'), 0, "has no childView");
  equal(rootView.getPath('childViews.length'), 0, "has no childView");
});

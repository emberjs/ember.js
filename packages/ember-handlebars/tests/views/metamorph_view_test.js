var view, childView, metamorphView;

module("Metamorph views", {
  setup: function() {
    view = Ember.View.create({
      render: function(buffer) {
        buffer.push("<h1>View</h1>");
        this.appendChild(metamorphView);
      }
    });
  },

  teardown: function() {
    view.destroy();
    if (childView && !childView.isDestroyed) {
      childView.destroy();
    }

    if (metamorphView && !metamorphView.isDestroyed) {
      metamorphView.destroy();
    }
  }
});

var get = Ember.get, set = Ember.set;

test("a Metamorph view is not a view's parentView", function() {
  childView = Ember.View.create({
    render: function(buffer) {
      buffer.push("<p>Bye bros</p>");
    }
  });

  metamorphView = Ember.View.create(Ember.Metamorph, {
    render: function(buffer) {
      buffer.push("<h2>Meta</h2>");
      this.appendChild(childView);
    }
  });

  Ember.run(function() {
    view.appendTo("#qunit-fixture");
  });

  equals(get(childView, 'parentView'), view, "A child of a metamorph view cannot see the metamorph view as its parent");

  var children = get(view, 'childViews');

  equals(get(children, 'length'), 1, "precond - there is only one child of the main node");
  equals(children.objectAt(0), childView, "... and it is not the metamorph");
});

module("Metamorph views correctly handle DOM", {
  setup: function() {
    view = Ember.View.create({
      render: function(buffer) {
        buffer.push("<h1>View</h1>");
        this.appendChild(metamorphView);
      }
    });

    metamorphView = Ember.View.create(Ember.Metamorph, {
      powerRanger: "Jason",

      render: function(buffer) {
        buffer.push("<h2 id='from-meta'>"+get(this, 'powerRanger')+"</h2>");
      }
    });

    Ember.run(function() {
      view.appendTo("#qunit-fixture");
    });
  },

  teardown: function() {
    view.destroy();
    if (!metamorphView.isDestroyed) {
      metamorphView.destroy();
    }
  }
});

test("a metamorph view generates without a DOM node", function() {
  var meta = Ember.$("> h2", "#" + get(view, 'elementId'));

  equals(meta.length, 1, "The metamorph element should be directly inside its parent");
});

test("a metamorph view can be removed from the DOM", function() {
  Ember.run(function() {
    metamorphView.destroy();
  });

  var meta = Ember.$('#from-morph');
  equals(meta.length, 0, "the associated DOM was removed");
});

test("a metamorph view can be rerendered", function() {
  equals(Ember.$('#from-meta').text(), "Jason", "precond - renders to the DOM");

  set(metamorphView, 'powerRanger', 'Trini');
  Ember.run(function() {
    metamorphView.rerender();
  });

  equals(Ember.$('#from-meta').text(), "Trini", "updates value when re-rendering");
});


test("a metamorph view calls its childrens' willInsertElement and didInsertElement", function(){
  var parentView;
  var willInsertElementCalled = false;
  var didInsertElementCalled = false;
  var didInsertElementSawElement = false;

  parentView = Ember.View.create({
    ViewWithCallback: Ember.View.extend({
      template: Ember.Handlebars.compile('<div id="do-i-exist"></div>'),

      willInsertElement: function(){
        willInsertElementCalled = true;
      },
      didInsertElement: function(){
        didInsertElementCalled = true;
        didInsertElementSawElement = (this.$('div').length === 1);
      }
    }),

    template: Ember.Handlebars.compile('{{#if condition}}{{view "ViewWithCallback"}}{{/if}}'),
    condition: false
  });

  Ember.run(function() {
    parentView.append();
  });
  Ember.run(function() {
    parentView.set('condition', true);
  });

  ok(willInsertElementCalled, "willInsertElement called");
  ok(didInsertElementCalled, "didInsertElement called");
  ok(didInsertElementSawElement, "didInsertElement saw element");

  parentView.destroy();

});

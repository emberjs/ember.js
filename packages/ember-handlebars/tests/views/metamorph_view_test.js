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

  metamorphView = Ember._MetamorphView.create({
    render: function(buffer) {
      buffer.push("<h2>Meta</h2>");
      this.appendChild(childView);
    }
  });

  Ember.run(function() {
    view.appendTo("#qunit-fixture");
  });

  equal(get(childView, 'parentView'), view, "A child of a metamorph view cannot see the metamorph view as its parent");

  var children = get(view, 'childViews');

  equal(get(children, 'length'), 1, "precond - there is only one child of the main node");
  equal(children.objectAt(0), childView, "... and it is not the metamorph");
});

module("Metamorph views correctly handle DOM", {
  setup: function() {
    view = Ember.View.create({
      render: function(buffer) {
        buffer.push("<h1>View</h1>");
        this.appendChild(metamorphView);
      }
    });

    metamorphView = Ember._MetamorphView.create({
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

  equal(meta.length, 1, "The metamorph element should be directly inside its parent");
});

test("a metamorph view can be removed from the DOM", function() {
  Ember.run(function() {
    metamorphView.destroy();
  });

  var meta = Ember.$('#from-morph');
  equal(meta.length, 0, "the associated DOM was removed");
});

test("a metamorph view can be rerendered", function() {
  equal(Ember.$('#from-meta').text(), "Jason", "precond - renders to the DOM");

  set(metamorphView, 'powerRanger', 'Trini');
  Ember.run(function() {
    metamorphView.rerender();
  });

  equal(Ember.$('#from-meta').text(), "Trini", "updates value when re-rendering");
});


// Redefining without setup/teardown
module("Metamorph views correctly handle DOM");

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

test("replacing a Metamorph should invalidate childView elements", function() {
  var insertedElement;

  view = Ember.View.create({
    show: false,

    CustomView: Ember.View.extend({
      init: function() {
        this._super();
        // This will be called in preRender
        // We want it to cache a null value
        // Hopefully it will be invalidated when `show` is toggled
        this.get('element');
      },

      didInsertElement: function(){
        insertedElement = this.get('element');
      }
    }),

    template: Ember.Handlebars.compile("{{#if show}}{{view CustomView}}{{/if}}")
  });

  Ember.run(function(){ view.append(); });

  Ember.run(function(){ view.set('show', true); });

  ok(insertedElement, "should have an element");

  view.destroy();
});

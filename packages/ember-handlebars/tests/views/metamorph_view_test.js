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
    Ember.run(function(){
      view.destroy();
      if (childView && !childView.isDestroyed) {
        childView.destroy();
      }

      if (metamorphView && !metamorphView.isDestroyed) {
        metamorphView.destroy();
      }
    });
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
    Ember.run(function(){
      view.destroy();
      if (!metamorphView.isDestroyed) {
        metamorphView.destroy();
      }
    });
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

    template: Ember.Handlebars.compile('{{#if view.condition}}{{view "view.ViewWithCallback"}}{{/if}}'),
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

  Ember.run(function(){
    parentView.destroy();
  });

});

test("replacing a Metamorph should invalidate childView elements", function() {
  var elementOnDidChange, elementOnDidInsert;

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

      elementDidChange: Ember.observer(function() {
        elementOnDidChange = this.get('element');
      }, 'element'),

      didInsertElement: function(){
        elementOnDidInsert = this.get('element');
      }
    }),

    template: Ember.Handlebars.compile("{{#if view.show}}{{view view.CustomView}}{{/if}}")
  });

  Ember.run(function(){ view.append(); });

  Ember.run(function(){ view.set('show', true); });

  ok(elementOnDidChange, "should have an element on change");
  ok(elementOnDidInsert, "should have an element on insert");

  Ember.run(function(){ view.destroy(); });
});

test("trigger rerender of parent and SimpleHandlebarsView", function () {
  var view = Ember.View.create({
    show: true,
    foo: 'bar',
    template: Ember.Handlebars.compile("{{#if view.show}}{{#if view.foo}}{{view.foo}}{{/if}}{{/if}}")
  });

  Ember.run(function(){ view.append(); });

  equal(view.$().text(), 'bar');

  Ember.run(function(){
    view.set('foo', 'baz'); // schedule render of simple bound
    view.set('show', false); // destroy tree
  });

  equal(view.$().text(), '');

  Ember.run(function() {
    view.destroy();
  });
});

test("re-rendering and then changing the property does not raise an exception", function() {
  view = Ember.View.create({
    show: true,
    foo: 'bar',
    metamorphView: Ember._MetamorphView,
    template: Ember.Handlebars.compile("{{#view view.metamorphView}}truth{{/view}}")
  });

  Ember.run(function(){ view.appendTo('#qunit-fixture'); });

  equal(view.$().text(), 'truth');

  Ember.run(function(){
    view.get('_childViews')[0].rerender();
    view.get('_childViews')[0].rerender();
  });

  equal(view.$().text(), 'truth');

  Ember.run(function() {
    view.destroy();
  });
});

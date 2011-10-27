var view, childView, metamorphView;

module("Metamorph views", {
  setup: function() {
    view = SC.View.create({
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

var get = SC.get, set = SC.set;

test("a Metamorph view is not a view's parentView", function() {
  childView = SC.View.create({
    render: function(buffer) {
      buffer.push("<p>Bye bros</p>");
    }
  });

  metamorphView = SC.View.create(SC.Metamorph, {
    render: function(buffer) {
      buffer.push("<h2>Meta</h2>");
      this.appendChild(childView);
    }
  });

  SC.run(function() {
    view.appendTo("#qunit-fixture");
  });

  equals(get(childView, 'parentView'), view, "A child of a metamorph view cannot see the metamorph view as its parent");

  var children = get(view, 'childViews');

  equals(get(children, 'length'), 1, "precond - there is only one child of the main node");
  equals(children.objectAt(0), childView, "... and it is not the metamorph");
});

module("Metamorph views correctly handle DOM", {
  setup: function() {
    view = SC.View.create({
      render: function(buffer) {
        buffer.push("<h1>View</h1>");
        this.appendChild(metamorphView);
      }
    });

    metamorphView = SC.View.create(SC.Metamorph, {
      powerRanger: "Jason",

      render: function(buffer) {
        buffer.push("<h2 id='from-meta'>"+get(this, 'powerRanger')+"</h2>");
      }
    });

    SC.run(function() {
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
  var meta = SC.$("> h2", "#" + get(view, 'elementId'));

  equals(meta.length, 1, "The metamorph element should be directly inside its parent");
});

test("a metamorph view can be removed from the DOM", function() {
  SC.run(function() {
    metamorphView.destroy();
  });

  var meta = SC.$('#from-morph');
  equals(meta.length, 0, "the associated DOM was removed");
});

test("a metamorph view can be rerendered", function() {
  equals(SC.$('#from-meta').text(), "Jason", "precond - renders to the DOM");

  set(metamorphView, 'powerRanger', 'Trini');
  SC.run(function() {
    metamorphView.rerender();
  });

  equals(SC.$('#from-meta').text(), "Trini", "updates value when re-rendering");
});

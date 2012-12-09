/*global ViewTest:true*/

var originalLookup = Ember.lookup, lookup, view;

module("views/view/view_lifecycle_test - pre-render", {
  setup: function() {
    Ember.lookup = lookup = {};
  },

  teardown: function() {
    if (view) {
      Ember.run(function(){
        view.destroy();
      });
    }
    Ember.lookup = originalLookup;
  }
});

function tmpl(str) {
  return function(context, options) {
    options.data.buffer.push(str);
  };
}

test("should create and append a DOM element after bindings have synced", function() {
  var ViewTest;

  lookup.ViewTest = ViewTest = {};

  Ember.run(function() {
    ViewTest.fakeController = Ember.Object.create({
      fakeThing: 'controllerPropertyValue'
    });

    view = Ember.View.createWithMixins({
      fooBinding: 'ViewTest.fakeController.fakeThing',

      render: function(buffer) {
        buffer.push(this.get('foo'));
      }
    });

    ok(!view.get('element'), "precond - does not have an element before appending");

    view.append();
  });

  equal(view.$().text(), 'controllerPropertyValue', "renders and appends after bindings have synced");
});

test("should throw an exception if trying to append a child before rendering has begun", function() {
  Ember.run(function() {
    view = Ember.View.create();
  });

  raises(function() {
    view.appendChild(Ember.View, {});
  }, null, "throws an error when calling appendChild()");
});

test("should not affect rendering if rerender is called before initial render happens", function() {
  Ember.run(function() {
    view = Ember.View.create({
      template: tmpl("Rerender me!")
    });

    view.rerender();
    view.append();
  });

  equal(view.$().text(), "Rerender me!", "renders correctly if rerender is called first");
});

test("should not affect rendering if destroyElement is called before initial render happens", function() {
  Ember.run(function() {
    view = Ember.View.create({
      template: tmpl("Don't destroy me!")
    });

    view.destroyElement();
    view.append();
  });

  equal(view.$().text(), "Don't destroy me!", "renders correctly if destroyElement is called first");
});

module("views/view/view_lifecycle_test - in render", {
  setup: function() {

  },

  teardown: function() {
    if (view) {
      Ember.run(function(){
        view.destroy();
      });
    }
  }
});

test("appendChild should work inside a template", function() {
  Ember.run(function() {
    view = Ember.View.create({
      template: function(context, options) {
        var buffer = options.data.buffer;

        buffer.push("<h1>Hi!</h1>");

        options.data.view.appendChild(Ember.View, {
          template: tmpl("Inception reached")
        });

        buffer.push("<div class='footer'>Wait for the kick</div>");
      }
    });

    view.appendTo("#qunit-fixture");
  });

  ok(view.$('h1').length === 1 && view.$('div').length === 2,
     "The appended child is visible");
});

test("rerender should work inside a template", function() {
  try {
    Ember.TESTING_DEPRECATION = true;

    Ember.run(function() {
      var renderCount = 0;
      view = Ember.View.create({
        template: function(context, options) {
          var view = options.data.view;

          var child1 = view.appendChild(Ember.View, {
            template: function(context, options) {
              renderCount++;
              options.data.buffer.push(String(renderCount));
            }
          });

          var child2 = view.appendChild(Ember.View, {
            template: function(context, options) {
              options.data.buffer.push("Inside child2");
              child1.rerender();
            }
          });
        }
      });

      view.appendTo("#qunit-fixture");
    });
  } finally {
    Ember.TESTING_DEPRECATION = false;
  }

  equal(view.$('div:nth-child(1)').length, 1);
  equal(view.$('div:nth-child(1)').text(), '2');
  equal(view.$('div:nth-child(2)').length, 1);
  equal(view.$('div:nth-child(2)').text(), 'Inside child2');
});

module("views/view/view_lifecycle_test - in DOM", {
  teardown: function() {
    if (view) {
      Ember.run(function(){
        view.destroy();
      });
    }
  }
});

test("should throw an exception when calling appendChild when DOM element exists", function() {
  Ember.run(function() {
    view = Ember.View.create({
      template: tmpl("Wait for the kick")
    });

    view.append();
  });

  raises(function() {
    view.appendChild(Ember.View, {
      template: tmpl("Ah ah ah! You didn't say the magic word!")
    });
  }, null, "throws an exception when calling appendChild after element is created");
});

test("should replace DOM representation if rerender() is called after element is created", function() {
  Ember.run(function() {
    view = Ember.View.create({
      template: function(context, options) {
        var buffer = options.data.buffer;
        var value = context.get('shape');

        buffer.push("Do not taunt happy fun "+value);
      },

      context: Ember.Object.create({
        shape: 'sphere'
      })
    });

    view.append();
  });

  equal(view.$().text(), "Do not taunt happy fun sphere", "precond - creates DOM element");

  view.set('context.shape', 'ball');
  Ember.run(function() {
    view.rerender();
  });

  equal(view.$().text(), "Do not taunt happy fun ball", "rerenders DOM element when rerender() is called");
});

test("should destroy DOM representation when destroyElement is called", function() {
  Ember.run(function() {
    view = Ember.View.create({
      template: tmpl("Don't fear the reaper")
    });

    view.append();
  });

  ok(view.get('element'), "precond - generates a DOM element");

  Ember.run(function() {
    view.destroyElement();
  });

  ok(!view.get('element'), "destroys view when destroyElement() is called");
});

test("should destroy DOM representation when destroy is called", function() {
  Ember.run(function() {
    view = Ember.View.create({
      template: tmpl("<div id='warning'>Don't fear the reaper</div>")
    });

    view.append();
  });

  ok(view.get('element'), "precond - generates a DOM element");

  Ember.run(function() {
    view.destroy();
  });

  ok(Ember.$('#warning').length === 0, "destroys element when destroy() is called");
});

test("should throw an exception if trying to append an element that is already in DOM", function() {
  Ember.run(function() {
    view = Ember.View.create({
      template: tmpl('Broseidon, King of the Brocean')
    });

    view.append();
  });

  ok(view.get('element'), "precond - creates DOM element");

  raises(function() {
    Ember.run(function() {
      view.append();
    });
  }, null, "raises an exception on second append");
});

module("views/view/view_lifecycle_test - destroyed");

test("should throw an exception when calling appendChild after view is destroyed", function() {
  Ember.run(function() {
    view = Ember.View.create({
      template: tmpl("Wait for the kick")
    });

    view.append();
  });

  Ember.run(function() {
    view.destroy();
  });

  raises(function() {
    view.appendChild(Ember.View, {
      template: tmpl("Ah ah ah! You didn't say the magic word!")
    });
  }, null, "throws an exception when calling appendChild");
});

test("should throw an exception when rerender is called after view is destroyed", function() {
  Ember.run(function() {
    view = Ember.View.create({
      template: tmpl('foo')
    });

    view.append();
  });

  Ember.run(function() {
    view.destroy();
  });

  raises(function() {
    view.rerender();
  }, null, "throws an exception when calling appendChild");
});

test("should throw an exception when rerender is called after view is destroyed", function() {
  Ember.run(function() {
    view = Ember.View.create({
      template: tmpl('foo')
    });

    view.append();
  });

  Ember.run(function() {
    view.destroy();
  });

  raises(function() {
    view.destroyElement();
  }, null, "throws an exception when calling appendChild");
});


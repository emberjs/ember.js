import Ember from "ember-metal/core";
import { get } from "ember-metal/property_get";
import run from "ember-metal/run_loop";
import EmberObject from "ember-runtime/system/object";
import jQuery from "ember-views/system/jquery";
import EmberView from "ember-views/views/view";

var originalLookup = Ember.lookup, lookup, view;

QUnit.module("views/view/view_lifecycle_test - pre-render", {
  setup: function() {
    Ember.lookup = lookup = {};
  },

  teardown: function() {
    if (view) {
      run(function() {
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

  run(function() {
    ViewTest.fakeController = EmberObject.create({
      fakeThing: 'controllerPropertyValue'
    });

    view = EmberView.createWithMixins({
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
  run(function() {
    view = EmberView.create();
  });

  raises(function() {
    view.appendChild(EmberView, {});
  }, null, "throws an error when calling appendChild()");
});

test("should not affect rendering if rerender is called before initial render happens", function() {
  run(function() {
    view = EmberView.create({
      template: tmpl("Rerender me!")
    });

    view.rerender();
    view.append();
  });

  equal(view.$().text(), "Rerender me!", "renders correctly if rerender is called first");
});

test("should not affect rendering if destroyElement is called before initial render happens", function() {
  run(function() {
    view = EmberView.create({
      template: tmpl("Don't destroy me!")
    });

    view.destroyElement();
    view.append();
  });

  equal(view.$().text(), "Don't destroy me!", "renders correctly if destroyElement is called first");
});

QUnit.module("views/view/view_lifecycle_test - in render", {
  setup: function() {

  },

  teardown: function() {
    if (view) {
      run(function() {
        view.destroy();
      });
    }
  }
});

test("appendChild should work inside a template", function() {
  run(function() {
    view = EmberView.create({
      template: function(context, options) {
        var buffer = options.data.buffer;

        buffer.push("<h1>Hi!</h1>");

        options.data.view.appendChild(EmberView, {
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

test("rerender should throw inside a template", function() {
  raises(function() {
    run(function() {
      var renderCount = 0;
      view = EmberView.create({
        template: function(context, options) {
          var view = options.data.view;

          var child1 = view.appendChild(EmberView, {
            template: function(context, options) {
              renderCount++;
              options.data.buffer.push(String(renderCount));
            }
          });

          var child2 = view.appendChild(EmberView, {
            template: function(context, options) {
              options.data.buffer.push("Inside child2");
              child1.rerender();
            }
          });
        }
      });

      view.appendTo("#qunit-fixture");
    });
  }, /Something you did caused a view to re-render after it rendered but before it was inserted into the DOM./);
});

QUnit.module("views/view/view_lifecycle_test - hasElement", {
  teardown: function() {
    if (view) {
      run(function() {
        view.destroy();
      });
    }
  }
});

test("createElement puts the view into the hasElement state", function() {
  view = EmberView.create({
    render: function(buffer) { buffer.push('hello'); }
  });

  run(function() {
    view.createElement();
  });

  equal(view.currentState, view._states.hasElement, "the view is in the hasElement state");
});

test("trigger rerender on a view in the hasElement state doesn't change its state to inDOM", function() {
  view = EmberView.create({
    render: function(buffer) { buffer.push('hello'); }
  });

  run(function() {
    view.createElement();
    view.rerender();
  });

  equal(view.currentState, view._states.hasElement, "the view is still in the hasElement state");
});


QUnit.module("views/view/view_lifecycle_test - in DOM", {
  teardown: function() {
    if (view) {
      run(function() {
        view.destroy();
      });
    }
  }
});

test("should throw an exception when calling appendChild when DOM element exists", function() {
  run(function() {
    view = EmberView.create({
      template: tmpl("Wait for the kick")
    });

    view.append();
  });

  raises(function() {
    view.appendChild(EmberView, {
      template: tmpl("Ah ah ah! You didn't say the magic word!")
    });
  }, null, "throws an exception when calling appendChild after element is created");
});

test("should replace DOM representation if rerender() is called after element is created", function() {
  run(function() {
    view = EmberView.create({
      template: function(context, options) {
        var buffer = options.data.buffer;
        var value = context.get('shape');

        buffer.push("Do not taunt happy fun "+value);
      },

      context: EmberObject.create({
        shape: 'sphere'
      })
    });

    view.append();
  });

  equal(view.$().text(), "Do not taunt happy fun sphere", "precond - creates DOM element");

  view.set('context.shape', 'ball');
  run(function() {
    view.rerender();
  });

  equal(view.$().text(), "Do not taunt happy fun ball", "rerenders DOM element when rerender() is called");
});

test("should destroy DOM representation when destroyElement is called", function() {
  run(function() {
    view = EmberView.create({
      template: tmpl("Don't fear the reaper")
    });

    view.append();
  });

  ok(view.get('element'), "precond - generates a DOM element");

  run(function() {
    view.destroyElement();
  });

  ok(!view.get('element'), "destroys view when destroyElement() is called");
});

test("should destroy DOM representation when destroy is called", function() {
  run(function() {
    view = EmberView.create({
      template: tmpl("<div id='warning'>Don't fear the reaper</div>")
    });

    view.append();
  });

  ok(view.get('element'), "precond - generates a DOM element");

  run(function() {
    view.destroy();
  });

  ok(jQuery('#warning').length === 0, "destroys element when destroy() is called");
});

test("should throw an exception if trying to append an element that is already in DOM", function() {
  run(function() {
    view = EmberView.create({
      template: tmpl('Broseidon, King of the Brocean')
    });

    view.append();
  });

  ok(view.get('element'), "precond - creates DOM element");

  raises(function() {
    run(function() {
      view.append();
    });
  }, null, "raises an exception on second append");
});

QUnit.module("views/view/view_lifecycle_test - destroyed");

test("should throw an exception when calling appendChild after view is destroyed", function() {
  run(function() {
    view = EmberView.create({
      template: tmpl("Wait for the kick")
    });

    view.append();
  });

  run(function() {
    view.destroy();
  });

  raises(function() {
    view.appendChild(EmberView, {
      template: tmpl("Ah ah ah! You didn't say the magic word!")
    });
  }, null, "throws an exception when calling appendChild");
});

test("should throw an exception when rerender is called after view is destroyed", function() {
  run(function() {
    view = EmberView.create({
      template: tmpl('foo')
    });

    view.append();
  });

  run(function() {
    view.destroy();
  });

  raises(function() {
    view.rerender();
  }, null, "throws an exception when calling rerender");
});

test("should throw an exception when destroyElement is called after view is destroyed", function() {
  run(function() {
    view = EmberView.create({
      template: tmpl('foo')
    });

    view.append();
  });

  run(function() {
    view.destroy();
  });

  raises(function() {
    view.destroyElement();
  }, null, "throws an exception when calling destroyElement");
});

test("trigger rerender on a view in the inDOM state keeps its state as inDOM", function() {
  run(function() {
    view = EmberView.create({
      template: tmpl('foo')
    });

    view.append();
  });

  run(function() {
    view.rerender();
  });

  equal(view.currentState, view._states.inDOM, "the view is still in the inDOM state");

  run(function() {
    view.destroy();
  });
});


import { context } from 'ember-environment';
import run from 'ember-metal/run_loop';
import jQuery from 'ember-views/system/jquery';
import EmberView from 'ember-views/views/view';
import { compile } from 'ember-template-compiler';
import { registerHelper } from 'ember-templates/tests/utils/helpers';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

var originalLookup = context.lookup;
var owner, lookup, view;

import { test, testModule } from 'internal-test-helpers/tests/skip-if-glimmer';

QUnit.module('views/view/view_lifecycle_test - pre-render', {
  setup() {
    context.lookup = lookup = {};
  },

  teardown() {
    if (view) {
      run(function() {
        view.destroy();
      });
    }
    view = null;
    context.lookup = originalLookup;
  }
});

QUnit.test('should throw an exception if trying to append a child before rendering has begun', function() {
  run(function() {
    view = EmberView.create();
  });

  throws(function() {
    view.appendChild(EmberView, {});
  }, null, 'throws an error when calling appendChild()');
});

test('should not affect rendering if rerender is called before initial render happens', function() {
  run(function() {
    view = EmberView.create({
      template: compile('Rerender me!')
    });

    view.rerender();
    view.append();
  });

  equal(view.$().text(), 'Rerender me!', 'renders correctly if rerender is called first');
});

test('should not affect rendering if destroyElement is called before initial render happens', function() {
  run(function() {
    view = EmberView.create({
      template: compile('Don\'t destroy me!')
    });

    view.destroyElement();
    view.append();
  });

  equal(view.$().text(), 'Don\'t destroy me!', 'renders correctly if destroyElement is called first');
});

testModule('views/view/view_lifecycle_test - in render', {
  setup() {
    owner = buildOwner();
  },
  teardown() {
    if (view) {
      run(function() {
        view.destroy();
      });
    }
    owner = view = null;
  }
});

test('rerender of top level view during rendering should throw', function() {
  registerHelper('throw', function() {
    view.rerender();
  }, owner);
  view = EmberView.create({
    [OWNER]: owner,
    template: compile('{{throw}}')
  });
  throws(
    function() {
      run(view, view.appendTo, '#qunit-fixture');
    },
    /Something you did caused a view to re-render after it rendered but before it was inserted into the DOM./,
    'expected error was not raised'
  );
});

QUnit.module('views/view/view_lifecycle_test - hasElement', {
  teardown() {
    if (view) {
      run(function() {
        view.destroy();
      });
    }
  }
});

QUnit.test('createElement puts the view into the hasElement state', function() {
  var hasCalledInsertElement = false;
  view = EmberView.create({
    didInsertElement() {
      hasCalledInsertElement = true;
    }
  });

  run(function() {
    view.createElement();
  });

  ok(!hasCalledInsertElement, 'didInsertElement is not called');
  equal(view.element.tagName, 'DIV', 'content is rendered');
});

QUnit.test('trigger rerender on a view in the hasElement state doesn\'t change its state to inDOM', function() {
  var hasCalledInsertElement = false;
  view = EmberView.create({
    didInsertElement() {
      hasCalledInsertElement = true;
    }
  });

  run(function() {
    view.createElement();
    view.rerender();
  });

  ok(!hasCalledInsertElement, 'didInsertElement is not called');
  equal(view.element.tagName, 'DIV', 'content is rendered');
});


QUnit.module('views/view/view_lifecycle_test - in DOM', {
  teardown() {
    if (view) {
      run(function() {
        view.destroy();
      });
    }
  }
});

QUnit.test('should throw an exception when calling appendChild when DOM element exists', function() {
  run(function() {
    view = EmberView.create({
      template: compile('Wait for the kick')
    });

    view.append();
  });

  throws(function() {
    view.appendChild(EmberView, {
      template: compile('Ah ah ah! You didn\'t say the magic word!')
    });
  }, null, 'throws an exception when calling appendChild after element is created');
});

test('should replace DOM representation if rerender() is called after element is created', function() {
  run(function() {
    view = EmberView.extend({
      rerender() {
        this._super(...arguments);
      }
    }).create({
      template: compile('Do not taunt happy fun {{unbound view.shape}}'),
      shape: 'sphere'
    });

    view.volatileProp = view.get('context.shape');
    view.append();
  });

  equal(view.$().text(), 'Do not taunt happy fun sphere',
        'precond - creates DOM element');

  view.shape = 'ball';

  equal(view.$().text(), 'Do not taunt happy fun sphere',
        'precond - keeps DOM element');

  run(function() {
    view.rerender();
  });

  equal(view.$().text(), 'Do not taunt happy fun ball',
        'rerenders DOM element when rerender() is called');
});

QUnit.test('should destroy DOM representation when destroyElement is called', function() {
  run(function() {
    view = EmberView.create({
      template: compile('Don\'t fear the reaper')
    });

    view.append();
  });

  ok(view.get('element'), 'precond - generates a DOM element');

  run(function() {
    view.destroyElement();
  });

  ok(!view.get('element'), 'destroys view when destroyElement() is called');
});

QUnit.test('should destroy DOM representation when destroy is called', function() {
  run(function() {
    view = EmberView.create({
      template: compile('<div id=\'warning\'>Don\'t fear the reaper</div>')
    });

    view.append();
  });

  ok(view.get('element'), 'precond - generates a DOM element');

  run(function() {
    view.destroy();
  });

  ok(jQuery('#warning').length === 0, 'destroys element when destroy() is called');
});

QUnit.test('should throw an exception if trying to append an element that is already in DOM', function() {
  run(function() {
    view = EmberView.create({
      template: compile('Broseidon, King of the Brocean')
    });

    view.append();
  });

  ok(view.get('element'), 'precond - creates DOM element');

  throws(function() {
    run(function() {
      view.append();
    });
  }, null, 'raises an exception on second append');
});

QUnit.module('views/view/view_lifecycle_test - destroyed');

QUnit.test('should throw an exception when calling appendChild after view is destroyed', function() {
  run(function() {
    view = EmberView.create({
      template: compile('Wait for the kick')
    });

    view.append();
  });

  run(function() {
    view.destroy();
  });

  throws(function() {
    view.appendChild(EmberView, {
      template: compile('Ah ah ah! You didn\'t say the magic word!')
    });
  }, null, 'throws an exception when calling appendChild');
});

QUnit.test('should throw an exception when rerender is called after view is destroyed', function() {
  run(function() {
    view = EmberView.create({
      template: compile('foo')
    });

    view.append();
  });

  run(function() {
    view.destroy();
  });

  throws(function() {
    view.rerender();
  }, null, 'throws an exception when calling rerender');
});

QUnit.test('should throw an exception when destroyElement is called after view is destroyed', function() {
  run(function() {
    view = EmberView.create({
      template: compile('foo')
    });

    view.append();
  });

  run(function() {
    view.destroy();
  });

  throws(function() {
    view.destroyElement();
  }, null, 'throws an exception when calling destroyElement');
});

QUnit.test('trigger rerender on a view in the inDOM state keeps its state as inDOM', function() {
  run(function() {
    view = EmberView.create({
      template: compile('foo')
    });

    view.append();
  });

  run(function() {
    view.rerender();
  });

  equal(view._currentState, view._states.inDOM, 'the view is still in the inDOM state');

  run(function() {
    view.destroy();
  });
});

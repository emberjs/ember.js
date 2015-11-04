import Component from 'ember-views/components/component';
import Helper, { helper as makeHelper } from 'ember-htmlbars/helper';
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import run from 'ember-metal/run_loop';
import ComponentLookup from 'ember-views/component_lookup';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

let owner, component;

QUnit.module('ember-htmlbars: custom app helpers', {
  setup() {
    owner = buildOwner();
    owner.registerOptionsForType('template', { instantiate: false });
    owner.registerOptionsForType('helper', { singleton: false });
  },

  teardown() {
    runDestroy(component);
    runDestroy(owner);
    owner = component = null;
  }
});

QUnit.test('dashed shorthand helper is resolved from container', function() {
  var HelloWorld = makeHelper(function() {
    return 'hello world';
  });
  owner.register('helper:hello-world', HelloWorld);
  component = Component.extend({
    [OWNER]: owner,
    layout: compile('{{hello-world}}')
  }).create();

  runAppend(component);
  equal(component.$().text(), 'hello world');
});

QUnit.test('dashed helper is resolved from container', function() {
  var HelloWorld = Helper.extend({
    compute() {
      return 'hello world';
    }
  });
  owner.register('helper:hello-world', HelloWorld);
  component = Component.extend({
    [OWNER]: owner,
    layout: compile('{{hello-world}}')
  }).create();

  runAppend(component);
  equal(component.$().text(), 'hello world');
});

QUnit.test('dashed helper can recompute a new value', function() {
  var destroyCount = 0;
  var count = 0;
  var helper;
  var HelloWorld = Helper.extend({
    init() {
      this._super(...arguments);
      helper = this;
    },
    compute() {
      return ++count;
    },
    destroy() {
      destroyCount++;
      this._super();
    }
  });
  owner.register('helper:hello-world', HelloWorld);
  component = Component.extend({
    [OWNER]: owner,
    layout: compile('{{hello-world}}')
  }).create();

  runAppend(component);
  equal(component.$().text(), '1');
  run(function() {
    helper.recompute();
  });
  equal(component.$().text(), '2');
  equal(destroyCount, 0, 'destroy is not called on recomputation');
});

QUnit.test('dashed helper with arg can recompute a new value', function() {
  var destroyCount = 0;
  var count = 0;
  var helper;
  var HelloWorld = Helper.extend({
    init() {
      this._super(...arguments);
      helper = this;
    },
    compute() {
      return ++count;
    },
    destroy() {
      destroyCount++;
      this._super();
    }
  });
  owner.register('helper:hello-world', HelloWorld);
  component = Component.extend({
    [OWNER]: owner,
    layout: compile('{{hello-world "whut"}}')
  }).create();

  runAppend(component);
  equal(component.$().text(), '1');
  run(function() {
    helper.recompute();
  });
  equal(component.$().text(), '2');
  equal(destroyCount, 0, 'destroy is not called on recomputation');
});

QUnit.test('dashed shorthand helper is called for param changes', function() {
  var count = 0;
  var HelloWorld = makeHelper(function() {
    return ++count;
  });
  owner.register('helper:hello-world', HelloWorld);
  component = Component.extend({
    [OWNER]: owner,
    name: 'bob',
    layout: compile('{{hello-world name}}')
  }).create();

  runAppend(component);
  equal(component.$().text(), '1');
  run(function() {
    component.set('name', 'sal');
  });
  equal(component.$().text(), '2');
});

QUnit.test('dashed helper compute is called for param changes', function() {
  var count = 0;
  var createCount = 0;
  var HelloWorld = Helper.extend({
    init() {
      this._super(...arguments);
      // FIXME: Ideally, the helper instance does not need to be recreated
      // for change of params.
      createCount++;
    },
    compute() {
      return ++count;
    }
  });
  owner.register('helper:hello-world', HelloWorld);
  component = Component.extend({
    [OWNER]: owner,
    name: 'bob',
    layout: compile('{{hello-world name}}')
  }).create();

  runAppend(component);
  equal(component.$().text(), '1');
  run(function() {
    component.set('name', 'sal');
  });
  equal(component.$().text(), '2');
  equal(createCount, 1, 'helper is only created once');
});

QUnit.test('dashed shorthand helper receives params, hash', function() {
  var params, hash;
  var HelloWorld = makeHelper(function(_params, _hash) {
    params = _params;
    hash = _hash;
  });
  owner.register('helper:hello-world', HelloWorld);
  component = Component.extend({
    [OWNER]: owner,
    name: 'bob',
    layout: compile('{{hello-world name "rich" last="sam"}}')
  }).create();

  runAppend(component);

  equal(params[0], 'bob', 'first argument is bob');
  equal(params[1], 'rich', 'second argument is rich');
  equal(hash.last, 'sam', 'hash.last argument is sam');
});

QUnit.test('dashed helper receives params, hash', function() {
  var params, hash;
  var HelloWorld = Helper.extend({
    compute(_params, _hash) {
      params = _params;
      hash = _hash;
    }
  });
  owner.register('helper:hello-world', HelloWorld);
  component = Component.extend({
    [OWNER]: owner,
    name: 'bob',
    layout: compile('{{hello-world name "rich" last="sam"}}')
  }).create();

  runAppend(component);

  equal(params[0], 'bob', 'first argument is bob');
  equal(params[1], 'rich', 'second argument is rich');
  equal(hash.last, 'sam', 'hash.last argument is sam');
});

QUnit.test('dashed helper usable in subexpressions', function() {
  var JoinWords = Helper.extend({
    compute(params) {
      return params.join(' ');
    }
  });
  owner.register('helper:join-words', JoinWords);
  component = Component.extend({
    [OWNER]: owner,
    layout: compile(
      `{{join-words "Who"
                   (join-words "overcomes" "by")
                   "force"
                   (join-words (join-words "hath overcome but" "half"))
                   (join-words "his" (join-words "foe"))}}`)
  }).create();

  runAppend(component);

  equal(component.$().text(),
    'Who overcomes by force hath overcome but half his foe');
});

QUnit.test('dashed helper not usable with a block', function() {
  var SomeHelper = makeHelper(function() {});
  owner.register('helper:some-helper', SomeHelper);
  component = Component.extend({
    [OWNER]: owner,
    layout: compile(`{{#some-helper}}{{/some-helper}}`)
  }).create();

  expectAssertion(function() {
    runAppend(component);
  }, /Helpers may not be used in the block form/);
});

QUnit.test('dashed helper not usable within element', function() {
  var SomeHelper = makeHelper(function() {});
  owner.register('helper:some-helper', SomeHelper);
  component = Component.extend({
    [OWNER]: owner,
    layout: compile(`<div {{some-helper}}></div>`)
  }).create();

  expectAssertion(function() {
    runAppend(component);
  }, /Helpers may not be used in the element form/);
});

QUnit.test('dashed helper is torn down', function() {
  var destroyCalled = 0;
  var SomeHelper = Helper.extend({
    destroy() {
      destroyCalled++;
      this._super.apply(this, arguments);
    },
    compute() {
      return 'must define a compute';
    }
  });
  owner.register('helper:some-helper', SomeHelper);
  component = Component.extend({
    [OWNER]: owner,
    layout: compile(`{{some-helper}}`)
  }).create();

  runAppend(component);
  runDestroy(component);

  equal(destroyCalled, 1, 'destroy called once');
});

QUnit.test('dashed helper used in subexpression can recompute', function() {
  var helper;
  var phrase = 'overcomes by';
  var DynamicSegment = Helper.extend({
    init() {
      this._super(...arguments);
      helper = this;
    },
    compute() {
      return phrase;
    }
  });
  var JoinWords = Helper.extend({
    compute(params) {
      return params.join(' ');
    }
  });
  owner.register('helper:dynamic-segment', DynamicSegment);
  owner.register('helper:join-words', JoinWords);
  component = Component.extend({
    [OWNER]: owner,
    layout: compile(
      `{{join-words "Who"
                   (dynamic-segment)
                   "force"
                   (join-words (join-words "hath overcome but" "half"))
                   (join-words "his" (join-words "foe"))}}`)
  }).create();

  runAppend(component);

  equal(component.$().text(),
    'Who overcomes by force hath overcome but half his foe');

  phrase = 'believes his';
  run(function() {
    helper.recompute();
  });

  equal(component.$().text(),
    'Who believes his force hath overcome but half his foe');
});

QUnit.test('dashed helper used in subexpression can recompute component', function() {
  var helper;
  var phrase = 'overcomes by';
  var DynamicSegment = Helper.extend({
    init() {
      this._super(...arguments);
      helper = this;
    },
    compute() {
      return phrase;
    }
  });
  var JoinWords = Helper.extend({
    compute(params) {
      return params.join(' ');
    }
  });
  owner.register('component-lookup:main', ComponentLookup);
  owner.register('component:some-component', Component.extend({
    layout: compile('{{first}} {{second}} {{third}} {{fourth}} {{fifth}}')
  }));
  owner.register('helper:dynamic-segment', DynamicSegment);
  owner.register('helper:join-words', JoinWords);
  component = Component.extend({
    [OWNER]: owner,
    layout: compile(
      `{{some-component first="Who"
                   second=(dynamic-segment)
                   third="force"
                   fourth=(join-words (join-words "hath overcome but" "half"))
                   fifth=(join-words "his" (join-words "foe"))}}`)
  }).create();

  runAppend(component);

  equal(component.$().text(),
    'Who overcomes by force hath overcome but half his foe');

  phrase = 'believes his';
  run(function() {
    helper.recompute();
  });

  equal(component.$().text(),
    'Who believes his force hath overcome but half his foe');
});

QUnit.test('dashed helper used in subexpression is destroyed', function() {
  var destroyCount = 0;
  var DynamicSegment = Helper.extend({
    phrase: 'overcomes by',
    compute() {
      return this.phrase;
    },
    destroy() {
      destroyCount++;
      this._super(...arguments);
    }
  });
  var JoinWords = makeHelper(function(params) {
    return params.join(' ');
  });
  owner.register('helper:dynamic-segment', DynamicSegment);
  owner.register('helper:join-words', JoinWords);
  component = Component.extend({
    [OWNER]: owner,
    layout: compile(
      `{{join-words "Who"
                   (dynamic-segment)
                   "force"
                   (join-words (join-words "hath overcome but" "half"))
                   (join-words "his" (join-words "foe"))}}`)
  }).create();

  runAppend(component);
  runDestroy(component);

  equal(destroyCount, 1, 'destroy is called after a view is destroyed');
});

/*jshint newcap:false*/
import EmberView from 'ember-views/views/view';
import EmberComponent from 'ember-views/components/component';
import EmberObject from 'ember-runtime/system/object';

import { A } from 'ember-runtime/system/native_array';
import Ember from 'ember-metal/core';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import run from 'ember-metal/run_loop';
import compile from 'ember-template-compiler/system/compile';
import Helper, { helper } from 'ember-htmlbars/helper';

import { Registry } from 'ember-runtime/system/container';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';

var view, lookup, registry, container;
var originalLookup = Ember.lookup;

QUnit.module('ember-htmlbars: {{#unbound}} helper', {
  setup() {
    Ember.lookup = lookup = { Ember: Ember };
    registry = new Registry();
    container = registry.container();

    view = EmberView.create({
      container,
      template: compile('{{unbound foo}} {{unbound bar}}'),
      context: EmberObject.create({
        foo: 'BORK',
        barBinding: 'foo'
      })
    });

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
    runDestroy(container);
    registry = container = view = null;
    Ember.lookup = originalLookup;
  }
});

QUnit.test('it should render the current value of a property on the context', function() {
  equal(view.$().text(), 'BORK BORK', 'should render the current value of a property');
});

QUnit.test('it should not re-render if the property changes', function() {
  run(function() {
    view.set('context.foo', 'OOF');
  });
  equal(view.$().text(), 'BORK BORK', 'should not re-render if the property changes');
});

QUnit.test('it should not re-render if the parent view rerenders', function() {
  run(function() {
    view.set('context.foo', 'OOF');
    view.rerender();
  });
  equal(view.$().text(), 'OOF OOF', 'should re-render if the parent view rerenders');
});

QUnit.test('it should assert unbound cannot be called with multiple arguments', function() {
  expectAssertion(function() {
    runAppend(EmberView.create({
      template: compile('{{unbound foo bar}}'),
      context: EmberObject.create({
        foo: 'BORK',
        bar: 'foo'
      })
    }));
  }, /unbound helper cannot be called with multiple params or hash params/);
});

QUnit.test('should property escape unsafe hrefs', function() {
  /* jshint scripturl:true */

  expect(3);

  runDestroy(view);

  view = EmberView.create({
    template: compile('<ul>{{#each view.people as |person|}}<a href="{{unbound person.url}}">{{person.name}}</a>{{/each}}</ul>'),
    people: A([{
      name: 'Bob',
      url: 'javascript:bob-is-cool'
    }, {
      name: 'James',
      url: 'vbscript:james-is-cool'
    }, {
      name: 'Richard',
      url: 'javascript:richard-is-cool'
    }])
  });

  runAppend(view);

  var links = view.$('a');
  for (var i = 0, l = links.length; i < l; i++) {
    var link = links[i];
    equal(link.protocol, 'unsafe:', 'properly escaped');
  }
});

QUnit.test('should render on attributes', function(assert) {
  /* jshint scripturl:true */

  runDestroy(view);

  view = EmberComponent.create({
    layout: compile('<a href={{unbound name}}></a>'),
    name: 'bob'
  });

  runAppend(view);

  run(function() {
    view.set('name', 'rick');
  });
  assert.equal(view.$().html(), '<a href="bob"></a>');
});

QUnit.module('ember-htmlbars: {{#unbound}} helper with container present', {
  setup() {
    Ember.lookup = lookup = { Ember: Ember };
    registry = new Registry();
    container = registry.container();

    view = EmberView.create({
      container,
      template: compile('{{unbound foo}}'),
      context: EmberObject.create({
        foo: 'bleep'
      })
    });
  },

  teardown() {
    runDestroy(view);
    runDestroy(container);
    container = registry = view = null;
    Ember.lookup = originalLookup;
  }
});

QUnit.test('it should render the current value of a property path on the context', function() {
  runAppend(view);
  equal(view.$().text(), 'bleep', 'should render the current value of a property path');
});

QUnit.module('ember-htmlbars: {{#unbound}} subexpression', {
  setup() {
    Ember.lookup = lookup = { Ember: Ember };
    registry = new Registry();
    container = registry.container();

    registry.register('helper:-capitalize', helper(function(params) {
      return params[0].toUpperCase();
    }));

    view = EmberView.create({
      container,
      template: compile('{{-capitalize (unbound foo)}}'),
      context: EmberObject.create({
        foo: 'bork'
      })
    });

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
    runDestroy(container);
    registry = container = view = null;
    Ember.lookup = originalLookup;
  }
});

QUnit.test('it should render the current value of a property on the context', function() {
  equal(view.$().text(), 'BORK', 'should render the current value of a property');
});

QUnit.test('it should not re-render if the property changes', function() {
  run(function() {
    view.set('context.foo', 'oof');
  });
  equal(view.$().text(), 'BORK', 'should not re-render if the property changes');
});

QUnit.test('it should not re-render if the parent view rerenders', function() {
  run(function() {
    view.set('context.foo', 'oof');
    view.rerender();
  });
  equal(view.$().text(), 'BORK', 'should not re-render if the parent view rerenders');
});

QUnit.module('ember-htmlbars: {{#unbound}} subexpression - helper form', {
  setup() {
    Ember.lookup = lookup = { Ember: Ember };
    registry = new Registry();
    container = registry.container();

    registry.register('helper:-capitalize', helper(function(params) {
      return params[0].toUpperCase();
    }));

    registry.register('helper:-doublize', helper(function(params) {
      return `${params[0]} ${params[0]}`;
    }));

    view = EmberView.create({
      container,
      template: compile('{{-capitalize (unbound (-doublize foo))}}'),
      context: EmberObject.create({
        foo: 'bork'
      })
    });

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
    runDestroy(container);
    registry = container = view = null;
    Ember.lookup = originalLookup;
  }
});

QUnit.test('it should render the current value of a property on the context', function() {
  equal(view.$().text(), 'BORK BORK', 'should render the current value of a property');
});

QUnit.test('it should not re-render if the property changes', function() {
  run(function() {
    view.set('context.foo', 'oof');
  });
  equal(view.$().text(), 'BORK BORK', 'should not re-render if the property changes');
});

QUnit.test('it should re-render if the parent view rerenders', function() {
  run(function() {
    view.set('context.foo', 'oof');
    view.rerender();
  });
  equal(view.$().text(), 'BORK BORK', 'should not re-render if the parent view rerenders');
});

QUnit.module('ember-htmlbars: {{#unbound boundHelper arg1 arg2... argN}} form: render unbound helper invocations', {
  setup() {
    Ember.lookup = lookup = { Ember: Ember };
    registry = new Registry();
    container = registry.container();

    registry.register('helper:-surround', helper(function([prefix, value, suffix]) {
      return prefix + '-' + value + '-' + suffix;
    }));

    registry.register('helper:-capitalize', helper(function([value]) {
      return value.toUpperCase();
    }));

    registry.register('helper:-capitalizeName', Helper.extend({
      destroy() {
        this.removeObserver('value.firstName');
        this._super(...arguments);
      },
      compute([value]) {
        if (this.get('value')) {
          this.removeObserver('value.firstName');
        }
        this.set('value', value);
        this.addObserver('value.firstName', this, this.recompute);
        return (value ? get(value, 'firstName').toUpperCase() : '');
      }
    }));

    registry.register('helper:-fauxconcat', helper(function(params) {
      return params.join('');
    }));

    registry.register('helper:-concatNames', Helper.extend({
      destroy() {
        this.teardown();
        this._super(...arguments);
      },
      teardown() {
        this.removeObserver('value.firstName');
        this.removeObserver('value.lastName');
      },
      compute([value]) {
        if (this.get('value')) {
          this.teardown();
        }
        this.set('value', value);
        this.addObserver('value.firstName', this, this.recompute);
        this.addObserver('value.lastName', this, this.recompute);
        return (value ? get(value, 'firstName') : '') + (value ? get(value, 'lastName') : '');
      }
    }));
  },

  teardown() {
    runDestroy(view);
    runDestroy(container);
    registry = container = view = null;
    Ember.lookup = originalLookup;
  }
});

QUnit.test('should be able to render an unbound helper invocation', function() {
  registry.register('helper:-repeat', helper(function([value], { count }) {
    var a = [];
    while (a.length < count) {
      a.push(value);
    }
    return a.join('');
  }));

  view = EmberView.create({
    container,
    template: compile('{{unbound (-repeat foo count=bar)}} {{-repeat foo count=bar}} {{unbound (-repeat foo count=2)}} {{-repeat foo count=4}}'),
    context: EmberObject.create({
      foo: 'X',
      numRepeatsBinding: 'bar',
      bar: 5
    })
  });
  runAppend(view);

  equal(view.$().text(), 'XXXXX XXXXX XX XXXX', 'first render is correct');

  run(function() {
    set(view, 'context.bar', 1);
  });

  equal(view.$().text(), 'XXXXX X XX XXXX', 'only unbound bound options changed');
});

QUnit.test('should be able to render an bound helper invocation mixed with static values', function() {
  view = EmberView.create({
    container,
    template: compile('{{unbound (-surround prefix value "bar")}} {{-surround prefix value "bar"}} {{unbound (-surround "bar" value suffix)}} {{-surround "bar" value suffix}}'),
    context: EmberObject.create({
      prefix: 'before',
      value: 'core',
      suffix: 'after'
    })
  });
  runAppend(view);

  equal(view.$().text(), 'before-core-bar before-core-bar bar-core-after bar-core-after', 'first render is correct');
  run(function() {
    set(view, 'context.prefix', 'beforeChanged');
    set(view, 'context.value', 'coreChanged');
    set(view, 'context.suffix', 'afterChanged');
  });
  equal(view.$().text(), 'before-core-bar beforeChanged-coreChanged-bar bar-core-after bar-coreChanged-afterChanged', 'only bound values change');
});

QUnit.test('should be able to render unbound forms of multi-arg helpers', function() {
  view = EmberView.create({
    container,
    template: compile('{{-fauxconcat foo bar bing}} {{unbound (-fauxconcat foo bar bing)}}'),
    context: EmberObject.create({
      foo: 'a',
      bar: 'b',
      bing: 'c'
    })
  });
  runAppend(view);

  equal(view.$().text(), 'abc abc', 'first render is correct');

  run(function() {
    set(view, 'context.bar', 'X');
  });

  equal(view.$().text(), 'aXc abc', 'unbound helpers/properties stayed the same');
});

QUnit.test('should be able to render an unbound helper invocation for helpers with dependent keys', function() {
  view = EmberView.create({
    container,
    template: compile('{{-capitalizeName person}} {{unbound (-capitalizeName person)}} {{-concatNames person}} {{unbound (-concatNames person)}}'),
    context: EmberObject.create({
      person: EmberObject.create({
        firstName: 'shooby',
        lastName:  'taylor'
      })
    })
  });
  runAppend(view);

  equal(view.$().text(), 'SHOOBY SHOOBY shoobytaylor shoobytaylor', 'first render is correct');

  run(function() {
    set(view, 'context.person.firstName', 'sally');
  });

  equal(view.$().text(), 'SALLY SHOOBY sallytaylor shoobytaylor', 'only bound values change');
});

QUnit.test('should be able to render an unbound helper invocation in #each helper', function() {
  view = EmberView.create({
    container,
    template: compile(
      ['{{#each people as |person|}}',
       '{{-capitalize person.firstName}} {{unbound (-capitalize person.firstName)}}',
       '{{/each}}'].join('')),
    context: {
      people: Ember.A([
        {
          firstName: 'shooby',
          lastName:  'taylor'
        },
        {
          firstName: 'cindy',
          lastName:  'taylor'
        }
      ])
    }
  });
  runAppend(view);

  equal(view.$().text(), 'SHOOBY SHOOBYCINDY CINDY', 'unbound rendered correctly');
});

QUnit.test('should be able to render an unbound helper invocation with bound hash options', function() {
  registry.register('helper:-repeat', helper(function([value]) {
    return [].slice.call(arguments, 0, -1).join('');
  }));

  view = EmberView.create({
    container,
    template: compile('{{-capitalizeName person}} {{unbound (-capitalizeName person)}} {{-concatNames person}} {{unbound (-concatNames person)}}'),
    context: EmberObject.create({
      person: EmberObject.create({
        firstName: 'shooby',
        lastName:  'taylor'
      })
    })
  });
  runAppend(view);

  equal(view.$().text(), 'SHOOBY SHOOBY shoobytaylor shoobytaylor', 'first render is correct');

  run(function() {
    set(view, 'context.person.firstName', 'sally');
  });

  equal(view.$().text(), 'SALLY SHOOBY sallytaylor shoobytaylor', 'only bound values change');
});

QUnit.test('should be able to render bound form of a helper inside unbound form of same helper', function() {
  view = EmberView.create({
    template: compile(
      ['{{#if (unbound foo)}}',
        '{{#if bar}}true{{/if}}',
        '{{#unless bar}}false{{/unless}}',
        '{{/if}}',
        '{{#unless (unbound notfoo)}}',
        '{{#if bar}}true{{/if}}',
        '{{#unless bar}}false{{/unless}}',
        '{{/unless}}'].join('')),
    context: EmberObject.create({
      foo: true,
      notfoo: false,
      bar: true
    })
  });
  runAppend(view);

  equal(view.$().text(), 'truetrue', 'first render is correct');

  run(function() {
    set(view, 'context.bar', false);
  });

  equal(view.$().text(), 'falsefalse', 'bound if and unless inside unbound if/unless are updated');
});

QUnit.module('ember-htmlbars: {{#unbound}} helper -- Container Lookup', {
  setup() {
    Ember.lookup = lookup = { Ember: Ember };
    registry = new Registry();
    container = registry.container();
  },

  teardown() {
    runDestroy(view);
    runDestroy(container);
    registry = container = view = null;
    Ember.lookup = originalLookup;
  }
});

QUnit.test('should lookup helpers in the container', function() {
  registry.register('helper:up-case', helper(function([value]) {
    return value.toUpperCase();
  }));

  view = EmberView.create({
    template: compile('{{unbound (up-case displayText)}}'),
    container,
    context: {
      displayText: 'such awesome'
    }
  });

  runAppend(view);

  equal(view.$().text(), 'SUCH AWESOME', 'proper values were rendered');

  run(function() {
    set(view, 'context.displayText', 'no changes');
  });

  equal(view.$().text(), 'SUCH AWESOME', 'only bound values change');
});

QUnit.test('should be able to output a property without binding', function() {
  var context = {
    content: EmberObject.create({
      anUnboundString: 'No spans here, son.'
    })
  };

  view = EmberView.create({
    context: context,
    template: compile('<div id="first">{{unbound content.anUnboundString}}</div>')
  });

  runAppend(view);

  equal(view.$('#first').html(), 'No spans here, son.');
});

QUnit.test('should be able to use unbound helper in #each helper', function() {
  view = EmberView.create({
    items: A(['a', 'b', 'c', 1, 2, 3]),
    template: compile('<ul>{{#each view.items as |item|}}<li>{{unbound item}}</li>{{/each}}</ul>')
  });

  runAppend(view);

  equal(view.$().text(), 'abc123');
  equal(view.$('li').children().length, 0, 'No markers');
});

QUnit.test('should be able to use unbound helper in #each helper (with objects)', function() {
  view = EmberView.create({
    items: A([{ wham: 'bam' }, { wham: 1 }]),
    template: compile('<ul>{{#each view.items as |item|}}<li>{{unbound item.wham}}</li>{{/each}}</ul>')
  });

  runAppend(view);

  equal(view.$().text(), 'bam1');
  equal(view.$('li').children().length, 0, 'No markers');
});

QUnit.test('should work properly with attributes', function() {
  expect(4);

  view = EmberView.create({
    template: compile('<ul>{{#each view.people as |person|}}<li class="{{unbound person.cool}}">{{person.name}}</li>{{/each}}</ul>'),
    people: A([{
      name: 'Bob',
      cool: 'not-cool'
    }, {
      name: 'James',
      cool: 'is-cool'
    }, {
      name: 'Richard',
      cool: 'is-cool'
    }])
  });

  runAppend(view);

  equal(view.$('li.not-cool').length, 1, 'correct number of not cool people');
  equal(view.$('li.is-cool').length, 2, 'correct number of cool people');

  run(function() {
    set(view, 'people.firstObject.cool', 'is-cool');
  });

  equal(view.$('li.not-cool').length, 1, 'correct number of not cool people');
  equal(view.$('li.is-cool').length, 2, 'correct number of cool people');
});

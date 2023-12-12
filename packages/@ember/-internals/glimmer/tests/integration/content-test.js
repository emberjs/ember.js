import { DEBUG } from '@glimmer/env';

import { RenderingTestCase, moduleFor, applyMixins, classes, runTask } from 'internal-test-helpers';

import { set, computed } from '@ember/object';
import { getDebugFunction, setDebugFunction } from '@ember/debug';
import EmberObject from '@ember/object';
import { readOnly } from '@ember/object/computed';
import ObjectProxy from '@ember/object/proxy';
import { constructStyleDeprecationMessage } from '@ember/-internals/views';
import { Component, SafeString, htmlSafe } from '../utils/helpers';

const EMPTY = Object.freeze({});

const LITERALS = [
  ['foo', 'foo', '"foo"'],
  [undefined, EMPTY],
  [null, EMPTY],
  [true, 'true'],
  [false, 'false'],
  [0, '0'],
  [-0, '0', '-0'],
  [1, '1'],
  [-1, '-1'],
  [0.0, '0', '0.0'],
  [0.5, '0.5', '0.5'],
  [0.5, '0.5', '0.500000000000000000000000000000'],

  // Kris Selden: that is a good one because it is above that 3 bit area,
  // but the shifted < 0 check doesn't return true:
  // https://github.com/glimmerjs/glimmer-vm/blob/761e78b2bef5de8b9b19ae5fb296380c21959ef8/packages/%40glimmer/opcode-compiler/lib/opcode-builder/encoder.ts#L277
  [536870912, '536870912'],

  // Kris Selden: various other 10000000 and 1111111 combos
  [4294967296, '4294967296'],
  [4294967295, '4294967295'],
  [4294967294, '4294967294'],
  [536870913, '536870913'],
  [536870911, '536870911'],
  [268435455, '268435455'],
];

let i = Number.MAX_SAFE_INTEGER;

while (i > 1) {
  LITERALS.push([i, `${i}`, `${i}`]);
  i = Math.round(i / 2);
}

i = Number.MIN_SAFE_INTEGER;

while (i < -1) {
  LITERALS.push([i, `${i}`, `${i}`]);
  i = Math.round(i / 2);
}

class StaticContentTest extends RenderingTestCase {
  ['@test it can render a static text node']() {
    this.render('hello');
    let text1 = this.assertTextNode(this.firstChild, 'hello');

    runTask(() => this.rerender());

    let text2 = this.assertTextNode(this.firstChild, 'hello');

    this.assertSameNode(text1, text2);
  }

  ['@test it can render a static element']() {
    this.render('<p>hello</p>');
    let p1 = this.assertElement(this.firstChild, { tagName: 'p' });
    let text1 = this.assertTextNode(this.firstChild.firstChild, 'hello');

    runTask(() => this.rerender());

    let p2 = this.assertElement(this.firstChild, { tagName: 'p' });
    let text2 = this.assertTextNode(this.firstChild.firstChild, 'hello');

    this.assertSameNode(p1, p2);
    this.assertSameNode(text1, text2);
  }

  ['@test it can render a static template']() {
    let template = `
    <div class="header">
      <h1>Welcome to Ember.js</h1>
    </div>
    <div class="body">
      <h2>Why you should use Ember.js?</h2>
      <ol>
        <li>It's great</li>
        <li>It's awesome</li>
        <li>It's Ember.js</li>
      </ol>
    </div>
    <div class="footer">
      Ember.js is free, open source and always will be.
    </div>
  `;

    this.render(template);
    this.assertHTML(template);

    runTask(() => this.rerender());

    this.assertHTML(template);
  }
}

class StaticContentTestGenerator {
  constructor(cases, tag = '@test') {
    this.cases = cases;
    this.tag = tag;
  }

  generate([value, expected, label]) {
    let tag = this.tag;
    label = label || value;

    return {
      [`${tag} rendering {{${label}}}`]() {
        this.render(`{{${label}}}`);

        if (expected === EMPTY) {
          this.assertHTML('');
        } else {
          this.assertHTML(expected);
        }

        this.assertStableRerender();
      },

      [`${tag} rendering {{to-js ${label}}}`](assert) {
        this.registerHelper('to-js', ([actual]) => {
          assert.strictEqual(actual, value);
          return actual;
        });

        this.render(`{{to-js ${label}}}`);

        if (expected === EMPTY) {
          this.assertHTML('');
        } else {
          this.assertHTML(expected);
        }

        this.assertStableRerender();
      },
    };
  }
}

applyMixins(StaticContentTest, new StaticContentTestGenerator(LITERALS));

moduleFor('Static content tests', StaticContentTest);

class DynamicContentTest extends RenderingTestCase {
  /* abstract */
  renderPath(/* path, context = {} */) {
    throw new Error('Not implemented: `renderValues`');
  }

  assertIsEmpty() {
    this.assert.strictEqual(this.firstChild, null);
  }

  /* abstract */
  assertContent(/* content */) {
    throw new Error('Not implemented: `assertContent`');
  }

  ['@test it can render a dynamic path']() {
    this.renderPath('this.message', { message: 'hello' });

    this.assertContent('hello');

    this.assertStableRerender();

    runTask(() => set(this.context, 'message', 'goodbye'));

    this.assertContent('goodbye');
    this.assertInvariants();

    runTask(() => set(this.context, 'message', 'hello'));

    this.assertContent('hello');
    this.assertInvariants();
  }

  ['@test resolves the string length properly']() {
    this.render('<p>{{this.foo.length}}</p>', { foo: undefined });

    this.assertHTML('<p></p>');

    this.assertStableRerender();

    runTask(() => set(this.context, 'foo', 'foo'));

    this.assertHTML('<p>3</p>');

    runTask(() => set(this.context, 'foo', ''));

    this.assertHTML('<p>0</p>');

    runTask(() => set(this.context, 'foo', undefined));

    this.assertHTML('<p></p>');
  }

  ['@test resolves the array length properly']() {
    this.render('<p>{{this.foo.length}}</p>', { foo: undefined });

    this.assertHTML('<p></p>');

    this.assertStableRerender();

    runTask(() => set(this.context, 'foo', [1, 2, 3]));

    this.assertHTML('<p>3</p>');

    runTask(() => set(this.context, 'foo', []));

    this.assertHTML('<p>0</p>');

    runTask(() => set(this.context, 'foo', undefined));

    this.assertHTML('<p></p>');
  }

  ['@test it can render a capitalized path with no deprecation']() {
    expectNoDeprecation();

    this.renderPath('this.CaptializedPath', { CaptializedPath: 'no deprecation' });

    this.assertContent('no deprecation');

    this.assertStableRerender();

    runTask(() => set(this.context, 'CaptializedPath', 'still no deprecation'));

    this.assertContent('still no deprecation');
    this.assertInvariants();

    runTask(() => set(this.context, 'CaptializedPath', 'no deprecation'));

    this.assertContent('no deprecation');
    this.assertInvariants();
  }

  ['@test it can render undefined dynamic paths']() {
    this.renderPath('this.name', {});

    this.assertIsEmpty();

    this.assertStableRerender();

    runTask(() => set(this.context, 'name', 'foo-bar'));

    this.assertContent('foo-bar');

    runTask(() => set(this.context, 'name', undefined));

    this.assertIsEmpty();
  }

  ['@test it can render a deeply nested dynamic path']() {
    this.renderPath('this.a.b.c.d.e.f', {
      a: { b: { c: { d: { e: { f: 'hello' } } } } },
    });

    this.assertContent('hello');

    this.assertStableRerender();

    runTask(() => set(this.context, 'a.b.c.d.e.f', 'goodbye'));

    this.assertContent('goodbye');
    this.assertInvariants();

    runTask(() => set(this.context, 'a.b.c.d', { e: { f: 'aloha' } }));

    this.assertContent('aloha');
    this.assertInvariants();

    runTask(() => {
      set(this.context, 'a', { b: { c: { d: { e: { f: 'hello' } } } } });
    });

    this.assertContent('hello');
    this.assertInvariants();
  }

  ['@test it can render a computed property']() {
    let Formatter = EmberObject.extend({
      formattedMessage: computed('message', function () {
        return this.get('message').toUpperCase();
      }),
    });

    let m = Formatter.create({ message: 'hello' });

    this.renderPath('this.m.formattedMessage', { m });

    this.assertContent('HELLO');

    this.assertStableRerender();

    runTask(() => set(m, 'message', 'goodbye'));

    this.assertContent('GOODBYE');
    this.assertInvariants();

    runTask(() => set(this.context, 'm', Formatter.create({ message: 'hello' })));

    this.assertContent('HELLO');
    this.assertInvariants();
  }

  ['@test it can render a computed property with nested dependency']() {
    let Formatter = EmberObject.extend({
      formattedMessage: computed('messenger.message', function () {
        return this.get('messenger.message').toUpperCase();
      }),
    });

    let m = Formatter.create({ messenger: { message: 'hello' } });

    this.renderPath('this.m.formattedMessage', { m });

    this.assertContent('HELLO');

    this.assertStableRerender();

    runTask(() => set(m, 'messenger.message', 'goodbye'));

    this.assertContent('GOODBYE');
    this.assertInvariants();

    runTask(() => set(this.context, 'm', Formatter.create({ messenger: { message: 'hello' } })));

    this.assertContent('HELLO');
    this.assertInvariants();
  }

  ['@test it can read from a proxy object']() {
    this.renderPath('this.proxy.name', {
      proxy: ObjectProxy.create({ content: { name: 'Tom Dale' } }),
    });

    this.assertContent('Tom Dale');

    this.assertStableRerender();

    runTask(() => set(this.context, 'proxy.content.name', 'Yehuda Katz'));

    this.assertContent('Yehuda Katz');
    this.assertInvariants();

    runTask(() => set(this.context, 'proxy.content', { name: 'Godfrey Chan' }));

    this.assertContent('Godfrey Chan');
    this.assertInvariants();

    runTask(() => set(this.context, 'proxy.name', 'Stefan Penner'));

    this.assertContent('Stefan Penner');
    this.assertInvariants();

    runTask(() => set(this.context, 'proxy.content', null));

    this.assertIsEmpty();

    runTask(() =>
      set(this.context, 'proxy', ObjectProxy.create({ content: { name: 'Tom Dale' } }))
    );

    this.assertContent('Tom Dale');
    this.assertInvariants();
  }

  ['@test it can read from a nested path in a proxy object']() {
    this.renderPath('this.proxy.name.last', {
      proxy: ObjectProxy.create({
        content: { name: { first: 'Tom', last: 'Dale' } },
      }),
    });

    this.assertContent('Dale');

    this.assertStableRerender();

    runTask(() => set(this.context, 'proxy.content.name.last', 'Cruise'));

    this.assertContent('Cruise');
    this.assertInvariants();

    runTask(() => set(this.context, 'proxy.content.name.first', 'Suri'));

    this.assertStableRerender();

    runTask(() => set(this.context, 'proxy.content.name', { first: 'Yehuda', last: 'Katz' }));

    this.assertContent('Katz');
    this.assertInvariants();

    runTask(() =>
      set(this.context, 'proxy.content', {
        name: { first: 'Godfrey', last: 'Chan' },
      })
    );

    this.assertContent('Chan');
    this.assertInvariants();

    runTask(() => set(this.context, 'proxy.name', { first: 'Stefan', last: 'Penner' }));

    this.assertContent('Penner');
    this.assertInvariants();

    runTask(() => set(this.context, 'proxy', null));

    this.assertIsEmpty();

    runTask(() =>
      set(
        this.context,
        'proxy',
        ObjectProxy.create({
          content: { name: { first: 'Tom', last: 'Dale' } },
        })
      )
    );

    this.assertContent('Dale');
    this.assertInvariants();
  }

  ['@test it can read from a path flipping between a proxy and a real object']() {
    this.renderPath('this.proxyOrObject.name.last', {
      proxyOrObject: ObjectProxy.create({
        content: { name: { first: 'Tom', last: 'Dale' } },
      }),
    });

    this.assertContent('Dale');

    this.assertStableRerender();

    runTask(() =>
      set(this.context, 'proxyOrObject', {
        name: { first: 'Tom', last: 'Dale' },
      })
    );

    this.assertStableRerender();

    runTask(() => set(this.context, 'proxyOrObject.name.last', 'Cruise'));

    this.assertContent('Cruise');
    this.assertInvariants();

    runTask(() => set(this.context, 'proxyOrObject.name.first', 'Suri'));

    this.assertStableRerender();

    runTask(() =>
      set(this.context, 'proxyOrObject', {
        name: { first: 'Yehuda', last: 'Katz' },
      })
    );

    this.assertContent('Katz');
    this.assertInvariants();

    runTask(() =>
      set(
        this.context,
        'proxyOrObject',
        ObjectProxy.create({
          content: { name: { first: 'Godfrey', last: 'Chan' } },
        })
      )
    );

    this.assertContent('Chan');
    this.assertInvariants();

    runTask(() =>
      set(this.context, 'proxyOrObject.content.name', {
        first: 'Stefan',
        last: 'Penner',
      })
    );

    this.assertContent('Penner');
    this.assertInvariants();

    runTask(() => set(this.context, 'proxyOrObject', null));

    this.assertIsEmpty();

    runTask(() =>
      set(
        this.context,
        'proxyOrObject',
        ObjectProxy.create({
          content: { name: { first: 'Tom', last: 'Dale' } },
        })
      )
    );

    this.assertContent('Dale');
    this.assertInvariants();
  }

  ['@test it can read from a path flipping between a real object and a proxy']() {
    this.renderPath('this.objectOrProxy.name.last', {
      objectOrProxy: { name: { first: 'Tom', last: 'Dale' } },
    });

    this.assertContent('Dale');

    this.assertStableRerender();

    runTask(() =>
      set(
        this.context,
        'objectOrProxy',
        ObjectProxy.create({
          content: { name: { first: 'Tom', last: 'Dale' } },
        })
      )
    );

    this.assertStableRerender();

    runTask(() => set(this.context, 'objectOrProxy.content.name.last', 'Cruise'));

    this.assertContent('Cruise');
    this.assertInvariants();

    runTask(() => set(this.context, 'objectOrProxy.content.name.first', 'Suri'));

    this.assertStableRerender();

    runTask(() =>
      set(this.context, 'objectOrProxy.content', {
        name: { first: 'Yehuda', last: 'Katz' },
      })
    );

    this.assertContent('Katz');
    this.assertInvariants();

    runTask(() =>
      set(this.context, 'objectOrProxy', {
        name: { first: 'Godfrey', last: 'Chan' },
      })
    );

    this.assertContent('Chan');
    this.assertInvariants();

    runTask(() =>
      set(this.context, 'objectOrProxy.name', {
        first: 'Stefan',
        last: 'Penner',
      })
    );

    this.assertContent('Penner');
    this.assertInvariants();

    runTask(() => set(this.context, 'objectOrProxy', null));

    this.assertIsEmpty();

    runTask(() =>
      set(this.context, 'objectOrProxy', {
        name: { first: 'Tom', last: 'Dale' },
      })
    );

    this.assertContent('Dale');
    this.assertInvariants();
  }

  ['@test it can read from a null object']() {
    let nullObject = Object.create(null);
    nullObject['message'] = 'hello';

    this.renderPath('this.nullObject.message', { nullObject });

    this.assertContent('hello');

    this.assertStableRerender();

    runTask(() => set(nullObject, 'message', 'goodbye'));

    this.assertContent('goodbye');
    this.assertInvariants();

    nullObject = Object.create(null);
    nullObject['message'] = 'hello';

    runTask(() => set(this.context, 'nullObject', nullObject));

    this.assertContent('hello');
    this.assertInvariants();
  }

  ['@test it can render a readOnly property of a path']() {
    let Messenger = EmberObject.extend({
      message: readOnly('a.b.c'),
    });

    let messenger = Messenger.create({
      a: {
        b: {
          c: 'hello',
        },
      },
    });

    this.renderPath('this.messenger.message', { messenger });

    this.assertContent('hello');

    this.assertStableRerender();

    runTask(() => set(messenger, 'a.b.c', 'hi'));

    this.assertContent('hi');
    this.assertInvariants();

    runTask(() =>
      set(this.context, 'messenger.a.b', {
        c: 'goodbye',
      })
    );

    this.assertContent('goodbye');
    this.assertInvariants();

    runTask(() =>
      set(this.context, 'messenger', {
        message: 'hello',
      })
    );

    this.assertContent('hello');
    this.assertInvariants();
  }

  ['@test it can render a property on a function']() {
    let func = () => {};
    func.aProp = 'this is a property on a function';

    this.renderPath('this.func.aProp', { func });

    this.assertContent('this is a property on a function');

    this.assertStableRerender();

    // runTask(() => set(func, 'aProp', 'still a property on a function'));
    // this.assertContent('still a property on a function');
    // this.assertInvariants();

    // func = () => {};
    // func.aProp = 'a prop on a new function';

    // runTask(() => set(this.context, 'func', func));

    // this.assertContent('a prop on a new function');
    // this.assertInvariants();
  }
}

class DynamicContentTestGenerator {
  constructor(cases, tag = '@test') {
    this.cases = cases;
    this.tag = tag;
  }

  generate([value, expected, label]) {
    let tag = this.tag;
    label = label || value;

    if (expected === EMPTY) {
      return {
        [`${tag} rendering ${label}`]() {
          this.renderPath('this.value', { value });

          this.assertIsEmpty();

          runTask(() => set(this.context, 'value', 'hello'));

          this.assertContent('hello');

          runTask(() => set(this.context, 'value', value));

          this.assertIsEmpty();
        },
      };
    } else {
      return {
        [`${tag} rendering ${label}`]() {
          this.renderPath('this.value', { value });

          // NaN is unstable, not worth optimizing for in the VM
          let wasNaN = typeof value === 'number' && isNaN(value);

          this.assertContent(expected);

          if (!wasNaN) {
            this.assertStableRerender();
          }

          runTask(() => set(this.context, 'value', 'hello'));
          this.assertContent('hello');

          if (!wasNaN) {
            this.assertInvariants();
          }

          runTask(() => set(this.context, 'value', value));

          this.assertContent(expected);

          if (!wasNaN) {
            this.assertInvariants();
          }
        },
      };
    }
  }
}

const SharedContentTestCases = new DynamicContentTestGenerator([
  ...LITERALS,
  [NaN, 'NaN'],
  [new Date(2000, 0, 1), String(new Date(2000, 0, 1)), 'a Date object'],
  [Infinity, 'Infinity'],
  [1 / -0, '-Infinity'],
  [{ foo: 'bar' }, '[object Object]', `{ foo: 'bar' }`],
  [
    {
      toString() {
        return 'foo';
      },
    },
    'foo',
    'an object with a custom toString function',
  ],
  [
    {
      valueOf() {
        return 1;
      },
    },
    '[object Object]',
    'an object with a custom valueOf function',
  ],

  // Escaping tests
  ['<b>Max</b><b>James</b>', '<b>Max</b><b>James</b>'],
]);

let GlimmerContentTestCases = new DynamicContentTestGenerator([
  [Object.create(null), EMPTY, 'an object with no toString'],
  [Symbol('debug'), 'Symbol(debug)', 'a symbol'],
]);

applyMixins(DynamicContentTest, SharedContentTestCases, GlimmerContentTestCases);

moduleFor(
  'Dynamic content tests (content position)',
  class extends DynamicContentTest {
    renderPath(path, context = {}) {
      this.render(`{{${path}}}`, context);
    }

    assertContent(content) {
      this.assert.strictEqual(this.nodesCount, 1, 'It should render exactly one text node');
      this.assertTextNode(this.firstChild, content);
      // this.takeSnapshot();
    }

    ['@test it can render empty safe strings [GH#16314]']() {
      this.render('before {{this.value}} after', { value: htmlSafe('hello') });

      this.assertHTML('before hello after');

      this.assertStableRerender();

      runTask(() => set(this.context, 'value', htmlSafe('')));

      this.assertHTML('before <!----> after');

      runTask(() => set(this.context, 'value', htmlSafe('hello')));

      this.assertHTML('before hello after');
    }
  }
);

moduleFor(
  'Dynamic content tests (content concat)',
  class extends DynamicContentTest {
    renderPath(path, context = {}) {
      this.render(`{{concat "" ${path} ""}}`, context);
    }

    assertContent(content) {
      this.assert.strictEqual(this.nodesCount, 1, 'It should render exactly one text node');
      this.assertTextNode(this.firstChild, content);
    }
  }
);

moduleFor(
  'Dynamic content tests (inside an element)',
  class extends DynamicContentTest {
    renderPath(path, context = {}) {
      this.render(`<p>{{${path}}}</p>`, context);
    }

    assertIsEmpty() {
      this.assert.strictEqual(this.nodesCount, 1, 'It should render exactly one <p> tag');
      this.assertElement(this.firstChild, { tagName: 'p' });
      this.assertText('');
    }

    assertContent(content) {
      this.assert.strictEqual(this.nodesCount, 1, 'It should render exactly one <p> tag');
      this.assertElement(this.firstChild, { tagName: 'p' });
      this.assertText(content);
    }
  }
);

moduleFor(
  'Dynamic content tests (attribute position)',
  class extends DynamicContentTest {
    renderPath(path, context = {}) {
      this.render(`<div data-foo="{{${path}}}"></div>`, context);
    }

    assertIsEmpty() {
      this.assert.strictEqual(this.nodesCount, 1, 'It should render exactly one <div> tag');
      this.assertElement(this.firstChild, { tagName: 'div', content: '' });
    }

    assertContent(content) {
      this.assert.strictEqual(this.nodesCount, 1, 'It should render exactly one <div> tag');
      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo': content },
        content: '',
      });
    }
  }
);

class TrustedContentTest extends DynamicContentTest {
  assertIsEmpty() {
    this.assert.strictEqual(this.firstChild, null);
  }

  assertContent(content) {
    this.assertHTML(content);
  }

  assertStableRerender() {
    this.takeSnapshot();
    runTask(() => this.rerender());
    super.assertInvariants();
  }

  assertInvariants() {
    // If it's not stable, we will wipe out all the content and replace them,
    // so there are no invariants
  }
}

moduleFor(
  'Dynamic content tests (trusted)',
  class extends TrustedContentTest {
    renderPath(path, context = {}) {
      this.render(`{{{${path}}}}`, context);
    }

    ['@test updating trusted curlies']() {
      this.render('{{{this.htmlContent}}}{{{this.nested.htmlContent}}}', {
        htmlContent: '<b>Max</b>',
        nested: { htmlContent: '<b>James</b>' },
      });

      this.assertContent('<b>Max</b><b>James</b>');

      runTask(() => this.rerender());

      this.assertStableRerender();

      runTask(() => set(this.context, 'htmlContent', '<i>M</i><u>a</u><s>x</s>'));

      this.assertContent('<i>M</i><u>a</u><s>x</s><b>James</b>');

      runTask(() => set(this.context, 'nested.htmlContent', 'Jammie'));

      this.assertContent('<i>M</i><u>a</u><s>x</s>Jammie');

      runTask(() => {
        set(this.context, 'htmlContent', '<b>Max</b>');
        set(this.context, 'nested', { htmlContent: '<i>James</i>' });
      });

      this.assertContent('<b>Max</b><i>James</i>');
    }

    ['@test empty content in trusted curlies [GH#14978]']() {
      this.render('before {{{this.value}}} after', {
        value: 'hello',
      });

      this.assertContent('before hello after');

      runTask(() => this.rerender());

      this.assertStableRerender();

      runTask(() => set(this.context, 'value', undefined));

      this.assertContent('before <!----> after');

      runTask(() => set(this.context, 'value', 'hello'));

      this.assertContent('before hello after');

      runTask(() => set(this.context, 'value', null));

      this.assertContent('before <!----> after');

      runTask(() => set(this.context, 'value', 'hello'));

      this.assertContent('before hello after');

      runTask(() => set(this.context, 'value', ''));

      this.assertContent('before <!----> after');

      runTask(() => set(this.context, 'value', 'hello'));

      this.assertContent('before hello after');

      runTask(() => set(this.context, 'value', htmlSafe('')));

      this.assertContent('before <!----> after');

      runTask(() => set(this.context, 'value', 'hello'));

      this.assertContent('before hello after');
    }
  }
);

moduleFor(
  'Dynamic content tests (integration)',
  class extends RenderingTestCase {
    ['@test it can render a dynamic template']() {
      let template = `
      <div class="header">
        <h1>Welcome to {{this.framework}}</h1>
      </div>
      <div class="body">
        <h2>Why you should use {{this.framework}}?</h2>
        <ol>
          <li>It's great</li>
          <li>It's awesome</li>
          <li>It's {{this.framework}}</li>
        </ol>
      </div>
      <div class="footer">
        {{this.framework}} is free, open source and always will be.
      </div>
    `;

      let ember = `
      <div class="header">
        <h1>Welcome to Ember.js</h1>
      </div>
      <div class="body">
        <h2>Why you should use Ember.js?</h2>
        <ol>
          <li>It's great</li>
          <li>It's awesome</li>
          <li>It's Ember.js</li>
        </ol>
      </div>
      <div class="footer">
        Ember.js is free, open source and always will be.
      </div>
    `;

      let react = `
      <div class="header">
        <h1>Welcome to React</h1>
      </div>
      <div class="body">
        <h2>Why you should use React?</h2>
        <ol>
          <li>It's great</li>
          <li>It's awesome</li>
          <li>It's React</li>
        </ol>
      </div>
      <div class="footer">
        React is free, open source and always will be.
      </div>
    `;

      this.render(template, {
        framework: 'Ember.js',
      });
      this.assertHTML(ember);

      runTask(() => this.rerender());

      this.assertHTML(ember);

      runTask(() => set(this.context, 'framework', 'React'));

      this.assertHTML(react);

      runTask(() => set(this.context, 'framework', 'Ember.js'));

      this.assertHTML(ember);
    }

    ['@test it should evaluate to nothing if part of the path is `undefined`']() {
      this.render('{{this.foo.bar.baz.bizz}}', {
        foo: {},
      });

      this.assertText('');

      runTask(() => this.rerender());

      this.assertText('');

      runTask(() =>
        set(this.context, 'foo', {
          bar: { baz: { bizz: 'Hey!' } },
        })
      );

      this.assertText('Hey!');

      runTask(() => set(this.context, 'foo', {}));

      this.assertText('');

      runTask(() =>
        set(this.context, 'foo', {
          bar: { baz: { bizz: 'Hello!' } },
        })
      );

      this.assertText('Hello!');

      runTask(() => set(this.context, 'foo', {}));

      this.assertText('');
    }

    ['@test it should evaluate to nothing if part of the path is a primative']() {
      this.render('{{this.foo.bar.baz.bizz}}', {
        foo: { bar: true },
      });

      this.assertText('');

      runTask(() => this.rerender());

      this.assertText('');

      runTask(() =>
        set(this.context, 'foo', {
          bar: false,
        })
      );

      this.assertText('');

      runTask(() =>
        set(this.context, 'foo', {
          bar: 'Haha',
        })
      );

      this.assertText('');

      runTask(() =>
        set(this.context, 'foo', {
          bar: null,
        })
      );

      this.assertText('');

      runTask(() =>
        set(this.context, 'foo', {
          bar: undefined,
        })
      );

      this.assertText('');

      runTask(() =>
        set(this.context, 'foo', {
          bar: 1,
        })
      );

      this.assertText('');

      runTask(() =>
        set(this.context, 'foo', {
          bar: { baz: { bizz: 'Hello!' } },
        })
      );

      this.assertText('Hello!');

      runTask(() =>
        set(this.context, 'foo', {
          bar: true,
        })
      );

      this.assertText('');
    }

    ['@test can set dynamic href']() {
      this.render('<a href={{this.model.url}}>Example</a>', {
        model: {
          url: 'http://example.com',
        },
      });

      this.assertElement(this.firstChild, {
        tagName: 'a',
        content: 'Example',
        attrs: { href: 'http://example.com' },
      });

      runTask(() => this.rerender());

      this.assertElement(this.firstChild, {
        tagName: 'a',
        content: 'Example',
        attrs: { href: 'http://example.com' },
      });

      runTask(() => set(this.context, 'model.url', 'http://linkedin.com'));

      this.assertElement(this.firstChild, {
        tagName: 'a',
        content: 'Example',
        attrs: { href: 'http://linkedin.com' },
      });

      runTask(() => set(this.context, 'model', { url: 'http://example.com' }));

      this.assertElement(this.firstChild, {
        tagName: 'a',
        content: 'Example',
        attrs: { href: 'http://example.com' },
      });
    }

    ['@test quoteless class attributes update correctly']() {
      this.render('<div class={{if this.fooBar "foo-bar"}}>hello</div>', {
        fooBar: true,
      });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('foo-bar') },
      });

      runTask(() => this.rerender());

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('foo-bar') },
      });

      runTask(() => set(this.context, 'fooBar', false));

      this.assertElement(this.firstChild, { tagName: 'div', content: 'hello' });

      runTask(() => set(this.context, 'fooBar', true));

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('foo-bar') },
      });
    }

    ['@test quoted class attributes update correctly'](assert) {
      this.render('<div class="{{if this.fooBar "foo-bar"}}">hello</div>', {
        fooBar: true,
      });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('foo-bar') },
      });

      runTask(() => this.rerender());

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('foo-bar') },
      });

      runTask(() => set(this.context, 'fooBar', false));

      assert.equal(this.firstChild.className, '');

      runTask(() => set(this.context, 'fooBar', true));

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('foo-bar') },
      });
    }

    ['@test unquoted class attribute can contain multiple classes']() {
      this.render('<div class={{this.model.classes}}>hello</div>', {
        model: {
          classes: 'foo bar baz',
        },
      });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('foo bar baz') },
      });

      runTask(() => this.rerender());

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('foo bar baz') },
      });

      runTask(() => set(this.context, 'model.classes', 'fizz bizz'));

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('fizz bizz') },
      });

      runTask(() => set(this.context, 'model', { classes: 'foo bar baz' }));

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('foo bar baz') },
      });
    }

    ['@test unquoted class attribute']() {
      this.render('<div class={{this.model.foo}}>hello</div>', {
        model: {
          foo: 'foo',
        },
      });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('foo') },
      });

      runTask(() => this.rerender());

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('foo') },
      });

      runTask(() => set(this.context, 'model.foo', 'fizz'));

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('fizz') },
      });

      runTask(() => set(this.context, 'model', { foo: 'foo' }));

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('foo') },
      });
    }

    ['@test quoted class attribute']() {
      this.render('<div class="{{this.model.foo}}">hello</div>', {
        model: {
          foo: 'foo',
        },
      });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('foo') },
      });

      runTask(() => this.rerender());

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('foo') },
      });

      runTask(() => set(this.context, 'model.foo', 'fizz'));

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('fizz') },
      });

      runTask(() => set(this.context, 'model', { foo: 'foo' }));

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('foo') },
      });
    }

    ['@test quoted class attribute can contain multiple classes']() {
      this.render('<div class="{{this.model.classes}}">hello</div>', {
        model: {
          classes: 'foo bar baz',
        },
      });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('foo bar baz') },
      });

      runTask(() => this.rerender());

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('foo bar baz') },
      });

      runTask(() => set(this.context, 'model.classes', 'fizz bizz'));

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('fizz bizz') },
      });

      runTask(() => set(this.context, 'model', { classes: 'foo bar baz' }));

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('foo bar baz') },
      });
    }

    ['@test class attribute concats bound values']() {
      this.render(
        '<div class="{{this.model.foo}} {{this.model.bar}} {{this.model.bizz}}">hello</div>',
        {
          model: {
            foo: 'foo',
            bar: 'bar',
            bizz: 'bizz',
          },
        }
      );

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('foo bar bizz') },
      });

      runTask(() => this.rerender());

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('foo bar bizz') },
      });

      runTask(() => set(this.context, 'model.foo', 'fizz'));

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('fizz bar bizz') },
      });

      runTask(() => set(this.context, 'model.bar', null));

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('fizz bizz') },
      });

      runTask(() =>
        set(this.context, 'model', {
          foo: 'foo',
          bar: 'bar',
          bizz: 'bizz',
        })
      );

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('foo bar bizz') },
      });
    }

    ['@test class attribute accepts nested helpers, and updates']() {
      this.render(
        `<div class="{{if this.model.hasSize this.model.size}} {{if this.model.hasShape this.model.shape}}">hello</div>`,
        {
          model: {
            size: 'large',
            hasSize: true,
            hasShape: false,
            shape: 'round',
          },
        }
      );

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('large') },
      });

      runTask(() => this.rerender());

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('large') },
      });

      runTask(() => set(this.context, 'model.hasShape', true));

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('large round') },
      });

      runTask(() => set(this.context, 'model.hasSize', false));

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('round') },
      });

      runTask(() =>
        set(this.context, 'model', {
          size: 'large',
          hasSize: true,
          hasShape: false,
          shape: 'round',
        })
      );

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('large') },
      });
    }

    ['@test Multiple dynamic classes']() {
      this.render(
        '<div class="{{this.model.foo}} {{this.model.bar}} {{this.model.fizz}} {{this.model.baz}}">hello</div>',
        {
          model: {
            foo: 'foo',
            bar: 'bar',
            fizz: 'fizz',
            baz: 'baz',
          },
        }
      );

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('foo bar fizz baz') },
      });

      runTask(() => this.rerender());

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('foo bar fizz baz') },
      });

      runTask(() => {
        set(this.context, 'model.foo', null);
        set(this.context, 'model.fizz', null);
      });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('bar baz') },
      });

      runTask(() => {
        set(this.context, 'model', {
          foo: 'foo',
          bar: 'bar',
          fizz: 'fizz',
          baz: 'baz',
        });
      });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: classes('foo bar fizz baz') },
      });
    }

    ['@test classes are ordered: See issue #9912']() {
      this.render('<div class="{{this.model.foo}}  static   {{this.model.bar}}">hello</div>', {
        model: {
          foo: 'foo',
          bar: 'bar',
        },
      });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: 'foo  static   bar' },
      });

      runTask(() => this.rerender());

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: 'foo  static   bar' },
      });

      runTask(() => {
        set(this.context, 'model.bar', null);
      });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: 'foo  static   ' },
      });

      runTask(() => {
        set(this.context, 'model', {
          foo: 'foo',
          bar: 'bar',
        });
      });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { class: 'foo  static   bar' },
      });
    }
  }
);

let warnings, originalWarn;
class StyleTest extends RenderingTestCase {
  constructor() {
    super(...arguments);
    warnings = [];
    originalWarn = getDebugFunction('warn');
    setDebugFunction('warn', function (message, test) {
      if (!test) {
        warnings.push(message);
      }
    });
  }

  teardown() {
    super.teardown(...arguments);
    setDebugFunction('warn', originalWarn);
  }

  assertStyleWarning(style) {
    this.assert.deepEqual(warnings, [constructStyleDeprecationMessage(style)]);
  }

  assertNoWarning() {
    this.assert.deepEqual(warnings, []);
  }
}

moduleFor(
  'Inline style tests',
  class extends StyleTest {
    ['@test can set dynamic style']() {
      this.render('<div style={{this.model.style}}></div>', {
        model: {
          style: htmlSafe('width: 60px;'),
        },
      });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: '',
        attrs: { style: 'width: 60px;' },
      });

      runTask(() => this.rerender());

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: '',
        attrs: { style: 'width: 60px;' },
      });

      runTask(() => set(this.context, 'model.style', 'height: 60px;'));

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: '',
        attrs: { style: 'height: 60px;' },
      });

      runTask(() => set(this.context, 'model.style', null));

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: '',
        attrs: {},
      });

      runTask(() => set(this.context, 'model', { style: 'width: 60px;' }));

      this.assertElement(this.firstChild, {
        tagName: 'div',
        content: '',
        attrs: { style: 'width: 60px;' },
      });
    }
  }
);

if (DEBUG) {
  moduleFor(
    'Inline style tests - warnings',
    class extends StyleTest {
      ['@test specifying <div style={{this.userValue}}></div> generates a warning']() {
        let userValue = 'width: 42px';
        this.render('<div style={{this.userValue}}></div>', {
          userValue,
        });

        this.assertStyleWarning(userValue);
      }

      ['@test specifying `attributeBindings: ["style"]` generates a warning']() {
        let FooBarComponent = Component.extend({
          attributeBindings: ['style'],
        });

        this.registerComponent('foo-bar', {
          ComponentClass: FooBarComponent,
          template: 'hello',
        });
        let userValue = 'width: 42px';
        this.render('{{foo-bar style=this.userValue}}', {
          userValue,
        });

        this.assertStyleWarning(userValue);
      }

      ['@test specifying `<div style={{{this.userValue}}}></div>` works properly without a warning']() {
        this.render('<div style={{{this.userValue}}}></div>', {
          userValue: 'width: 42px',
        });

        this.assertNoWarning();
      }

      ['@test specifying `<div style={{this.userValue}}></div>` works properly with a SafeString']() {
        this.render('<div style={{this.userValue}}></div>', {
          userValue: new SafeString('width: 42px'),
        });

        this.assertNoWarning();
      }

      ['@test null value do not generate htmlsafe warning']() {
        this.render('<div style={{this.userValue}}></div>', {
          userValue: null,
        });

        this.assertNoWarning();
      }

      ['@test undefined value do not generate htmlsafe warning']() {
        this.render('<div style={{this.userValue}}></div>');

        this.assertNoWarning();
      }

      ['@test no warnings are triggered when a safe string is quoted']() {
        this.render('<div style="{{this.userValue}}"></div>', {
          userValue: new SafeString('width: 42px'),
        });

        this.assertNoWarning();
      }

      ['@test binding warning is triggered when an unsafe string is quoted']() {
        let userValue = 'width: 42px';
        this.render('<div style="{{this.userValue}}"></div>', {
          userValue,
        });

        this.assertStyleWarning(userValue);
      }

      ['@test binding warning is triggered when a safe string for a complete property is concatenated in place']() {
        let userValue = 'width: 42px';
        this.render('<div style="color: green; {{this.userValue}}"></div>', {
          userValue: new SafeString('width: 42px'),
        });

        this.assertStyleWarning(`color: green; ${userValue}`);
      }

      ['@test binding warning is triggered when a safe string for a value is concatenated in place']() {
        let userValue = '42px';
        this.render('<div style="color: green; width: {{this.userValue}}"></div>', {
          userValue: new SafeString(userValue),
        });

        this.assertStyleWarning(`color: green; width: ${userValue}`);
      }

      ['@test binding warning is triggered when a safe string for a property name is concatenated in place']() {
        let userValue = 'width';
        this.render('<div style="color: green; {{this.userProperty}}: 42px"></div>', {
          userProperty: new SafeString(userValue),
        });

        this.assertStyleWarning(`color: green; ${userValue}: 42px`);
      }
    }
  );
}

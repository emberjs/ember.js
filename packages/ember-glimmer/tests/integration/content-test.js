/* globals EmberDev */
import { RenderingTest, moduleFor } from '../utils/test-case';
import { applyMixins } from '../utils/abstract-test-case';
import {
  set,
  computed
} from 'ember-metal';
import {
  getDebugFunction,
  setDebugFunction
} from 'ember-debug';
import { Object as EmberObject, ObjectProxy } from 'ember-runtime';
import { classes } from '../utils/test-helpers';
import { constructStyleDeprecationMessage  } from 'ember-views';
import { Component, SafeString } from '../utils/helpers';

moduleFor('Static content tests', class extends RenderingTest {

  ['@test it can render a static text node']() {
    this.render('hello');
    let text1 = this.assertTextNode(this.firstChild, 'hello');

    this.runTask(() => this.rerender());

    let text2 = this.assertTextNode(this.firstChild, 'hello');

    this.assertSameNode(text1, text2);
  }

  ['@test it can render a static element']() {
    this.render('<p>hello</p>');
    let p1 = this.assertElement(this.firstChild, { tagName: 'p' });
    let text1 = this.assertTextNode(this.firstChild.firstChild, 'hello');

    this.runTask(() => this.rerender());

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

    this.runTask(() => this.rerender());

    this.assertHTML(template);
  }

});

class DynamicContentTest extends RenderingTest {
  /* abstract */
  renderPath(path, context = {}) {
    throw new Error('Not implemented: `renderValues`');
  }

  assertIsEmpty() {
    this.assert.strictEqual(this.firstChild, null);
  }

  /* abstract */
  assertContent(content) {
    throw new Error('Not implemented: `assertContent`');
  }

  ['@test it can render a dynamic path']() {
    this.renderPath('message', { message: 'hello' });

    this.assertContent('hello');

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'message', 'goodbye'));

    this.assertContent('goodbye');
    this.assertInvariants();

    this.runTask(() => set(this.context, 'message', 'hello'));

    this.assertContent('hello');
    this.assertInvariants();
  }

  ['@test resolves the string length properly']() {
    this.render('<p>{{foo.length}}</p>', { foo: undefined });

    this.assertHTML('<p></p>');

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'foo', 'foo'));

    this.assertHTML('<p>3</p>');

    this.runTask(() => set(this.context, 'foo', ''));

    this.assertHTML('<p>0</p>');

    this.runTask(() => set(this.context, 'foo', undefined));

    this.assertHTML('<p></p>');
  }

  ['@test resolves the array length properly']() {
    this.render('<p>{{foo.length}}</p>', { foo: undefined });

    this.assertHTML('<p></p>');

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'foo', [1, 2, 3]));

    this.assertHTML('<p>3</p>');

    this.runTask(() => set(this.context, 'foo', []));

    this.assertHTML('<p>0</p>');

    this.runTask(() => set(this.context, 'foo', undefined));

    this.assertHTML('<p></p>');
  }

  ['@test it can render a capitalized path with no deprecation']() {
    expectNoDeprecation();

    this.renderPath('CaptializedPath', { CaptializedPath: 'no deprecation' });

    this.assertContent('no deprecation');

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'CaptializedPath', 'still no deprecation'));

    this.assertContent('still no deprecation');
    this.assertInvariants();

    this.runTask(() => set(this.context, 'CaptializedPath', 'no deprecation'));

    this.assertContent('no deprecation');
    this.assertInvariants();
  }

  ['@test it can render undefined dynamic paths']() {
    this.renderPath('name', {});

    this.assertIsEmpty();

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'name', 'foo-bar'));

    this.assertContent('foo-bar');

    this.runTask(() => set(this.context, 'name', undefined));

    this.assertIsEmpty();
  }

  ['@test it can render a deeply nested dynamic path']() {
    this.renderPath('a.b.c.d.e.f', {
      a: { b: { c: { d: { e: { f: 'hello' } } } } }
    });

    this.assertContent('hello');

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'a.b.c.d.e.f', 'goodbye'));

    this.assertContent('goodbye');
    this.assertInvariants();

    this.runTask(() => set(this.context, 'a.b.c.d', { e: { f: 'aloha' } }));

    this.assertContent('aloha');
    this.assertInvariants();

    this.runTask(() => {
      set(this.context, 'a',
        { b: { c: { d: { e: { f: 'hello' } } } } }
      );
    });

    this.assertContent('hello');
    this.assertInvariants();
  }

  ['@test it can render a computed property']() {
    let Formatter = EmberObject.extend({
      formattedMessage: computed('message', function() {
        return this.get('message').toUpperCase();
      })
    });

    let m = Formatter.create({ message: 'hello' });

    this.renderPath('m.formattedMessage', { m });

    this.assertContent('HELLO');

    this.assertStableRerender();

    this.runTask(() => set(m, 'message', 'goodbye'));

    this.assertContent('GOODBYE');
    this.assertInvariants();

    this.runTask(() => set(this.context, 'm', Formatter.create({ message: 'hello' })));

    this.assertContent('HELLO');
    this.assertInvariants();
  }

  ['@test it can render a computed property with nested dependency']() {
    let Formatter = EmberObject.extend({
      formattedMessage: computed('messenger.message', function() {
        return this.get('messenger.message').toUpperCase();
      })
    });

    let m = Formatter.create({ messenger: { message: 'hello' } });

    this.renderPath('m.formattedMessage', { m });

    this.assertContent('HELLO');

    this.assertStableRerender();

    this.runTask(() => set(m, 'messenger.message', 'goodbye'));

    this.assertContent('GOODBYE');
    this.assertInvariants();

    this.runTask(() => set(this.context, 'm', Formatter.create({ messenger: { message: 'hello' } })));

    this.assertContent('HELLO');
    this.assertInvariants();
  }

  ['@test it can read from a proxy object']() {
    this.renderPath('proxy.name', { proxy: ObjectProxy.create({ content: { name: 'Tom Dale' } }) });

    this.assertContent('Tom Dale');

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'proxy.content.name', 'Yehuda Katz'));

    this.assertContent('Yehuda Katz');
    this.assertInvariants();

    this.runTask(() => set(this.context, 'proxy.content', { name: 'Godfrey Chan' }));

    this.assertContent('Godfrey Chan');
    this.assertInvariants();

    this.runTask(() => set(this.context, 'proxy.name', 'Stefan Penner'));

    this.assertContent('Stefan Penner');
    this.assertInvariants();

    this.runTask(() => set(this.context, 'proxy.content', null));

    this.assertIsEmpty();

    this.runTask(() => set(this.context, 'proxy', ObjectProxy.create({ content: { name: 'Tom Dale' } })));

    this.assertContent('Tom Dale');
    this.assertInvariants();
  }

  ['@test it can read from a nested path in a proxy object']() {
    this.renderPath('proxy.name.last', { proxy: ObjectProxy.create({ content: { name: { first: 'Tom', last: 'Dale' } } }) });

    this.assertContent('Dale');

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'proxy.content.name.last', 'Cruise'));

    this.assertContent('Cruise');
    this.assertInvariants();

    this.runTask(() => set(this.context, 'proxy.content.name.first', 'Suri'));

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'proxy.content.name', { first: 'Yehuda', last: 'Katz' }));

    this.assertContent('Katz');
    this.assertInvariants();

    this.runTask(() => set(this.context, 'proxy.content', { name: { first: 'Godfrey', last: 'Chan' } }));

    this.assertContent('Chan');
    this.assertInvariants();

    this.runTask(() => set(this.context, 'proxy.name', { first: 'Stefan', last: 'Penner' }));

    this.assertContent('Penner');
    this.assertInvariants();

    this.runTask(() => set(this.context, 'proxy', null));

    this.assertIsEmpty();

    this.runTask(() => set(this.context, 'proxy', ObjectProxy.create({ content: { name: { first: 'Tom', last: 'Dale' } } })));

    this.assertContent('Dale');
    this.assertInvariants();
  }

  ['@test it can read from a path flipping between a proxy and a real object']() {
    this.renderPath('proxyOrObject.name.last', { proxyOrObject: ObjectProxy.create({ content: { name: { first: 'Tom', last: 'Dale' } } }) });

    this.assertContent('Dale');

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'proxyOrObject', { name: { first: 'Tom', last: 'Dale' } }));

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'proxyOrObject.name.last', 'Cruise'));

    this.assertContent('Cruise');
    this.assertInvariants();

    this.runTask(() => set(this.context, 'proxyOrObject.name.first', 'Suri'));

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'proxyOrObject', { name: { first: 'Yehuda', last: 'Katz' } }));

    this.assertContent('Katz');
    this.assertInvariants();

    this.runTask(() => set(this.context, 'proxyOrObject', ObjectProxy.create({ content: { name: { first: 'Godfrey', last: 'Chan' } } })));

    this.assertContent('Chan');
    this.assertInvariants();

    this.runTask(() => set(this.context, 'proxyOrObject.content.name', { first: 'Stefan', last: 'Penner' }));

    this.assertContent('Penner');
    this.assertInvariants();

    this.runTask(() => set(this.context, 'proxyOrObject', null));

    this.assertIsEmpty();

    this.runTask(() => set(this.context, 'proxyOrObject', ObjectProxy.create({ content: { name: { first: 'Tom', last: 'Dale' } } })));

    this.assertContent('Dale');
    this.assertInvariants();
  }

  ['@test it can read from a path flipping between a real object and a proxy']() {
    this.renderPath('objectOrProxy.name.last', { objectOrProxy: { name: { first: 'Tom', last: 'Dale' } } });

    this.assertContent('Dale');

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'objectOrProxy', ObjectProxy.create({ content: { name: { first: 'Tom', last: 'Dale' } } })));

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'objectOrProxy.content.name.last', 'Cruise'));

    this.assertContent('Cruise');
    this.assertInvariants();

    this.runTask(() => set(this.context, 'objectOrProxy.content.name.first', 'Suri'));

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'objectOrProxy.content', { name: { first: 'Yehuda', last: 'Katz' } }));

    this.assertContent('Katz');
    this.assertInvariants();

    this.runTask(() => set(this.context, 'objectOrProxy', { name: { first: 'Godfrey', last: 'Chan' } }));

    this.assertContent('Chan');
    this.assertInvariants();

    this.runTask(() => set(this.context, 'objectOrProxy.name', { first: 'Stefan', last: 'Penner' }));

    this.assertContent('Penner');
    this.assertInvariants();

    this.runTask(() => set(this.context, 'objectOrProxy', null));

    this.assertIsEmpty();

    this.runTask(() => set(this.context, 'objectOrProxy', { name: { first: 'Tom', last: 'Dale' } }));

    this.assertContent('Dale');
    this.assertInvariants();
  }

  ['@test it can read from a null object']() {
    let nullObject = Object.create(null);
    nullObject['message'] = 'hello';

    this.renderPath('nullObject.message', { nullObject });

    this.assertContent('hello');

    this.assertStableRerender();

    this.runTask(() => set(nullObject, 'message', 'goodbye'));

    this.assertContent('goodbye');
    this.assertInvariants();

    nullObject = Object.create(null);
    nullObject['message'] = 'hello';

    this.runTask(() => set(this.context, 'nullObject', nullObject));

    this.assertContent('hello');
    this.assertInvariants();
  }

  ['@test it can render a readOnly property of a path']() {
    let Messenger = EmberObject.extend({
      message: computed.readOnly('a.b.c')
    });

    let messenger = Messenger.create({
      a: {
        b: {
          c: 'hello'
        }
      }
    });

    this.renderPath('messenger.message', { messenger });

    this.assertContent('hello');

    this.assertStableRerender();

    this.runTask(() => set(messenger, 'a.b.c', 'hi'));

    this.assertContent('hi');
    this.assertInvariants();

    this.runTask(() => set(this.context, 'messenger.a.b', {
      c: 'goodbye'
    }));

    this.assertContent('goodbye');
    this.assertInvariants();

    this.runTask(() => set(this.context, 'messenger', {
      message: 'hello'
    }));

    this.assertContent('hello');
    this.assertInvariants();
  }

  ['@test it can render a property on a function']() {
    let func = () => {};
    func.aProp = 'this is a property on a function';

    this.renderPath('func.aProp', { func });

    this.assertContent('this is a property on a function');

    this.assertStableRerender();

    this.runTask(() => set(func, 'aProp', 'still a property on a function'));
    this.assertContent('still a property on a function');
    this.assertInvariants();

    func = () => {};
    func.aProp = 'a prop on a new function';

    this.runTask(() => set(this.context, 'func', func));

    this.assertContent('a prop on a new function');
    this.assertInvariants();
  }
}

const EMPTY = {};

class ContentTestGenerator {
  constructor(cases, tag = '@test') {
    this.cases = cases;
    this.tag = tag;
  }

  generate([ value, expected, label ]) {
    let tag = this.tag;
    label = label || value;

    if (expected === EMPTY) {
      return {

        [`${tag} rendering ${label}`]() {
          this.renderPath('value', { value });

          this.assertIsEmpty();

          this.runTask(() => set(this.context, 'value', 'hello'));

          this.assertContent('hello');

          this.runTask(() => set(this.context, 'value', value));

          this.assertIsEmpty();
        }

      };
    } else {
      return {

        [`${tag} rendering ${label}`]() {
          this.renderPath('value', { value });

          this.assertContent(expected);

          this.assertStableRerender();

          this.runTask(() => set(this.context, 'value', 'hello'));

          this.assertContent('hello');
          this.assertInvariants();

          this.runTask(() => set(this.context, 'value', value));

          this.assertContent(expected);
          this.assertInvariants();
        }

      };
    }
  }
}

const SharedContentTestCases = new ContentTestGenerator([

  ['foo', 'foo'],
  [0, '0'],
  [-0, '0', '-0'],
  [1, '1'],
  [-1, '-1'],
  [0.0, '0', '0.0'],
  [0.5, '0.5'],
  [undefined, EMPTY],
  [null, EMPTY],
  [true, 'true'],
  [false, 'false'],
  [NaN, 'NaN'],
  [new Date(2000, 0, 1), String(new Date(2000, 0, 1)), 'a Date object'],
  [Infinity, 'Infinity'],
  [(1 / -0), '-Infinity'],
  [{ foo: 'bar' }, '[object Object]', `{ foo: 'bar' }`],
  [{ toString() { return 'foo'; } }, 'foo', 'an object with a custom toString function'],
  [{ valueOf() { return 1; } }, '[object Object]', 'an object with a custom valueOf function'],

  // Escaping tests
  ['<b>Max</b><b>James</b>', '<b>Max</b><b>James</b>']

]);

let GlimmerContentTestCases = new ContentTestGenerator([

  [Object.create(null), EMPTY, 'an object with no toString']

]);

if (typeof Symbol !== 'undefined') {
  GlimmerContentTestCases.cases.push([Symbol('debug'), 'Symbol(debug)', 'a symbol']);
}

applyMixins(DynamicContentTest, SharedContentTestCases, GlimmerContentTestCases);

moduleFor('Dynamic content tests (content position)', class extends DynamicContentTest {

  renderPath(path, context = {}) {
    this.render(`{{${path}}}`, context);
  }

  assertContent(content) {
    this.assert.strictEqual(this.nodesCount, 1, 'It should render exactly one text node');
    this.assertTextNode(this.firstChild, content);
  }

});

moduleFor('Dynamic content tests (content concat)', class extends DynamicContentTest {

  renderPath(path, context = {}) {
    this.render(`{{concat "" ${path} ""}}`, context);
  }

  assertContent(content) {
    this.assert.strictEqual(this.nodesCount, 1, 'It should render exactly one text node');
    this.assertTextNode(this.firstChild, content);
  }

});

moduleFor('Dynamic content tests (inside an element)', class extends DynamicContentTest {

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

});

moduleFor('Dynamic content tests (attribute position)', class extends DynamicContentTest {

  renderPath(path, context = {}) {
    this.render(`<div data-foo="{{${path}}}"></div>`, context);
  }

  assertIsEmpty() {
    this.assert.strictEqual(this.nodesCount, 1, 'It should render exactly one <div> tag');
    this.assertElement(this.firstChild, { tagName: 'div', content: '' });
  }

  assertContent(content) {
    this.assert.strictEqual(this.nodesCount, 1, 'It should render exactly one <div> tag');
    this.assertElement(this.firstChild, { tagName: 'div', attrs: { 'data-foo': content }, content: '' });
  }

});

class TrustedContentTest extends DynamicContentTest {

  assertIsEmpty() {
    this.assert.strictEqual(this.firstChild, null);
  }

  assertContent(content) {
    this.assertHTML(content);
  }

  assertStableRerender() {
    this.takeSnapshot();
    this.runTask(() => this.rerender());
    super.assertInvariants();
  }

  assertInvariants() {
    // If it's not stable, we will wipe out all the content and replace them,
    // so there are no invariants
  }

}

moduleFor('Dynamic content tests (trusted)', class extends TrustedContentTest {

  renderPath(path, context = {}) {
    this.render(`{{{${path}}}}`, context);
  }

  ['@test updating trusted curlies']() {
    this.render('{{{htmlContent}}}{{{nested.htmlContent}}}', {
      htmlContent: '<b>Max</b>',
      nested: { htmlContent: '<b>James</b>' }
    });

    this.assertContent('<b>Max</b><b>James</b>');

    this.runTask(() => this.rerender());

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'htmlContent', '<i>M</i><u>a</u><s>x</s>'));

    this.assertContent('<i>M</i><u>a</u><s>x</s><b>James</b>');

    this.runTask(() => set(this.context, 'nested.htmlContent', 'Jammie'));

    this.assertContent('<i>M</i><u>a</u><s>x</s>Jammie');

    this.runTask(() => {
      set(this.context, 'htmlContent', '<b>Max</b>');
      set(this.context, 'nested', { htmlContent: '<i>James</i>' });
    });

    this.assertContent('<b>Max</b><i>James</i>');
  }

});

moduleFor('Dynamic content tests (integration)', class extends RenderingTest {

  ['@test it can render a dynamic template']() {
    let template = `
      <div class="header">
        <h1>Welcome to {{framework}}</h1>
      </div>
      <div class="body">
        <h2>Why you should use {{framework}}?</h2>
        <ol>
          <li>It's great</li>
          <li>It's awesome</li>
          <li>It's {{framework}}</li>
        </ol>
      </div>
      <div class="footer">
        {{framework}} is free, open source and always will be.
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
      framework: 'Ember.js'
    });
    this.assertHTML(ember);

    this.runTask(() => this.rerender());

    this.assertHTML(ember);

    this.runTask(() => set(this.context, 'framework', 'React'));

    this.assertHTML(react);

    this.runTask(() => set(this.context, 'framework', 'Ember.js'));

    this.assertHTML(ember);
  }

  ['@test it should evaluate to nothing if part of the path is `undefined`']() {
    this.render('{{foo.bar.baz.bizz}}', {
      foo: {}
    });

    this.assertText('');

    this.runTask(() => this.rerender());

    this.assertText('');

    this.runTask(() => set(this.context, 'foo', {
      bar: { baz: { bizz: 'Hey!' } }
    }));

    this.assertText('Hey!');

    this.runTask(() => set(this.context, 'foo', {}));

    this.assertText('');

    this.runTask(() => set(this.context, 'foo', {
      bar: { baz: { bizz: 'Hello!' } }
    }));

    this.assertText('Hello!');

    this.runTask(() => set(this.context, 'foo', {}));

    this.assertText('');
  }

  ['@test it should evaluate to nothing if part of the path is a primative']() {
    this.render('{{foo.bar.baz.bizz}}', {
      foo: { bar: true }
    });

    this.assertText('');

    this.runTask(() => this.rerender());

    this.assertText('');

    this.runTask(() => set(this.context, 'foo', {
      bar: false
    }));

    this.assertText('');

    this.runTask(() => set(this.context, 'foo', {
      bar: 'Haha'
    }));

    this.assertText('');

    this.runTask(() => set(this.context, 'foo', {
      bar: null
    }));

    this.assertText('');

    this.runTask(() => set(this.context, 'foo', {
      bar: undefined
    }));

    this.assertText('');

    this.runTask(() => set(this.context, 'foo', {
      bar: 1
    }));

    this.assertText('');

    this.runTask(() => set(this.context, 'foo', {
      bar: { baz: { bizz: 'Hello!' } }
    }));

    this.assertText('Hello!');

    this.runTask(() => set(this.context, 'foo', {
      bar: true
    }));

    this.assertText('');
  }

  ['@test can set dynamic href']() {
    this.render('<a href={{model.url}}>Example</a>', {
      model: {
        url: 'http://example.com'
      }
    });

    this.assertElement(this.firstChild, { tagName: 'a', content: 'Example', attrs: { 'href': 'http://example.com' } });

    this.runTask(() => this.rerender());

    this.assertElement(this.firstChild, { tagName: 'a', content: 'Example', attrs: { 'href': 'http://example.com' } });

    this.runTask(() => set(this.context, 'model.url', 'http://linkedin.com'));

    this.assertElement(this.firstChild, { tagName: 'a', content: 'Example', attrs: { 'href': 'http://linkedin.com' } });

    this.runTask(() => set(this.context, 'model', { url: 'http://example.com' }));

    this.assertElement(this.firstChild, { tagName: 'a', content: 'Example', attrs: { 'href': 'http://example.com' } });
  }

  ['@test quoteless class attributes update correctly']() {
    this.render('<div class={{if fooBar "foo-bar"}}>hello</div>', {
      fooBar: true
    });

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo-bar') } });

    this.runTask(() => this.rerender());

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo-bar') } });

    this.runTask(() => set(this.context, 'fooBar', false));

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello' });

    this.runTask(() => set(this.context, 'fooBar', true));

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo-bar') } });
  }

  ['@test quoted class attributes update correctly'](assert) {
    this.render('<div class="{{if fooBar "foo-bar"}}">hello</div>', {
      fooBar: true
    });

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo-bar') } });

    this.runTask(() => this.rerender());

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo-bar') } });

    this.runTask(() => set(this.context, 'fooBar', false));

    assert.equal(this.firstChild.className, '');

    this.runTask(() => set(this.context, 'fooBar', true));

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo-bar') } });
  }

  ['@test unquoted class attribute can contain multiple classes']() {
    this.render('<div class={{model.classes}}>hello</div>', {
      model: {
        classes: 'foo bar baz'
      }
    });

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo bar baz') } });

    this.runTask(() => this.rerender());

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo bar baz') } });

    this.runTask(() => set(this.context, 'model.classes', 'fizz bizz'));

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('fizz bizz') } });

    this.runTask(() => set(this.context, 'model', { classes: 'foo bar baz' }));

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo bar baz') } });
  }

  ['@test unquoted class attribute']() {
    this.render('<div class={{model.foo}}>hello</div>', {
      model: {
        foo: 'foo'
      }
    });

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo') } });

    this.runTask(() => this.rerender());

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo') } });

    this.runTask(() => set(this.context, 'model.foo', 'fizz'));

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('fizz') } });

    this.runTask(() => set(this.context, 'model', { foo: 'foo' }));

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo') } });
  }

  ['@test quoted class attribute']() {
    this.render('<div class="{{model.foo}}">hello</div>', {
      model: {
        foo: 'foo'
      }
    });

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo') } });

    this.runTask(() => this.rerender());

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo') } });

    this.runTask(() => set(this.context, 'model.foo', 'fizz'));

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('fizz') } });

    this.runTask(() => set(this.context, 'model', { foo: 'foo' }));

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo') } });
  }

  ['@test quoted class attribute can contain multiple classes']() {
    this.render('<div class="{{model.classes}}">hello</div>', {
      model: {
        classes: 'foo bar baz'
      }
    });

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo bar baz') } });

    this.runTask(() => this.rerender());

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo bar baz') } });

    this.runTask(() => set(this.context, 'model.classes', 'fizz bizz'));

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('fizz bizz') } });

    this.runTask(() => set(this.context, 'model', { classes: 'foo bar baz' }));

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo bar baz') } });
  }

  ['@test class attribute concats bound values']() {
    this.render('<div class="{{model.foo}} {{model.bar}} {{model.bizz}}">hello</div>', {
      model: {
        foo: 'foo',
        bar: 'bar',
        bizz: 'bizz'
      }
    });

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo bar bizz') } });

    this.runTask(() => this.rerender());

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo bar bizz') } });


    this.runTask(() => set(this.context, 'model.foo', 'fizz'));

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('fizz bar bizz') } });

    this.runTask(() => set(this.context, 'model.bar', null));

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('fizz bizz') } });

    this.runTask(() => set(this.context, 'model', {
      foo: 'foo',
      bar: 'bar',
      bizz: 'bizz'
    }));

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo bar bizz') } });
  }

  ['@test class attribute accepts nested helpers, and updates']() {
    this.render(`<div class="{{if model.hasSize model.size}} {{if model.hasShape model.shape}}">hello</div>`, {
      model: {
        size: 'large',
        hasSize: true,
        hasShape: false,
        shape: 'round'
      }
    });

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('large') } });

    this.runTask(() => this.rerender());

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('large') } });

    this.runTask(() => set(this.context, 'model.hasShape', true));

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('large round') } });

    this.runTask(() => set(this.context, 'model.hasSize', false));

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('round') } });

    this.runTask(() => set(this.context, 'model', {
      size: 'large',
      hasSize: true,
      hasShape: false,
      shape: 'round'
    }));

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('large') } });
  }

  ['@test Multiple dynamic classes']() {
    this.render('<div class="{{model.foo}} {{model.bar}} {{model.fizz}} {{model.baz}}">hello</div>', {
      model: {
        foo: 'foo',
        bar: 'bar',
        fizz: 'fizz',
        baz: 'baz'
      }
    });

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo bar fizz baz') } });

    this.runTask(() => this.rerender());

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo bar fizz baz') } });

    this.runTask(() => {
      set(this.context, 'model.foo', null);
      set(this.context, 'model.fizz', null);
    });

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('bar baz') } });

    this.runTask(() => {
      set(this.context, 'model', {
        foo: 'foo',
        bar: 'bar',
        fizz: 'fizz',
        baz: 'baz'
      });
    });

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo bar fizz baz') } });
  }

  ['@test classes are ordered: See issue #9912']() {
    this.render('<div class="{{model.foo}}  static   {{model.bar}}">hello</div>', {
      model: {
        foo: 'foo',
        bar: 'bar'
      }
    });

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': 'foo  static   bar' } });

    this.runTask(() => this.rerender());

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': 'foo  static   bar' } });

    this.runTask(() => {
      set(this.context, 'model.bar', null);
    });

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': 'foo  static   ' } });

    this.runTask(() => {
      set(this.context, 'model', {
        foo: 'foo',
        bar: 'bar'
      });
    });

    this.assertElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': 'foo  static   bar' } });
  }

});

let warnings, originalWarn;
class StyleTest extends RenderingTest {
  constructor() {
    super(...arguments);
    warnings = [];
    originalWarn = getDebugFunction('warn');
    setDebugFunction('warn', function(message, test) {
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

moduleFor('Inline style tests', class extends StyleTest {
  ['@test can set dynamic style']() {
    this.render('<div style={{model.style}}></div>', {
      model: {
        style: 'width: 60px;'
      }
    });

    this.assertElement(this.firstChild, { tagName: 'div', content: '', attrs: { 'style': 'width: 60px;' } });

    this.runTask(() => this.rerender());

    this.assertElement(this.firstChild, { tagName: 'div', content: '', attrs: { 'style': 'width: 60px;' } });

    this.runTask(() => set(this.context, 'model.style', 'height: 60px;'));

    this.assertElement(this.firstChild, { tagName: 'div', content: '', attrs: { 'style': 'height: 60px;' } });

    this.runTask(() => set(this.context, 'model.style', null));

    this.assertElement(this.firstChild, { tagName: 'div', content: '', attrs: { } });

    this.runTask(() => set(this.context, 'model', { style: 'width: 60px;' }));

    this.assertElement(this.firstChild, { tagName: 'div', content: '', attrs: { 'style': 'width: 60px;' } });
  }

  ['@test can set dynamic style with -html-safe']() {
    this.render('<div style={{-html-safe model.style}}></div>', {
      model: {
        style: 'width: 60px;'
      }
    });

    this.assertElement(this.firstChild, { tagName: 'div', content: '', attrs: { 'style': 'width: 60px;' } });

    this.runTask(() => this.rerender());

    this.assertElement(this.firstChild, { tagName: 'div', content: '', attrs: { 'style': 'width: 60px;' } });

    this.runTask(() => set(this.context, 'model.style', 'height: 60px;'));

    this.assertElement(this.firstChild, { tagName: 'div', content: '', attrs: { 'style': 'height: 60px;' } });

    this.runTask(() => set(this.context, 'model', { style: 'width: 60px;' }));

    this.assertElement(this.firstChild, { tagName: 'div', content: '', attrs: { 'style': 'width: 60px;' } });
  }
});

if (!EmberDev.runningProdBuild) {
  moduleFor('Inline style tests - warnings', class extends StyleTest {
    ['@test specifying <div style={{userValue}}></div> generates a warning'](assert) {
      let userValue = 'width: 42px';
      this.render('<div style={{userValue}}></div>', {
        userValue
      });

      this.assertStyleWarning(userValue);
    }

    ['@test specifying `attributeBindings: ["style"]` generates a warning'](assert) {
      let FooBarComponent = Component.extend({
        attributeBindings: ['style']
      });

      this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });
      let userValue = 'width: 42px';
      this.render('{{foo-bar style=userValue}}', {
        userValue
      });

      this.assertStyleWarning(userValue);
    }

    ['@test specifying `<div style={{{userValue}}}></div>` works properly without a warning'](assert) {
      this.render('<div style={{{userValue}}}></div>', {
        userValue: 'width: 42px'
      });

      this.assertNoWarning();
    }

    ['@test specifying `<div style={{userValue}}></div>` works properly with a SafeString'](assert) {
      this.render('<div style={{userValue}}></div>', {
        userValue: new SafeString('width: 42px')
      });

      this.assertNoWarning();
    }

    ['@test null value do not generate htmlsafe warning'](assert) {
      this.render('<div style={{userValue}}></div>', {
        userValue: null
      });

      this.assertNoWarning();
    }

    ['@test undefined value do not generate htmlsafe warning'](assert) {
      this.render('<div style={{userValue}}></div>');

      this.assertNoWarning();
    }

    ['@test no warnings are triggered when using `-html-safe`'](assert) {
      this.render('<div style={{-html-safe userValue}}></div>', {
        userValue: 'width: 42px'
      });

      this.assertNoWarning();
    }

    ['@test no warnings are triggered when a safe string is quoted'](assert) {
      this.render('<div style="{{userValue}}"></div>', {
        userValue: new SafeString('width: 42px')
      });

      this.assertNoWarning();
    }

    ['@test binding warning is triggered when an unsafe string is quoted'](assert) {
      let userValue = 'width: 42px';
      this.render('<div style="{{userValue}}"></div>', {
        userValue
      });

      this.assertStyleWarning(userValue);
    }

    ['@test binding warning is triggered when a safe string for a complete property is concatenated in place'](assert) {
      let userValue = 'width: 42px';
      this.render('<div style="color: green; {{userValue}}"></div>', {
        userValue: new SafeString('width: 42px')
      });

      this.assertStyleWarning(`color: green; ${userValue}`);
    }

    ['@test binding warning is triggered when a safe string for a value is concatenated in place'](assert) {
      let userValue = '42px';
      this.render('<div style="color: green; width: {{userValue}}"></div>', {
        userValue: new SafeString(userValue)
      });

      this.assertStyleWarning(`color: green; width: ${userValue}`);
    }

    ['@test binding warning is triggered when a safe string for a property name is concatenated in place'](assert) {
      let userValue = 'width';
      this.render('<div style="color: green; {{userProperty}}: 42px"></div>', {
        userProperty: new SafeString(userValue)
      });

      this.assertStyleWarning(`color: green; ${userValue}: 42px`);
    }
  });
}

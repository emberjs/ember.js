import { RenderingTest, moduleFor } from '../utils/test-case';
import { applyMixins } from '../utils/abstract-test-case';
import { set } from 'ember-metal/property_set';
import { computed } from 'ember-metal/computed';
import EmberObject from 'ember-runtime/system/object';

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

], '@glimmer');

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
    this.assertElement(this.firstChild, { tagName: 'div', attrs: { 'data-foo': '' }, content: '' });
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
});

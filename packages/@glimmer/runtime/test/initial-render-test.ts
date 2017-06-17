import {
  TestEnvironment,
  TestDynamicScope,
  normalizeInnerHTML,
  getTextContent,
  equalTokens,
  assertNodeTagName,
  assertNodeProperty,
} from "@glimmer/test-helpers";
import { Environment, Template, Simple, AttributeManager, IteratorResult, RenderResult } from '@glimmer/runtime';
import { module, test } from './support';
import { UpdatableReference } from '@glimmer/object-reference';
import { Opaque } from '@glimmer/interfaces';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';
const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

let env: TestEnvironment;
let root: HTMLElement;

function compile(template: string) {
  let out = env.compile(template);
  return out;
}

function compilesTo(html: string, expected: string=html, context: any={}) {
  let template = compile(html);
  root = rootElement();
  QUnit.assert.ok(true, `template: ${html}`);
  render(template, context);
  equalTokens(root, expected);
}

function rootElement(): HTMLDivElement {
  return env.getDOM().createElement('div') as HTMLDivElement;
}

function commonSetup(customEnv = new TestEnvironment()) {
  env = customEnv; // TODO: Support SimpleDOM
  root = rootElement();
}

function render<T>(template: Template<T>, self: any) {
  let result: RenderResult;
  env.begin();
  let templateIterator = template.render(new UpdatableReference(self), root, new TestDynamicScope());
  let iteratorResult: IteratorResult<RenderResult>;
  do {
    iteratorResult = templateIterator.next();
  } while (!iteratorResult.done);

  result = iteratorResult.value;
  env.commit();
  return result;
}

function createElement<T extends keyof HTMLElementTagNameMap>(tag: T): HTMLElementTagNameMap[T] {
  return document.createElement(tag);
}

module("[glimmer runtime] Initial render", tests => {
  tests.beforeEach(() => commonSetup());

  module("Simple HTML, inline expressions", () => {
    test("HTML text content", () => {
      let template = compile("content");
      render(template, {});

      equalTokens(root, "content");
    });

    test("HTML tags", () => {
      let template = compile("<h1>hello!</h1><div>content</div>");
      render(template, {});

      equalTokens(root, "<h1>hello!</h1><div>content</div>");
    });

    test("HTML tags re-rendered", assert => {
      let template = compile("<h1>hello!</h1><div>content</div>");
      let result = render(template, {});

      let oldFirstChild = root.firstChild;

      env.begin();
      result.rerender();
      env.commit();

      assert.strictEqual(root.firstChild, oldFirstChild);
      equalTokens(root, "<h1>hello!</h1><div>content</div>");
    });

    test("HTML attributes", () => {
      let template = compile("<div class='foo' id='bar'>content</div>");
      render(template, {});

      equalTokens(root, '<div class="foo" id="bar">content</div>');
    });

    test("HTML tag with empty attribute", () => {
      let template = compile("<div class=''>content</div>");
      render(template, {});

      equalTokens(root, "<div class=''>content</div>");
    });

    test("HTML boolean attribute 'disabled'", () => {
      let template = compile('<input disabled>');
      render(template, {});
      assertNodeProperty(root.firstChild, 'input', 'disabled', true);
    });

    test("Quoted attribute null values do not disable", () => {
      let template = compile('<input disabled="{{isDisabled}}">');
      render(template, { isDisabled: null });
      assertNodeProperty(root.firstChild, 'input', 'disabled', false);
      equalTokens(root, '<input />');
    });

    test("Unquoted attribute expression with null value is not coerced", () => {
      let template = compile('<input disabled={{isDisabled}}>');
      render(template, { isDisabled: null });

      equalTokens(root, '<input>');
    });

    test("Unquoted attribute values", () => {
      let template = compile('<input value=funstuff>');
      render(template, {});

      assertNodeProperty(root.firstChild, 'input', 'value', 'funstuff');
    });

    test("Unquoted attribute expression with string value is not coerced", () => {
      let template = compile('<input value={{funstuff}}>');
      render(template, {funstuff: "oh my"});

      assertNodeProperty(root.firstChild, 'input', 'value', 'oh my');
    });

    test("Unquoted img src attribute is rendered", () => {
      let template = compile('<img src={{someURL}}>');
      render(template, { someURL: "http://foo.com/foo.png"});

      equalTokens(root, '<img src="http://foo.com/foo.png">');
      assertNodeProperty(root.firstChild, 'img', 'src', 'http://foo.com/foo.png');
    });

    test("Unquoted img src attribute is not rendered when set to `null`", () => {
      let template = compile('<img src={{someURL}}>');
      render(template, { someURL: null});

      equalTokens(root, '<img>');
    });

    test("Unquoted img src attribute is not rendered when set to `undefined`", () => {
      let template = compile('<img src={{someURL}}>');
      render(template, { someURL: undefined });

      equalTokens(root, '<img>');
    });

    test("Quoted img src attribute is rendered", () => {
      let template = compile('<img src="{{someURL}}">');
      render(template, { someURL: "http://foo.com/foo.png"});

      assertNodeProperty(root.firstChild, 'img', 'src', 'http://foo.com/foo.png');
    });

    test("Quoted img src attribute is not rendered when set to `null`", () => {
      let template = compile('<img src="{{someURL}}">');
      render(template, { someURL: null});

      equalTokens(root, '<img>');
    });

    test("Quoted img src attribute is not rendered when set to `undefined`", () => {
      let template = compile('<img src="{{someURL}}">');
      render(template, { someURL: undefined });

      equalTokens(root, '<img>');
    });

    test("Unquoted a href attribute is not rendered when set to `null`", () => {
      let template = compile('<a href={{someURL}}></a>');
      render(template, { someURL: null});

      equalTokens(root, '<a></a>');
    });

    test("Unquoted img src attribute is not rendered when set to `undefined`", () => {
      let template = compile('<a href={{someURL}}></a>');
      render(template, { someURL: undefined});

      equalTokens(root, '<a></a>');
    });

    test("Attribute expression can be followed by another attribute", () => {
      let template = compile('<div foo="{{funstuff}}" name="Alice"></div>');
      render(template, {funstuff: "oh my"});

      equalTokens(root, '<div name="Alice" foo="oh my"></div>');
    });

    test("Unquoted attribute with expression throws an exception", assert => {
      assert.expect(4);

      assert.throws(function() { compile('<img class=foo{{bar}}>'); }, expectedError(1));
      assert.throws(function() { compile('<img class={{foo}}{{bar}}>'); }, expectedError(1));
      assert.throws(function() { compile('<img \nclass={{foo}}bar>'); }, expectedError(2));
      assert.throws(function() { compile('<div \nclass\n=\n{{foo}}&amp;bar ></div>'); }, expectedError(4));

      function expectedError(line: number) {
        return new Error(
          `An unquoted attribute value must be a string or a mustache, ` +
          `preceeded by whitespace or a '=' character, and ` +
          `followed by whitespace, a '>' character, or '/>' (on line ${line})`
        );
      }
    });

    test("HTML tag with data- attribute", () => {
      let template = compile("<div data-some-data='foo'>content</div>");
      render(template, {});
      equalTokens(root, '<div data-some-data="foo">content</div>');
    });

    test("<input> tag with 'checked' attribute", () => {
      let template = compile("<input checked=\"checked\">");
      render(template, {});

      assertNodeProperty(root.firstChild, 'input', 'checked', true);
    });

    function shouldBeVoid(tagName: string) {
      root.innerHTML = "";
      let html = "<" + tagName + " data-foo='bar'><p>hello</p>";
      let template = compile(html);
      render(template, {});

      let tag = '<' + tagName + ' data-foo="bar">';
      let closing = '</' + tagName + '>';
      let extra = "<p>hello</p>";
      html = normalizeInnerHTML(root.innerHTML);

      root = rootElement();

      QUnit.assert.pushResult({
        result: (html === tag + extra) || (html === tag + closing + extra),
        actual: html,
        expected: tag + closing + extra,
        message: tagName + " should be a void element"
      });
    }

    test("Void elements are self-closing", () => {
      let voidElements = "area base br col command embed hr img input keygen link meta param source track wbr";

      voidElements.split(" ").forEach((tagName) => shouldBeVoid(tagName));
    });

    test("The compiler can handle nesting", () => {
      let html = '<div class="foo"><p><span id="bar" data-foo="bar">hi!</span></p></div>&nbsp;More content';
      let template = compile(html);
      render(template, {});

      equalTokens(root, html);
    });

    test("The compiler can handle quotes", () => {
      compilesTo('<div>"This is a title," we\'re on a boat</div>');
    });

    test("The compiler can handle backslashes", () => {
      compilesTo('<div>This is a backslash: \\</div>');
    });

    test("The compiler can handle newlines", () => {
      compilesTo("<div>common\n\nbro</div>");
    });

    test("The compiler can handle comments", () => {
      compilesTo("<div>{{! Better not break! }}content</div>", '<div>content</div>', {});
    });

    test("The compiler can handle HTML comments", () => {
      compilesTo('<div><!-- Just passing through --></div>');
    });

    test("The compiler can handle HTML comments with mustaches in them", () => {
      compilesTo('<div><!-- {{foo}} --></div>', '<div><!-- {{foo}} --></div>', { foo: 'bar' });
    });

    test("The compiler can handle HTML comments with complex mustaches in them", () => {
      compilesTo('<div><!-- {{foo bar baz}} --></div>', '<div><!-- {{foo bar baz}} --></div>', { foo: 'bar' });
    });

    test("The compiler can handle HTML comments with multi-line mustaches in them", () => {
      compilesTo('<div><!-- {{#each foo as |bar|}}\n{{bar}}\n\n{{/each}} --></div>');
    });

    test('The compiler can handle comments with no parent element', function() {
      compilesTo('<!-- {{foo}} -->');
    });

    test("The compiler can handle simple handlebars", () => {
      compilesTo('<div>{{title}}</div>', '<div>hello</div>', { title: 'hello' });
    });

    test("The compiler can handle escaping HTML", () => {
      compilesTo('<div>{{title}}</div>', '<div>&lt;strong&gt;hello&lt;/strong&gt;</div>', { title: '<strong>hello</strong>' });
    });

    test("The compiler can handle unescaped HTML", () => {
      compilesTo('<div>{{{title}}}</div>', '<div><strong>hello</strong></div>', { title: '<strong>hello</strong>' });
    });

    test("The compiler can handle top-level unescaped HTML", () => {
      compilesTo('{{{html}}}', '<strong>hello</strong>', { html: '<strong>hello</strong>' });
    });

    test("The compiler can handle top-level unescaped tr", () => {
      let template = compile('{{{html}}}');
      let context = { html: '<tr><td>Yo</td></tr>' };
      let table = createElement('table');
      root = table;
      render(template, context);

      assertNodeTagName(table.firstChild, 'tbody');
    });

    test("The compiler can handle top-level unescaped td inside tr contextualElement", () => {
      let template = compile('{{{html}}}');
      let context = { html: '<td>Yo</td>' };
      let row = createElement('tr');
      root = row;
      render(template, context);

      assertNodeTagName(row.firstChild, 'td');
    });

    test("second render respects whitespace", assert => {
      let template = compile('Hello {{ foo }} ');
      render(template, {});

      root = rootElement();
      render(template, {});
      assert.equal(root.childNodes.length, 3, 'fragment contains 3 text nodes');
      assert.equal(getTextContent(root.childNodes[0]), 'Hello ', 'first text node ends with one space character');
      assert.equal(getTextContent(root.childNodes[2]), ' ', 'last text node contains one space character');
    });

    test("Morphs are escaped correctly", () => {
      env.registerHelper('testing-unescaped', function(params) {
        return params[0];
      });

      env.registerHelper('testing-escaped', function(params) {
        return params[0];
      });

      compilesTo('<div>{{{testing-unescaped "<span>hi</span>"}}}</div>', '<div><span>hi</span></div>');
      compilesTo('<div>{{testing-escaped "<hi>"}}</div>', '<div>&lt;hi&gt;</div>');
    });

    test("Attributes can use computed values", () => {
      compilesTo('<a href="{{url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html' });
    });

    test("Mountain range of nesting", () => {
      let context = { foo: "FOO", bar: "BAR", baz: "BAZ", boo: "BOO", brew: "BREW", bat: "BAT", flute: "FLUTE", argh: "ARGH" };
      compilesTo('{{foo}}<span></span>', 'FOO<span></span>', context);
      compilesTo('<span></span>{{foo}}', '<span></span>FOO', context);
      compilesTo('<span>{{foo}}</span>{{foo}}', '<span>FOO</span>FOO', context);
      compilesTo('{{foo}}<span>{{foo}}</span>{{foo}}', 'FOO<span>FOO</span>FOO', context);
      compilesTo('{{foo}}<span></span>{{foo}}', 'FOO<span></span>FOO', context);
      compilesTo('{{foo}}<span></span>{{bar}}<span><span><span>{{baz}}</span></span></span>',
                'FOO<span></span>BAR<span><span><span>BAZ</span></span></span>', context);
      compilesTo('{{foo}}<span></span>{{bar}}<span>{{argh}}<span><span>{{baz}}</span></span></span>',
                'FOO<span></span>BAR<span>ARGH<span><span>BAZ</span></span></span>', context);
      compilesTo('{{foo}}<span>{{bar}}<a>{{baz}}<em>{{boo}}{{brew}}</em>{{bat}}</a></span><span><span>{{flute}}</span></span>{{argh}}',
                'FOO<span>BAR<a>BAZ<em>BOOBREW</em>BAT</a></span><span><span>FLUTE</span></span>ARGH', context);
    });

    test("Static <div class> is preserved properly", () => {
      compilesTo(`
        <div class="hello world">1</div>
        <div class="goodbye world">2</div>
      `, `
        <div class="hello world">1</div>
        <div class="goodbye world">2</div>
      `);
    });

    test("Static <option selected> is preserved properly", assert => {
      let template = compile(`
        <select>
          <option>1</option>
          <option selected>2</option>
          <option>3</option>
        </select>
      `);
      render(template, {});

      let selectNode: any = root.childNodes[1];

      assert.equal(selectNode.selectedIndex, 1, 'second item is selected');
    });

    test("Static <option selected> for multi-select is preserved properly", assert => {
      let template = compile(`
        <select multiple>
          <option selected>1</option>
          <option selected>2</option>
          <option>3</option>
        </select>
      `);
      render(template, {});

      let selectNode: any = root.childNodes[1];

      let options = Array.prototype.slice.call(selectNode.querySelectorAll('option'))
        .filter((option: HTMLOptionElement) => option.getAttribute('selected') === '');

      assert.equal(options.length, 2, 'two options are selected');
    });

    test("Dynamic <option selected> is preserved properly", assert => {
      let template = compile(`
        <select>
          <option>1</option>
          <option selected={{selected}}>2</option>
          <option>3</option>
        </select>
      `);
      render(template, { selected: true });

      let selectNode: any = root.childNodes[1];

      assert.equal(selectNode.selectedIndex, 1, 'second item is selected');
    });

    test("Dynamic <option selected> for multi-select is preserved properly", assert => {
      let template = compile(`
        <select multiple>
          <option>0</option>
          <option selected={{somethingTrue}}>1</option>
          <option selected={{somethingTruthy}}>2</option>
          <option selected={{somethingUndefined}}>3</option>
          <option selected={{somethingNull}}>4</option>
          <option selected={{somethingFalse}}>5</option>
        </select>
      `);

      render(template, {
        somethingTrue: true,
        somethingTruthy: 'is-true',
        somethingUndefined: undefined,
        somethingNull: null,
        somethingFalse: false
      });

      let selectNode = root.firstElementChild;
      assert.ok(selectNode, 'rendered select');
      if (selectNode === null) {
        return;
      }
      let options = selectNode.querySelectorAll('option');
      let selected: HTMLOptionElement[] = [];
      for (let i = 0; i < options.length; i++) {
        let option = options[i];
        if (option.selected) {
          selected.push(option);
        }
      }
      assert.equal(selected.length, 2, 'two options are selected');
      assert.equal(selected[0].value, '1', 'first selected item is "1"');
      assert.equal(selected[1].value, '2', 'second selected item is "2"');
    });
  });

  module("simple blocks", () => {
    test("The compiler can handle unescaped tr in top of content", () => {
      let template = compile('{{#identity}}{{{html}}}{{/identity}}');
      let context = { html: '<tr><td>Yo</td></tr>' };
      let table = createElement('table');
      root = table;
      render(template, context);

      assertNodeTagName(root.firstChild, 'tbody');
    });

    test("The compiler can handle unescaped tr inside fragment table", () => {
      let template = compile('<table>{{#identity}}{{{html}}}{{/identity}}</table>');
      let context = { html: '<tr><td>Yo</td></tr>' };
      render(template, context);
      if (assertNodeTagName(root.firstChild, 'table')) {
        assertNodeTagName(root.firstChild.firstChild, 'tbody');
      }
    });
  });

  module("inline helpers", () => {
    test("The compiler can handle simple helpers", () => {
      env.registerHelper('testing', function(params) {
        return params[0];
      });

      compilesTo('<div>{{testing title}}</div>', '<div>hello</div>', { title: 'hello' });
    });

    test("GH#13999 The compiler can handle simple helpers with inline null parameter", assert => {
      let value;
      env.registerHelper('say-hello', function(params) {
        value = params[0];
        return 'hello';
      });

      compilesTo('<div>{{say-hello null}}</div>', '<div>hello</div>');
      assert.strictEqual(value, null, 'is null');
    });

    test("GH#13999 The compiler can handle simple helpers with inline string literal null parameter", assert => {
      let value;
      env.registerHelper('say-hello', function(params) {
        value = params[0];
        return 'hello';
      });

      compilesTo('<div>{{say-hello "null"}}</div>', '<div>hello</div>');
      assert.strictEqual(value, 'null', 'is null string literal');
    });

    test("GH#13999 The compiler can handle simple helpers with inline undefined parameter", assert => {
      let value: Opaque = 'PLACEHOLDER';
      let length;
      env.registerHelper('say-hello', function(params) {
        length = params.length;
        value = params[0];
        return 'hello';
      });

      compilesTo('<div>{{say-hello undefined}}</div>', '<div>hello</div>');
      assert.strictEqual(length, 1);
      assert.strictEqual(value, undefined, 'is undefined');
    });

    test("GH#13999 The compiler can handle simple helpers with positional parameter undefined string literal", assert => {
      let value: Opaque = 'PLACEHOLDER';
      let length;
      env.registerHelper('say-hello', function(params) {
        length = params.length;
        value = params[0];
        return 'hello';
      });

      compilesTo('<div>{{say-hello "undefined"}} undefined</div>', '<div>hello undefined</div>');
      assert.strictEqual(length, 1);
      assert.strictEqual(value, 'undefined', 'is undefined string literal');
    });

    test("GH#13999 The compiler can handle components with undefined named arguments", assert => {
      let value: Opaque = 'PLACEHOLDER';
      env.registerHelper('say-hello', function(_, hash) {
        value = hash['foo'];
        return 'hello';
      });

      compilesTo('<div>{{say-hello foo=undefined}}</div>', '<div>hello</div>');
      assert.strictEqual(value, undefined, 'is undefined');
    });

    test("GH#13999 The compiler can handle components with undefined string literal named arguments", assert => {
      let value: Opaque = 'PLACEHOLDER';
      env.registerHelper('say-hello', function(_, hash) {
        value = hash['foo'];
        return 'hello';
      });

      compilesTo('<div>{{say-hello foo="undefined"}}</div>', '<div>hello</div>');
      assert.strictEqual(value, 'undefined', 'is undefined string literal');
    });

    test("GH#13999 The compiler can handle components with null named arguments", assert => {
      let value;
      env.registerHelper('say-hello', function(_, hash) {
        value = hash['foo'];
        return 'hello';
      });

      compilesTo('<div>{{say-hello foo=null}}</div>', '<div>hello</div>');
      assert.strictEqual(value, null, 'is null');
    });

    test("GH#13999 The compiler can handle components with null string literal named arguments", assert => {
      let value;
      env.registerHelper('say-hello', function(_, hash) {
        value = hash['foo'];
        return 'hello';
      });

      compilesTo('<div>{{say-hello foo="null"}}</div>', '<div>hello</div>');
      assert.strictEqual(value, 'null', 'is null string literal');
    });

    test("GH#13999 The compiler can handle components with undefined named arguments", () => {
      env.registerHelper('say-hello', function() {
        return 'hello';
      });

      compilesTo('<div>{{say-hello foo=undefined}}</div>', '<div>hello</div>');
    });

    test("Null curly in attributes", () => {
      compilesTo('<div class="foo {{null}}">hello</div>', '<div class="foo ">hello</div>');
    });

    test("Null in primitive syntax", () => {
      compilesTo('{{#if null}}NOPE{{else}}YUP{{/if}}', 'YUP');
    });

    test("The compiler can handle sexpr helpers", () => {
      env.registerHelper('testing', function(params) {
        return params[0] + "!";
      });

      compilesTo('<div>{{testing (testing "hello")}}</div>', '<div>hello!!</div>', {});
    });

    test("The compiler can handle multiple invocations of sexprs", () => {
      env.registerHelper('testing', function(params) {
        return "" + params[0] + params[1];
      });

      compilesTo(
        '<div>{{testing (testing "hello" foo) (testing (testing bar "lol") baz)}}</div>',
        '<div>helloFOOBARlolBAZ</div>',
        { foo: "FOO", bar: "BAR", baz: "BAZ" }
      );
    });

    test("The compiler passes along the hash arguments", () => {
      env.registerHelper('testing', function(_, hash) {
        return hash['first'] + '-' + hash['second'];
      });

      compilesTo('<div>{{testing first="one" second="two"}}</div>', '<div>one-two</div>');
    });

    // test("Attributes can use computed paths", function() {
    //   compilesTo('<a href="{{post.url}}">linky</a>', '<a href="linky.html">linky</a>', { post: { url: 'linky.html' }});
    // });

    /*

    test("It is possible to use RESOLVE_IN_ATTR for data binding", assert => {
      let callback;

      registerHelper('RESOLVE_IN_ATTR', function(parts, options) {
        return boundValue(function(c) {
          callback = c;
          return this[parts[0]];
        }, this);
      });

      let object = { url: 'linky.html' };
      let fragment = compilesTo('<a href="{{url}}">linky</a>', '<a href="linky.html">linky</a>', object);

      object.url = 'clippy.html';
      callback();

      equalTokens(fragment, '<a href="clippy.html">linky</a>');

      object.url = 'zippy.html';
      callback();

      equalTokens(fragment, '<a href="zippy.html">linky</a>');
    });
    */

    test("Attributes can be populated with helpers that generate a string", () => {
      env.registerHelper('testing', function(params) {
        return params[0];
      });

      compilesTo('<a href="{{testing url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html'});
    });
    /*
    test("A helper can return a stream for the attribute", assert => {
      env.registerHelper('testing', function(path, options) {
        return streamValue(this[path]);
      });

      compilesTo('<a href="{{testing url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html'});
    });
    */
    test("Attribute helpers take a hash", () => {
      env.registerHelper('testing', function(_, hash) {
        return hash['path'];
      });

      compilesTo('<a href="{{testing path=url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html' });
    });
    /*
    test("Attribute helpers can use the hash for data binding", assert => {
      let callback;

      env.registerHelper('testing', function(path, hash, options) {
        return boundValue(function(c) {
          callback = c;
          return this[path] ? hash.truthy : hash.falsy;
        }, this);
      });

      let object = { on: true };
      let fragment = compilesTo('<div class="{{testing on truthy="yeah" falsy="nope"}}">hi</div>', '<div class="yeah">hi</div>', object);

      object.on = false;
      callback();
      equalTokens(fragment, '<div class="nope">hi</div>');
    });
    */
    test("Attributes containing multiple helpers are treated like a block", () => {
      env.registerHelper('testing', function(params) {
        return params[0];
      });

      compilesTo(
        '<a href="http://{{foo}}/{{testing bar}}/{{testing "baz"}}">linky</a>',
        '<a href="http://foo.com/bar/baz">linky</a>',
        { foo: 'foo.com', bar: 'bar' }
      );
    });

    test("Attributes containing a helper are treated like a block", assert => {
      env.registerHelper('testing', function(params) {
        assert.deepEqual(params, [123]);
        return "example.com";
      });

      compilesTo(
        '<a href="http://{{testing 123}}/index.html">linky</a>',
        '<a href="http://example.com/index.html">linky</a>',
        { person: { url: 'example.com' } }
      );
    });
    /*
    test("It is possible to trigger a re-render of an attribute from a child resolution", assert => {
      let callback;

      env.registerHelper('RESOLVE_IN_ATTR', function(path, options) {
        return boundValue(function(c) {
          callback = c;
          return this[path];
        }, this);
      });

      let context = { url: "example.com" };
      let fragment = compilesTo('<a href="http://{{url}}/index.html">linky</a>', '<a href="http://example.com/index.html">linky</a>', context);

      context.url = "www.example.com";
      callback();

      equalTokens(fragment, '<a href="http://www.example.com/index.html">linky</a>');
    });

    test("A child resolution can pass contextual information to the parent", assert => {
      let callback;

      registerHelper('RESOLVE_IN_ATTR', function(path, options) {
        return boundValue(function(c) {
          callback = c;
          return this[path];
        }, this);
      });

      let context = { url: "example.com" };
      let fragment = compilesTo('<a href="http://{{url}}/index.html">linky</a>', '<a href="http://example.com/index.html">linky</a>', context);

      context.url = "www.example.com";
      callback();

      equalTokens(fragment, '<a href="http://www.example.com/index.html">linky</a>');
    });

    test("Attribute runs can contain helpers", assert => {
      let callbacks = [];

      registerHelper('RESOLVE_IN_ATTR', function(path, options) {
        return boundValue(function(c) {
          callbacks.push(c);
          return this[path];
        }, this);
      });

      registerHelper('testing', function(path, options) {
        return boundValue(function(c) {
          callbacks.push(c);

          if (options.paramTypes[0] === 'id') {
            return this[path] + '.html';
          } else {
            return path;
          }
        }, this);
      });

      let context = { url: "example.com", path: 'index' };
      let fragment = compilesTo(
        '<a href="http://{{url}}/{{testing path}}/{{testing "linky"}}">linky</a>',
        '<a href="http://example.com/index.html/linky">linky</a>',
        context
      );

      context.url = "www.example.com";
      context.path = "yep";
      forEach(callbacks, function(callback) { callback(); });

      equalTokens(fragment, '<a href="http://www.example.com/yep.html/linky">linky</a>');

      context.url = "nope.example.com";
      context.path = "nope";
      forEach(callbacks, function(callback) { callback(); });

      equalTokens(fragment, '<a href="http://nope.example.com/nope.html/linky">linky</a>');
    });
    */
    test("Elements inside a yielded block", () => {
      compilesTo('{{#identity}}<div id="test">123</div>{{/identity}}', '<div id="test">123</div>');
    });

    test("A simple block helper can return text", () => {
      compilesTo('{{#identity}}test{{else}}not shown{{/identity}}', 'test');
    });

    test("A block helper can have an else block", () => {
      compilesTo('{{#render-inverse}}Nope{{else}}<div id="test">123</div>{{/render-inverse}}', '<div id="test">123</div>');
    });
  });

  module("miscellaneous", () => {
    test('Components - Unknown helpers fall back to elements', function () {
      let object = { size: 'med', foo: 'b' };
      compilesTo('<x-bar class="btn-{{size}}">a{{foo}}c</x-bar>','<x-bar class="btn-med">abc</x-bar>', object);
    });

    test('Components - Text-only attributes work', function () {
      let object = { foo: 'qux' };
      compilesTo('<x-bar id="test">{{foo}}</x-bar>','<x-bar id="test">qux</x-bar>', object);
    });

    test('Components - Empty components work', function () {
      compilesTo('<x-bar></x-bar>','<x-bar></x-bar>', {});
    });

    test('Components - Text-only dashed attributes work', function () {
      let object = { foo: 'qux' };
      compilesTo('<x-bar aria-label="foo" id="test">{{foo}}</x-bar>','<x-bar aria-label="foo" id="test">qux</x-bar>', object);
    });

    test('Repaired text nodes are ensured in the right place', function () {
      let object = { a: "A", b: "B", c: "C", d: "D" };
      compilesTo('{{a}} {{b}}', 'A B', object);
      compilesTo('<div>{{a}}{{b}}{{c}}wat{{d}}</div>', '<div>ABCwatD</div>', object);
      compilesTo('{{a}}{{b}}<img><img><img><img>', 'AB<img><img><img><img>', object);
    });

    test("Simple elements can have dashed attributes", () => {
      let template = compile("<div aria-label='foo'>content</div>");
      render(template, {});

      equalTokens(root, '<div aria-label="foo">content</div>');
    });

    test('Block params in HTML syntax - Throws exception if given zero parameters', assert => {
      assert.expect(2);

      assert.throws(function() {
        compile('<x-bar as ||>foo</x-bar>');
      }, /Cannot use zero block parameters: 'as \|\|'/);
      assert.throws(function() {
        compile('<x-bar as | |>foo</x-bar>');
      }, /Cannot use zero block parameters: 'as \| \|'/);
    });

    test("Block params in HTML syntax - Throws an error on invalid block params syntax", assert => {
      assert.expect(3);

      assert.throws(function() {
        compile('<x-bar as |x y>{{x}},{{y}}</x-bar>');
      }, /Invalid block parameters syntax: 'as |x y'/);
      assert.throws(function() {
        compile('<x-bar as |x| y>{{x}},{{y}}</x-bar>');
      }, /Invalid block parameters syntax: 'as \|x\| y'/);
      assert.throws(function() {
        compile('<x-bar as |x| y|>{{x}},{{y}}</x-bar>');
      }, /Invalid block parameters syntax: 'as \|x\| y\|'/);
    });

    test("Block params in HTML syntax - Throws an error on invalid identifiers for params", assert => {
      assert.expect(3);

      assert.throws(function() {
        compile('<x-bar as |x foo.bar|></x-bar>');
      }, /Invalid identifier for block parameters: 'foo\.bar' in 'as \|x foo\.bar|'/);
      assert.throws(function() {
        compile('<x-bar as |x "foo"|></x-bar>');
      }, /Syntax error at line 1 col 17: " is not a valid character within attribute names/);
      assert.throws(function() {
        compile('<x-bar as |foo[bar]|></x-bar>');
      }, /Invalid identifier for block parameters: 'foo\[bar\]' in 'as \|foo\[bar\]\|'/);
    });
  });

  module("invalid HTML", () => {
    test("A helpful error message is provided for unclosed elements", assert => {
      assert.expect(2);

      assert.throws(function() {
        compile('\n<div class="my-div" \n foo={{bar}}>\n<span>\n</span>\n');
      }, /Unclosed element `div` \(on line 2\)\./);
      assert.throws(function() {
        compile('\n<div class="my-div">\n<span>\n');
      }, /Unclosed element `span` \(on line 3\)\./);
    });

    test("A helpful error message is provided for unmatched end tags", assert => {
      assert.expect(2);

      assert.throws(function() {
        compile("</p>");
      }, /Closing tag `p` \(on line 1\) without an open tag\./);
      assert.throws(function() {
        compile("<em>{{ foo }}</em> \n {{ bar }}\n</div>");
      }, /Closing tag `div` \(on line 3\) without an open tag\./);
    });

    test("A helpful error message is provided for end tags for void elements", assert => {
      assert.expect(3);

      assert.throws(function() {
        compile("<input></input>");
      }, /Invalid end tag `input` \(on line 1\) \(void elements cannot have end tags\)./);
      assert.throws(function() {
        compile("<div>\n  <input></input>\n</div>");
      }, /Invalid end tag `input` \(on line 2\) \(void elements cannot have end tags\)./);
      assert.throws(function() {
        compile("\n\n</br>");
      }, /Invalid end tag `br` \(on line 3\) \(void elements cannot have end tags\)./);
    });

    test("A helpful error message is provided for end tags with attributes", assert => {
      assert.throws(function() {
        compile('<div>\nSomething\n\n</div foo="bar">');
      }, /Invalid end tag: closing tag must not have attributes, in `div` \(on line 4\)\./);
    });

    test("A helpful error message is provided for mismatched start/end tags", assert => {
      assert.throws(function() {
        compile("<div>\n<p>\nSomething\n\n</div>");
      }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
    });

    test("error line numbers include comment lines", assert => {
      assert.throws(function() {
        compile("<div>\n<p>\n{{! some comment}}\n\n</div>");
      }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
    });

    test("error line numbers include mustache only lines", assert => {
      assert.throws(function() {
        compile("<div>\n<p>\n{{someProp}}\n\n</div>");
      }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
    });

    test("error line numbers include block lines", assert => {
      assert.throws(function() {
        compile("<div>\n<p>\n{{#some-comment}}\n{{/some-comment}}\n</div>");
      }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
    });

    test("error line numbers include whitespace control mustaches", assert => {
      assert.throws(function() {
        compile("<div>\n<p>\n{{someProp~}}\n\n</div>{{some-comment}}");
      }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
    });

    test("error line numbers include multiple mustache lines", assert => {
      assert.throws(function() {
        compile("<div>\n<p>\n{{some-comment}}</div>{{some-comment}}");
      }, /Closing tag `div` \(on line 3\) did not match last open tag `p` \(on line 2\)\./);
    });
  });

  module("namespaced HTML", () => {
    test("Namespaced attribute", assert => {
      compilesTo("<svg xlink:title='svg-title'>content</svg>");
      let svg = root.firstChild;
      if (assertNodeTagName(svg, 'svg')) {
        assert.equal(svg.namespaceURI, SVG_NAMESPACE);
        assert.equal(svg.attributes[0].namespaceURI, XLINK_NAMESPACE);
      }
    });

    test("<svg> tag with case-sensitive attribute", assert => {
      let viewBox = '0 0 0 0';
      compilesTo(`<svg viewBox="${viewBox}"></svg>`);
      let svg = root.firstChild;
      if (assertNodeTagName(svg, 'svg')) {
        assert.equal(svg.namespaceURI, SVG_NAMESPACE);
        assert.equal(svg.getAttribute('viewBox'), viewBox);
      }
    });

    test("nested element in the SVG namespace", assert => {
      let d = 'M 0 0 L 100 100';
      compilesTo(`<svg><path d="${d}"></path></svg>`);
      let svg = root.firstChild;
      if (assertNodeTagName(svg, 'svg')) {
        assert.equal(svg.namespaceURI, SVG_NAMESPACE);
        let path = svg.firstChild;
        if (assertNodeTagName(path, 'path')) {
          assert.equal(path.namespaceURI, SVG_NAMESPACE,
                "creates the path element with a namespace");
          assert.equal(path.getAttribute('d'), d);
        }
      }
    });

    test("<foreignObject> tag has an SVG namespace", assert => {
      compilesTo('<svg><foreignObject>Hi</foreignObject></svg>');
      let svg = root.firstChild;
      if (assertNodeTagName(svg, 'svg')) {
        assert.equal(svg.namespaceURI, SVG_NAMESPACE);
        let foreignObject = svg.firstChild;
        if (assertNodeTagName(foreignObject, 'foreignobject')) {
          assert.equal(foreignObject.namespaceURI, SVG_NAMESPACE,
              "creates the foreignObject element with a namespace");
        }
      }
    });

    test("Namespaced and non-namespaced elements as siblings", assert => {
      compilesTo('<svg></svg><svg></svg><div></div>');
      assert.equal(root.childNodes[0].namespaceURI, SVG_NAMESPACE,
            "creates the first svg element with a namespace");
      assert.equal(root.childNodes[1].namespaceURI, SVG_NAMESPACE,
            "creates the second svg element with a namespace");
      assert.equal(root.childNodes[2].namespaceURI, XHTML_NAMESPACE,
            "creates the div element without a namespace");
    });

    test("Namespaced and non-namespaced elements with nesting", assert => {
      compilesTo('<div><svg></svg></div><div></div>');
      let firstDiv = root.firstChild;
      let secondDiv = root.lastChild;
      let svg = firstDiv && firstDiv.firstChild;
      if (assertNodeTagName(firstDiv, 'div')) {
        assert.equal(firstDiv.namespaceURI, XHTML_NAMESPACE,
              "first div's namespace is xhtmlNamespace");
      }
      if (assertNodeTagName(svg, 'svg')) {
        assert.equal(svg.namespaceURI, SVG_NAMESPACE,
              "svg's namespace is svgNamespace");
      }
      if (assertNodeTagName(secondDiv, 'div')) {
        assert.equal(secondDiv.namespaceURI, XHTML_NAMESPACE,
              "last div's namespace is xhtmlNamespace");
      }
    });

    test("Case-sensitive tag has capitalization preserved", () => {
      compilesTo('<svg><linearGradient id="gradient"></linearGradient></svg>');
    });
  });
});

module('Style attributes', {
  beforeEach() {
    class StyleEnv extends TestEnvironment {
      attributeFor(element: Simple.Element, attr: string, isTrusting: boolean): AttributeManager {
        if (attr === 'style' && !isTrusting) {
          return STYLE_ATTRIBUTE;
        }

        return super.attributeFor(element, attr, isTrusting);
      }
    }

    commonSetup(new StyleEnv());

  },
  afterEach() {
    warnings = 0;
  }
}, () => {
  test(`using a static inline style on an element does not give you a warning`, function(assert) {
    let template = compile(`<div style="background: red">Thing</div>`);
    render(template, {});

    assert.strictEqual(warnings, 0);

    equalTokens(root, '<div style="background: red">Thing</div>', "initial render");
  });

  test(`triple curlies are trusted`, function(assert) {
    let template = compile(`<div foo={{foo}} style={{{styles}}}>Thing</div>`);
    render(template, {styles: 'background: red'});

    assert.strictEqual(warnings, 0);

    equalTokens(root, '<div style="background: red">Thing</div>', "initial render");
  });

  test(`using a static inline style on an namespaced element does not give you a warning`, function(assert) {
    let template = compile(`<svg xmlns:svg="http://www.w3.org/2000/svg" style="background: red" />`);

    render(template, {});

    assert.strictEqual(warnings, 0);

    equalTokens(root, '<svg xmlns:svg="http://www.w3.org/2000/svg" style="background: red"></svg>', "initial render");
  });
});

let warnings = 0;

class StyleAttribute extends AttributeManager {
  setAttribute(env: Environment, element: Simple.Element, value: Opaque) {
    warnings++;
    super.setAttribute(env, element, value);
  }

  updateAttribute() {}
}

const STYLE_ATTRIBUTE = new StyleAttribute('style');

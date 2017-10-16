import { test } from "../render-test";
import { AbstractNodeTest } from '../environment/modes/ssr/environment';

export class SSRSuite extends AbstractNodeTest {
  @test "HTML text content"() {
    this.render('content');
    this.assertHTML('content');
  }

  @test "HTML tags"() {
    this.render('<h1>hello!</h1><div>content</div>');
    this.assertHTML('<h1>hello!</h1><div>content</div>');
  }

  @test "HTML tags re-rendered"() {
    this.render('<h1>hello!</h1><div>content</div>');
    this.assertHTML('<h1>hello!</h1><div>content</div>');
    this.rerender();
    this.assertHTML('<h1>hello!</h1><div>content</div>');
  }

  @test "HTML attributes"() {
    this.render("<div id='bar' class='foo'>content</div>");
    this.assertHTML('<div id="bar" class="foo">content</div>');
  }

  @test "HTML tag with empty attribute"() {
    this.render("<div class=''>content</div>");
    this.assertHTML('<div class>content</div>');
  }

  @test "HTML boolean attribute 'disabled'"() {
    this.render('<input disabled>');
    this.assertHTML('<input disabled>');
  }

  @test "Quoted attribute expression is removed when null"() {
    this.render('<input disabled="{{isDisabled}}">', { isDisabled: null });
    this.assertHTML('<input>');
  }

  @test"Unquoted attribute expression with null value is not coerced"() {
    this.render('<input disabled={{isDisabled}}>', { isDisabled: null });
    this.assertHTML('<input>');
  }

  @test "Attribute expression can be followed by another attribute"() {
    this.render('<div foo="{{funstuff}}" name="Alice"></div>', { funstuff: "oh my" });
    this.assertHTML('<div foo="oh my" name="Alice"></div>');
  }

  @test "HTML tag with data- attribute"() {
    this.render("<div data-some-data='foo'>content</div>");
    this.assertHTML('<div data-some-data="foo">content</div>');
  }

  @test "The compiler can handle nesting"() {
    this.render('<div class="foo"><p><span id="bar" data-foo="bar">hi!</span></p></div>&nbsp;More content');

    // Note that the space after the closing div tag is a non-breaking space (Unicode 0xA0)
    this.assertHTML('<div class="foo"><p><span id="bar" data-foo="bar">hi!</span></p></div> More content');
  }

  @test "The compiler can handle comments"() {
    this.render('<div><!-- Just passing through --></div>');
    this.assertHTML('<div><!-- Just passing through --></div>');
  }

  @test "The compiler can handle HTML comments with mustaches in them"() {
    this.render('<div><!-- {{foo}} --></div>', { foo: 'bar' });
    this.assertHTML('<div><!-- {{foo}} --></div>');
  }

  @test "The compiler can handle HTML comments with complex mustaches in them"() {
    this.render('<div><!-- {{foo bar baz}} --></div>', { foo: 'bar' });
    this.assertHTML('<div><!-- {{foo bar baz}} --></div>');
  }

  @test "The compiler can handle HTML comments with multi-line mustaches in them"() {
    this.render('<div><!-- {{#each foo as |bar|}}\n{{bar}}\n\n{{/each}} --></div>', { foo: 'bar' });

    this.assertHTML('<div><!-- {{#each foo as |bar|}}\n{{bar}}\n\n{{/each}} --></div>');
  }

  @test "The compiler can handle comments with no parent element"() {
    this.render('<!-- {{foo}} -->', { foo: 'bar' });
    this.assertHTML('<!-- {{foo}} -->');
  }

  @test "The compiler can handle simple handlebars"() {
    this.render('<div>{{title}}</div>', { title: 'hello' });
    this.assertHTML('<div>hello</div>');
  }

  @test "The compiler can handle escaping HTML"() {
    this.render('<div>{{title}}</div>', { title: '<strong>hello</strong>' });
    this.assertHTML('<div>&lt;strong&gt;hello&lt;/strong&gt;</div>');
  }

  @test "The compiler can handle unescaped HTML"() {
    this.render('<div>{{{title}}}</div>', { title: '<strong>hello</strong>' });
    this.assertHTML('<div><strong>hello</strong></div>');
  }

  @test "Unescaped helpers render correctly"() {
    this.registerHelper('testing-unescaped', (params) => params[0]);
    this.render('{{{testing-unescaped "<span>hi</span>"}}}');
    this.assertHTML('<span>hi</span>');
  }

  @test 'Null literals do not have representation in DOM'() {
    this.render('{{null}}');
    this.assertHTML('');
  }

  @test "Attributes can be populated with helpers that generate a string"() {
    this.registerHelper('testing', (params) => {
      return params[0];
    });

    this.render('<a href="{{testing url}}">linky</a>', { url: 'linky.html' });
    this.assertHTML('<a href="linky.html">linky</a>');
  }

  @test "Elements inside a yielded block"() {
    this.render('{{#if true}}<div id="test">123</div>{{/if}}');
    this.assertHTML('<div id="test">123</div>');
  }

  @test "A simple block helper can return text"() {
    this.render('{{#if true}}test{{else}}not shown{{/if}}');
    this.assertHTML('test');
  }

  @test "SVG: basic element"() {
    let template = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" height="100" width="100" style="stroke:#ff0000; fill: #0000ff"></rect>
      </svg>
    `;
    this.render(template);
    this.assertHTML(template);
  }

  @test "SVG: element with xlink:href"() {
    let template = `
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <rect x=".01" y=".01" width="4.98" height="2.98" fill="none" stroke="blue" stroke-width=".03"></rect>
        <a xlink:href="http://www.w3.org">
          <ellipse cx="2.5" cy="1.5" rx="2" ry="1" fill="red"></ellipse>
        </a>
      </svg>
    `;
    this.render(template);

    this.assertHTML(template);
  }
}

export class SSRComponentSuite extends AbstractNodeTest {
  @test
  "can render components"() {
    this.render({
      layout: '<h1>Hello World!</h1>'
    });
    this.assertComponent('<h1>Hello World!</h1>');
  }

  @test
  "can render components with yield"() {
    this.render({
      layout: '<h1>Hello {{yield}}!</h1>',
      template: 'World'
    });
    this.assertComponent('<h1>Hello World!</h1>');
  }

  @test
  "can render components with args"() {
    this.render({
      layout: '<h1>Hello {{@place}}!</h1>',
      template: 'World',
      args: { place: "place" }
    }, { place: 'World' });
    this.assertComponent('<h1>Hello World!</h1>');
  }

  @test
  "can render components with block params"() {
    this.render({
      layout: '<h1>Hello {{yield @place}}!</h1>',
      template: '{{place}}',
      args: { place: 'place' },
      blockParams: ['place']
    }, { place: 'World' });
    this.assertComponent('<h1>Hello World!</h1>');
  }
}

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { RenderTest } from '../render-test';
import { test } from '../test-decorator';
import { strip, unwrap } from '@glimmer/util';
import { firstElementChild, getElementsByTagName } from '../dom/simple-utils';
import { assertNodeTagName } from '../dom/assertions';
export class InitialRenderSuite extends RenderTest {
    constructor() {
        super(...arguments);
        this.name = 'BASE';
    }
    'HTML text content'() {
        this.render('content');
        this.assertHTML('content');
        this.assertStableRerender();
    }
    'HTML tags'() {
        this.render('<h1>hello!</h1><div>content</div>');
        this.assertHTML('<h1>hello!</h1><div>content</div>');
        this.assertStableRerender();
    }
    'HTML attributes'() {
        this.render("<div class='foo' id='bar'>content</div>");
        this.assertHTML("<div class='foo' id='bar'>content</div>");
        this.assertStableRerender();
    }
    'HTML data attributes'() {
        this.render("<div data-some-data='foo'>content</div>");
        this.assertHTML("<div data-some-data='foo'>content</div>");
        this.assertStableRerender();
    }
    'HTML checked attributes'() {
        this.render("<input checked='checked'>");
        this.assertHTML(`<input checked='checked'>`);
        this.assertStableRerender();
    }
    'HTML selected options'() {
        this.render(strip `
      <select>
        <option>1</option>
        <option selected>2</option>
        <option>3</option>
      </select>
    `);
        this.assertHTML(strip `
      <select>
        <option>1</option>
        <option selected>2</option>
        <option>3</option>
      </select>
    `);
        this.assertStableRerender();
    }
    'HTML multi-select options'() {
        this.render(strip `
      <select multiple>
        <option>1</option>
        <option selected>2</option>
        <option selected>3</option>
      </select>
    `);
        this.assertHTML(strip `
      <select multiple>
        <option>1</option>
        <option selected>2</option>
        <option selected>3</option>
      </select>
    `);
        this.assertStableRerender();
    }
    'Void Elements'() {
        let voidElements = 'area base br embed hr img input keygen link meta param source track wbr';
        voidElements.split(' ').forEach(tagName => this.shouldBeVoid(tagName));
    }
    'Nested HTML'() {
        this.render("<div class='foo'><p><span id='bar' data-foo='bar'>hi!</span></p></div>&nbsp;More content");
        this.assertHTML("<div class='foo'><p><span id='bar' data-foo='bar'>hi!</span></p></div>&nbsp;More content");
        this.assertStableRerender();
    }
    'Custom Elements'() {
        this.render('<use-the-platform></use-the-platform>');
        this.assertHTML('<use-the-platform></use-the-platform>');
        this.assertStableRerender();
    }
    'Nested Custom Elements'() {
        this.render("<use-the-platform><seriously-please data-foo='1'>Stuff <div>Here</div></seriously-please></use-the-platform>");
        this.assertHTML("<use-the-platform><seriously-please data-foo='1'>Stuff <div>Here</div></seriously-please></use-the-platform>");
        this.assertStableRerender();
    }
    'Moar nested Custom Elements'() {
        this.render("<use-the-platform><seriously-please data-foo='1'><wheres-the-platform>Here</wheres-the-platform></seriously-please></use-the-platform>");
        this.assertHTML("<use-the-platform><seriously-please data-foo='1'><wheres-the-platform>Here</wheres-the-platform></seriously-please></use-the-platform>");
        this.assertStableRerender();
    }
    'Custom Elements with dynamic attributes'() {
        this.render("<fake-thing><other-fake-thing data-src='extra-{{someDynamicBits}}-here' /></fake-thing>", { someDynamicBits: 'things' });
        this.assertHTML("<fake-thing><other-fake-thing data-src='extra-things-here' /></fake-thing>");
        this.assertStableRerender();
    }
    'Custom Elements with dynamic content'() {
        this.render('<x-foo><x-bar>{{derp}}</x-bar></x-foo>', { derp: 'stuff' });
        this.assertHTML('<x-foo><x-bar>stuff</x-bar></x-foo>');
        this.assertStableRerender();
    }
    'Dynamic content within single custom element'() {
        this.render('<x-foo>{{#if derp}}Content Here{{/if}}</x-foo>', { derp: 'stuff' });
        this.assertHTML('<x-foo>Content Here</x-foo>');
        this.assertStableRerender();
        this.rerender({ derp: false });
        this.assertHTML('<x-foo><!----></x-foo>');
        this.assertStableRerender();
        this.rerender({ derp: true });
        this.assertHTML('<x-foo>Content Here</x-foo>');
        this.assertStableRerender();
        this.rerender({ derp: 'stuff' });
        this.assertHTML('<x-foo>Content Here</x-foo>');
        this.assertStableRerender();
    }
    'Supports quotes'() {
        this.render('<div>"This is a title," we\'re on a boat</div>');
        this.assertHTML('<div>"This is a title," we\'re on a boat</div>');
        this.assertStableRerender();
    }
    'Supports backslashes'() {
        this.render('<div>This is a backslash: \\</div>');
        this.assertHTML('<div>This is a backslash: \\</div>');
        this.assertStableRerender();
    }
    'Supports new lines'() {
        this.render('<div>common\n\nbro</div>');
        this.assertHTML('<div>common\n\nbro</div>');
        this.assertStableRerender();
    }
    'HTML tag with empty attribute'() {
        this.render("<div class=''>content</div>");
        this.assertHTML("<div class=''>content</div>");
        this.assertStableRerender();
    }
    'Attributes containing a helper are treated like a block'() {
        this.registerHelper('testing', params => {
            this.assert.deepEqual(params, [123]);
            return 'example.com';
        });
        this.render('<a href="http://{{testing 123}}/index.html">linky</a>');
        this.assertHTML('<a href="http://example.com/index.html">linky</a>');
        this.assertStableRerender();
    }
    "HTML boolean attribute 'disabled'"() {
        this.render('<input disabled>');
        this.assertHTML('<input disabled>');
        // TODO: What is the point of this test? (Note that it wouldn't work with SimpleDOM)
        // assertNodeProperty(root.firstChild, 'input', 'disabled', true);
        this.assertStableRerender();
    }
    'Quoted attribute null values do not disable'() {
        this.render('<input disabled="{{isDisabled}}">', { isDisabled: null });
        this.assertHTML('<input>');
        this.assertStableRerender();
        // TODO: What is the point of this test? (Note that it wouldn't work with SimpleDOM)
        // assertNodeProperty(root.firstChild, 'input', 'disabled', false);
        this.rerender({ isDisabled: true });
        this.assertHTML('<input disabled>');
        this.assertStableNodes();
        // TODO: ??????????
        this.rerender({ isDisabled: false });
        this.assertHTML('<input disabled>');
        this.assertStableNodes();
        this.rerender({ isDisabled: null });
        this.assertHTML('<input>');
        this.assertStableNodes();
    }
    'Unquoted attribute null values do not disable'() {
        this.render('<input disabled={{isDisabled}}>', { isDisabled: null });
        this.assertHTML('<input>');
        this.assertStableRerender();
        // TODO: What is the point of this test? (Note that it wouldn't work with SimpleDOM)
        // assertNodeProperty(root.firstChild, 'input', 'disabled', false);
        this.rerender({ isDisabled: true });
        this.assertHTML('<input disabled>');
        this.assertStableRerender();
        this.rerender({ isDisabled: false });
        this.assertHTML('<input>');
        this.assertStableRerender();
        this.rerender({ isDisabled: null });
        this.assertHTML('<input>');
        this.assertStableRerender();
    }
    'Quoted attribute string values'() {
        this.render("<img src='{{src}}'>", { src: 'image.png' });
        this.assertHTML("<img src='image.png'>");
        this.assertStableRerender();
        this.rerender({ src: 'newimage.png' });
        this.assertHTML("<img src='newimage.png'>");
        this.assertStableNodes();
        this.rerender({ src: '' });
        this.assertHTML("<img src=''>");
        this.assertStableNodes();
        this.rerender({ src: 'image.png' });
        this.assertHTML("<img src='image.png'>");
        this.assertStableNodes();
    }
    'Unquoted attribute string values'() {
        this.render('<img src={{src}}>', { src: 'image.png' });
        this.assertHTML("<img src='image.png'>");
        this.assertStableRerender();
        this.rerender({ src: 'newimage.png' });
        this.assertHTML("<img src='newimage.png'>");
        this.assertStableNodes();
        this.rerender({ src: '' });
        this.assertHTML("<img src=''>");
        this.assertStableNodes();
        this.rerender({ src: 'image.png' });
        this.assertHTML("<img src='image.png'>");
        this.assertStableNodes();
    }
    'Unquoted img src attribute is not rendered when set to `null`'() {
        this.render("<img src='{{src}}'>", { src: null });
        this.assertHTML('<img>');
        this.assertStableRerender();
        this.rerender({ src: 'newimage.png' });
        this.assertHTML("<img src='newimage.png'>");
        this.assertStableNodes();
        this.rerender({ src: '' });
        this.assertHTML("<img src=''>");
        this.assertStableNodes();
        this.rerender({ src: null });
        this.assertHTML('<img>');
        this.assertStableNodes();
    }
    'Unquoted img src attribute is not rendered when set to `undefined`'() {
        this.render("<img src='{{src}}'>", { src: undefined });
        this.assertHTML('<img>');
        this.assertStableRerender();
        this.rerender({ src: 'newimage.png' });
        this.assertHTML("<img src='newimage.png'>");
        this.assertStableNodes();
        this.rerender({ src: '' });
        this.assertHTML("<img src=''>");
        this.assertStableNodes();
        this.rerender({ src: undefined });
        this.assertHTML('<img>');
        this.assertStableNodes();
    }
    'Unquoted a href attribute is not rendered when set to `null`'() {
        this.render('<a href={{href}}></a>', { href: null });
        this.assertHTML('<a></a>');
        this.assertStableRerender();
        this.rerender({ href: 'http://example.com' });
        this.assertHTML("<a href='http://example.com'></a>");
        this.assertStableNodes();
        this.rerender({ href: '' });
        this.assertHTML("<a href=''></a>");
        this.assertStableNodes();
        this.rerender({ href: null });
        this.assertHTML('<a></a>');
        this.assertStableNodes();
    }
    'Unquoted a href attribute is not rendered when set to `undefined`'() {
        this.render('<a href={{href}}></a>', { href: undefined });
        this.assertHTML('<a></a>');
        this.assertStableRerender();
        this.rerender({ href: 'http://example.com' });
        this.assertHTML("<a href='http://example.com'></a>");
        this.assertStableNodes();
        this.rerender({ href: '' });
        this.assertHTML("<a href=''></a>");
        this.assertStableNodes();
        this.rerender({ href: undefined });
        this.assertHTML('<a></a>');
        this.assertStableNodes();
    }
    'Attribute expression can be followed by another attribute'() {
        this.render("<div foo='{{funstuff}}' name='Alice'></div>", { funstuff: 'oh my' });
        this.assertHTML("<div name='Alice' foo='oh my'></div>");
        this.assertStableRerender();
        this.rerender({ funstuff: 'oh boy' });
        this.assertHTML("<div name='Alice' foo='oh boy'></div>");
        this.assertStableNodes();
        this.rerender({ funstuff: '' });
        this.assertHTML("<div name='Alice' foo=''></div>");
        this.assertStableNodes();
        this.rerender({ funstuff: 'oh my' });
        this.assertHTML("<div name='Alice' foo='oh my'></div>");
        this.assertStableNodes();
    }
    'Dynamic selected options'() {
        this.render(strip `
      <select>
        <option>1</option>
        <option selected={{selected}}>2</option>
        <option>3</option>
      </select>
    `, { selected: true });
        this.assertHTML(strip `
      <select>
        <option>1</option>
        <option ${this.name === 'rehydration' ? ' selected=true' : ''}>2</option>
        <option>3</option>
      </select>
    `);
        let selectNode = unwrap(firstElementChild(this.element));
        this.assert.equal(selectNode.selectedIndex, 1);
        this.assertStableRerender();
        this.rerender({ selected: false });
        this.assertHTML(strip `
      <select>
        <option>1</option>
        <option ${this.name === 'rehydration' ? ' selected=true' : ''}>2</option>
        <option>3</option>
      </select>
    `);
        selectNode = unwrap(firstElementChild(this.element));
        this.assert.equal(selectNode.selectedIndex, 0);
        this.assertStableNodes();
        this.rerender({ selected: '' });
        this.assertHTML(strip `
      <select>
        <option>1</option>
        <option ${this.name === 'rehydration' ? ' selected=true' : ''}>2</option>
        <option>3</option>
      </select>
    `);
        selectNode = unwrap(firstElementChild(this.element));
        this.assert.equal(selectNode.selectedIndex, 0);
        this.assertStableNodes();
        this.rerender({ selected: true });
        this.assertHTML(strip `
      <select>
        <option>1</option>
        <option ${this.name === 'rehydration' ? ' selected=true' : ''}>2</option>
        <option>3</option>
      </select>
    `);
        selectNode = unwrap(firstElementChild(this.element));
        this.assert.equal(selectNode.selectedIndex, 1);
        this.assertStableNodes();
    }
    'Dynamic multi-select'() {
        this.render(strip `
      <select multiple>
        <option>0</option>
        <option selected={{somethingTrue}}>1</option>
        <option selected={{somethingTruthy}}>2</option>
        <option selected={{somethingUndefined}}>3</option>
        <option selected={{somethingNull}}>4</option>
        <option selected={{somethingFalse}}>5</option>
      </select>`, {
            somethingTrue: true,
            somethingTruthy: 'is-true',
            somethingUndefined: undefined,
            somethingNull: null,
            somethingFalse: false,
        });
        let selectNode = firstElementChild(this.element);
        this.assert.ok(selectNode, 'rendered select');
        if (selectNode === null) {
            return;
        }
        let options = getElementsByTagName(selectNode, 'option');
        let selected = [];
        for (let i = 0; i < options.length; i++) {
            let option = options[i];
            // TODO: This is a real discrepancy with SimpleDOM
            if (option.selected) {
                selected.push(option);
            }
        }
        this.assertHTML(strip `
      <select multiple="">
        <option>0</option>
        <option ${this.name === 'rehydration' ? ' selected=true' : ''}>1</option>
        <option ${this.name === 'rehydration' ? ' selected=true' : ''}>2</option>
        <option>3</option>
        <option>4</option>
        <option>5</option>
      </select>`);
        this.assert.equal(selected.length, 2, 'two options are selected');
        this.assert.equal(selected[0].value, '1', 'first selected item is "1"');
        this.assert.equal(selected[1].value, '2', 'second selected item is "2"');
    }
    'HTML comments'() {
        this.render('<div><!-- Just passing through --></div>');
        this.assertHTML('<div><!-- Just passing through --></div>');
        this.assertStableRerender();
    }
    'Curlies in HTML comments'() {
        this.render('<div><!-- {{foo}} --></div>', { foo: 'foo' });
        this.assertHTML('<div><!-- {{foo}} --></div>');
        this.assertStableRerender();
        this.rerender({ foo: 'bar' });
        this.assertHTML('<div><!-- {{foo}} --></div>');
        this.assertStableNodes();
        this.rerender({ foo: '' });
        this.assertHTML('<div><!-- {{foo}} --></div>');
        this.assertStableNodes();
        this.rerender({ foo: 'foo' });
        this.assertHTML('<div><!-- {{foo}} --></div>');
        this.assertStableNodes();
    }
    'Complex Curlies in HTML comments'() {
        this.render('<div><!-- {{foo bar baz}} --></div>', { foo: 'foo' });
        this.assertHTML('<div><!-- {{foo bar baz}} --></div>');
        this.assertStableRerender();
        this.rerender({ foo: 'bar' });
        this.assertHTML('<div><!-- {{foo bar baz}} --></div>');
        this.assertStableNodes();
        this.rerender({ foo: '' });
        this.assertHTML('<div><!-- {{foo bar baz}} --></div>');
        this.assertStableNodes();
        this.rerender({ foo: 'foo' });
        this.assertHTML('<div><!-- {{foo bar baz}} --></div>');
        this.assertStableNodes();
    }
    'HTML comments with multi-line mustaches'() {
        this.render('<div><!-- {{#each foo as |bar|}}\n{{bar}}\n\n{{/each}} --></div>');
        this.assertHTML('<div><!-- {{#each foo as |bar|}}\n{{bar}}\n\n{{/each}} --></div>');
        this.assertStableRerender();
    }
    'Top level comments'() {
        this.render('<!-- {{foo}} -->');
        this.assertHTML('<!-- {{foo}} -->');
        this.assertStableRerender();
    }
    'Handlebars comments'() {
        this.render('<div>{{! Better not break! }}content</div>');
        this.assertHTML('<div>content</div>');
        this.assertStableRerender();
    }
    'Namespaced attribute'() {
        this.render("<svg xlink:title='svg-title'>content</svg>");
        this.assertHTML("<svg xlink:title='svg-title'>content</svg>");
        this.assertStableRerender();
    }
    '<svg> tag with case-sensitive attribute'() {
        this.render('<svg viewBox="0 0 0 0"></svg>');
        this.assertHTML('<svg viewBox="0 0 0 0"></svg>');
        let svg = this.element.firstChild;
        if (assertNodeTagName(svg, 'svg')) {
            this.assert.equal(svg.namespaceURI, "http://www.w3.org/2000/svg" /* SVG */);
            this.assert.equal(svg.getAttribute('viewBox'), '0 0 0 0');
        }
        this.assertStableRerender();
    }
    'nested element in the SVG namespace'() {
        let d = 'M 0 0 L 100 100';
        this.render(`<svg><path d="${d}"></path></svg>`);
        this.assertHTML(`<svg><path d="${d}"></path></svg>`);
        let svg = this.element.firstChild;
        if (assertNodeTagName(svg, 'svg')) {
            this.assert.equal(svg.namespaceURI, "http://www.w3.org/2000/svg" /* SVG */);
            let path = svg.firstChild;
            if (assertNodeTagName(path, 'path')) {
                this.assert.equal(path.namespaceURI, "http://www.w3.org/2000/svg" /* SVG */, 'creates the path element with a namespace');
                this.assert.equal(path.getAttribute('d'), d);
            }
        }
        this.assertStableRerender();
    }
    '<foreignObject> tag has an SVG namespace'() {
        this.render('<svg><foreignObject>Hi</foreignObject></svg>');
        this.assertHTML('<svg><foreignObject>Hi</foreignObject></svg>');
        let svg = this.element.firstChild;
        if (assertNodeTagName(svg, 'svg')) {
            this.assert.equal(svg.namespaceURI, "http://www.w3.org/2000/svg" /* SVG */);
            let foreignObject = svg.firstChild;
            if (assertNodeTagName(foreignObject, 'foreignObject')) {
                this.assert.equal(foreignObject.namespaceURI, "http://www.w3.org/2000/svg" /* SVG */, 'creates the foreignObject element with a namespace');
            }
        }
        this.assertStableRerender();
    }
    'Namespaced and non-namespaced elements as siblings'() {
        this.render('<svg></svg><svg></svg><div></div>');
        this.assertHTML('<svg></svg><svg></svg><div></div>');
        this.assert.equal(this.element.childNodes[0].namespaceURI, "http://www.w3.org/2000/svg" /* SVG */, 'creates the first svg element with a namespace');
        this.assert.equal(this.element.childNodes[1].namespaceURI, "http://www.w3.org/2000/svg" /* SVG */, 'creates the second svg element with a namespace');
        this.assert.equal(this.element.childNodes[2].namespaceURI, XHTML_NAMESPACE, 'creates the div element without a namespace');
        this.assertStableRerender();
    }
    'Namespaced and non-namespaced elements with nesting'() {
        this.render('<div><svg></svg></div><div></div>');
        let firstDiv = this.element.firstChild;
        let secondDiv = this.element.lastChild;
        let svg = firstDiv && firstDiv.firstChild;
        this.assertHTML('<div><svg></svg></div><div></div>');
        if (assertNodeTagName(firstDiv, 'div')) {
            this.assert.equal(firstDiv.namespaceURI, XHTML_NAMESPACE, "first div's namespace is xhtmlNamespace");
        }
        if (assertNodeTagName(svg, 'svg')) {
            this.assert.equal(svg.namespaceURI, "http://www.w3.org/2000/svg" /* SVG */, "svg's namespace is svgNamespace");
        }
        if (assertNodeTagName(secondDiv, 'div')) {
            this.assert.equal(secondDiv.namespaceURI, XHTML_NAMESPACE, "last div's namespace is xhtmlNamespace");
        }
        this.assertStableRerender();
    }
    'Case-sensitive tag has capitalization preserved'() {
        this.render('<svg><linearGradient id="gradient"></linearGradient></svg>');
        this.assertHTML('<svg><linearGradient id="gradient"></linearGradient></svg>');
        this.assertStableRerender();
    }
    'Text curlies'() {
        this.render('<div>{{title}}<span>{{title}}</span></div>', { title: 'hello' });
        this.assertHTML('<div>hello<span>hello</span></div>');
        this.assertStableRerender();
        this.rerender({ title: 'goodbye' });
        this.assertHTML('<div>goodbye<span>goodbye</span></div>');
        this.assertStableNodes();
        this.rerender({ title: '' });
        this.assertHTML('<div><span></span></div>');
        this.assertStableNodes();
        this.rerender({ title: 'hello' });
        this.assertHTML('<div>hello<span>hello</span></div>');
        this.assertStableNodes();
    }
    'Repaired text nodes are ensured in the right place Part 1'() {
        this.render('{{a}} {{b}}', { a: 'A', b: 'B', c: 'C', d: 'D' });
        this.assertHTML('A B');
        this.assertStableRerender();
    }
    'Repaired text nodes are ensured in the right place Part 2'() {
        this.render('<div>{{a}}{{b}}{{c}}wat{{d}}</div>', { a: 'A', b: 'B', c: 'C', d: 'D' });
        this.assertHTML('<div>ABCwatD</div>');
        this.assertStableRerender();
    }
    'Repaired text nodes are ensured in the right place Part 3'() {
        this.render('{{a}}{{b}}<img><img><img><img>', { a: 'A', b: 'B', c: 'C', d: 'D' });
        this.assertHTML('AB<img><img><img><img>');
        this.assertStableRerender();
    }
    'Path expressions'() {
        this.render('<div>{{model.foo.bar}}<span>{{model.foo.bar}}</span></div>', {
            model: { foo: { bar: 'hello' } },
        });
        this.assertHTML('<div>hello<span>hello</span></div>');
        this.assertStableRerender();
        this.rerender({ model: { foo: { bar: 'goodbye' } } });
        this.assertHTML('<div>goodbye<span>goodbye</span></div>');
        this.assertStableNodes();
        this.rerender({ model: { foo: { bar: '' } } });
        this.assertHTML('<div><span></span></div>');
        this.assertStableNodes();
        this.rerender({ model: { foo: { bar: 'hello' } } });
        this.assertHTML('<div>hello<span>hello</span></div>');
        this.assertStableNodes();
    }
    'Text curlies perform escaping'() {
        this.render('<div>{{title}}<span>{{title}}</span></div>', { title: '<strong>hello</strong>' });
        this.assertHTML('<div>&lt;strong&gt;hello&lt;/strong&gt;<span>&lt;strong>hello&lt;/strong&gt;</span></div>');
        this.assertStableRerender();
        this.rerender({ title: '<i>goodbye</i>' });
        this.assertHTML('<div>&lt;i&gt;goodbye&lt;/i&gt;<span>&lt;i&gt;goodbye&lt;/i&gt;</span></div>');
        this.assertStableNodes();
        this.rerender({ title: '' });
        this.assertHTML('<div><span></span></div>');
        this.assertStableNodes();
        this.rerender({ title: '<strong>hello</strong>' });
        this.assertHTML('<div>&lt;strong&gt;hello&lt;/strong&gt;<span>&lt;strong>hello&lt;/strong&gt;</span></div>');
        this.assertStableNodes();
    }
    'Rerender respects whitespace'() {
        this.render('Hello {{ foo }} ', { foo: 'bar' });
        this.assertHTML('Hello bar ');
        this.assertStableRerender();
        this.rerender({ foo: 'baz' });
        this.assertHTML('Hello baz ');
        this.assertStableNodes();
        this.rerender({ foo: '' });
        this.assertHTML('Hello  ');
        this.assertStableNodes();
        this.rerender({ foo: 'bar' });
        this.assertHTML('Hello bar ');
        this.assertStableNodes();
    }
    'Safe HTML curlies'() {
        let title = {
            toHTML() {
                return '<span>hello</span> <em>world</em>';
            },
        };
        this.render('<div>{{title}}</div>', { title });
        this.assertHTML('<div><span>hello</span> <em>world</em></div>');
        this.assertStableRerender();
    }
    'Triple curlies'() {
        let title = '<span>hello</span> <em>world</em>';
        this.render('<div>{{{title}}}</div>', { title });
        this.assertHTML('<div><span>hello</span> <em>world</em></div>');
        this.assertStableRerender();
    }
    'Triple curlie helpers'() {
        this.registerHelper('unescaped', ([param]) => param);
        this.registerHelper('escaped', ([param]) => param);
        this.render('{{{unescaped "<strong>Yolo</strong>"}}} {{escaped "<strong>Yolo</strong>"}}');
        this.assertHTML('<strong>Yolo</strong> &lt;strong&gt;Yolo&lt;/strong&gt;');
        this.assertStableRerender();
    }
    'Top level triple curlies'() {
        let title = '<span>hello</span> <em>world</em>';
        this.render('{{{title}}}', { title });
        this.assertHTML('<span>hello</span> <em>world</em>');
        this.assertStableRerender();
    }
    'Top level unescaped tr'() {
        let title = '<tr><td>Yo</td></tr>';
        this.render('<table>{{{title}}}</table>', { title });
        this.assertHTML('<table><tbody><tr><td>Yo</td></tr></tbody></table>');
        this.assertStableRerender();
    }
    'The compiler can handle top-level unescaped td inside tr contextualElement'() {
        this.render('{{{html}}}', { html: '<td>Yo</td>' });
        this.assertHTML('<tr><td>Yo</td></tr>');
        this.assertStableRerender();
    }
    'Extreme nesting'() {
        this.render('{{foo}}<span>{{bar}}<a>{{baz}}<em>{{boo}}{{brew}}</em>{{bat}}</a></span><span><span>{{flute}}</span></span>{{argh}}', {
            foo: 'FOO',
            bar: 'BAR',
            baz: 'BAZ',
            boo: 'BOO',
            brew: 'BREW',
            bat: 'BAT',
            flute: 'FLUTE',
            argh: 'ARGH',
        });
        this.assertHTML('FOO<span>BAR<a>BAZ<em>BOOBREW</em>BAT</a></span><span><span>FLUTE</span></span>ARGH');
        this.assertStableRerender();
    }
    'Simple blocks'() {
        this.render('<div>{{#if admin}}<p>{{user}}</p>{{/if}}!</div>', {
            admin: true,
            user: 'chancancode',
        });
        this.assertHTML('<div><p>chancancode</p>!</div>');
        this.assertStableRerender();
        let p = this.element.firstChild.firstChild;
        this.rerender({ admin: false });
        this.assertHTML('<div><!---->!</div>');
        this.assertStableNodes({ except: p });
        let comment = this.element.firstChild.firstChild;
        this.rerender({ admin: true });
        this.assertHTML('<div><p>chancancode</p>!</div>');
        this.assertStableNodes({ except: comment });
    }
    'Nested blocks'() {
        this.render('<div>{{#if admin}}{{#if access}}<p>{{user}}</p>{{/if}}{{/if}}!</div>', {
            admin: true,
            access: true,
            user: 'chancancode',
        });
        this.assertHTML('<div><p>chancancode</p>!</div>');
        this.assertStableRerender();
        let p = this.element.firstChild.firstChild;
        this.rerender({ admin: false });
        this.assertHTML('<div><!---->!</div>');
        this.assertStableNodes({ except: p });
        let comment = this.element.firstChild.firstChild;
        this.rerender({ admin: true });
        this.assertHTML('<div><p>chancancode</p>!</div>');
        this.assertStableNodes({ except: comment });
        p = this.element.firstChild.firstChild;
        this.rerender({ access: false });
        this.assertHTML('<div><!---->!</div>');
        this.assertStableNodes({ except: p });
    }
    Loops() {
        this.render('<div>{{#each people key="handle" as |p|}}<span>{{p.handle}}</span> - {{p.name}}{{/each}}</div>', {
            people: [
                { handle: 'tomdale', name: 'Tom Dale' },
                { handle: 'chancancode', name: 'Godfrey Chan' },
                { handle: 'wycats', name: 'Yehuda Katz' },
            ],
        });
        this.assertHTML('<div><span>tomdale</span> - Tom Dale<span>chancancode</span> - Godfrey Chan<span>wycats</span> - Yehuda Katz</div>');
        this.assertStableRerender();
        this.rerender({
            people: [
                { handle: 'tomdale', name: 'Thomas Dale' },
                { handle: 'wycats', name: 'Yehuda Katz' },
            ],
        });
        this.assertHTML('<div><span>tomdale</span> - Thomas Dale<span>wycats</span> - Yehuda Katz</div>');
    }
    'Simple helpers'() {
        this.registerHelper('testing', ([id]) => id);
        this.render('<div>{{testing title}}</div>', { title: 'hello' });
        this.assertHTML('<div>hello</div>');
        this.assertStableRerender();
    }
    'Constant negative numbers can render'() {
        this.registerHelper('testing', ([id]) => id);
        this.render('<div>{{testing -123321}}</div>');
        this.assertHTML('<div>-123321</div>');
        this.assertStableRerender();
    }
    'Large numeric literals (Number.MAX_SAFE_INTEGER)'() {
        this.registerHelper('testing', ([id]) => id);
        this.render('<div>{{testing 9007199254740991}}</div>');
        this.assertHTML('<div>9007199254740991</div>');
        this.assertStableRerender();
    }
    'Constant float numbers can render'() {
        this.registerHelper('testing', ([id]) => id);
        this.render('<div>{{testing 0.123}}</div>');
        this.assertHTML('<div>0.123</div>');
        this.assertStableRerender();
    }
    'GH#13999 The compiler can handle simple helpers with inline null parameter'() {
        let value;
        this.registerHelper('say-hello', function (params) {
            value = params[0];
            return 'hello';
        });
        this.render('<div>{{say-hello null}}</div>');
        this.assertHTML('<div>hello</div>');
        this.assert.strictEqual(value, null, 'is null');
        this.assertStableRerender();
    }
    'GH#13999 The compiler can handle simple helpers with inline string literal null parameter'() {
        let value;
        this.registerHelper('say-hello', function (params) {
            value = params[0];
            return 'hello';
        });
        this.render('<div>{{say-hello "null"}}</div>');
        this.assertHTML('<div>hello</div>');
        this.assert.strictEqual(value, 'null', 'is null string literal');
        this.assertStableRerender();
    }
    'GH#13999 The compiler can handle simple helpers with inline undefined parameter'() {
        let value = 'PLACEHOLDER';
        let length;
        this.registerHelper('say-hello', function (params) {
            length = params.length;
            value = params[0];
            return 'hello';
        });
        this.render('<div>{{say-hello undefined}}</div>');
        this.assertHTML('<div>hello</div>');
        this.assert.strictEqual(length, 1);
        this.assert.strictEqual(value, undefined, 'is undefined');
        this.assertStableRerender();
    }
    'GH#13999 The compiler can handle simple helpers with positional parameter undefined string literal'() {
        let value = 'PLACEHOLDER';
        let length;
        this.registerHelper('say-hello', function (params) {
            length = params.length;
            value = params[0];
            return 'hello';
        });
        this.render('<div>{{say-hello "undefined"}} undefined</div>');
        this.assertHTML('<div>hello undefined</div>');
        this.assert.strictEqual(length, 1);
        this.assert.strictEqual(value, 'undefined', 'is undefined string literal');
        this.assertStableRerender();
    }
    'GH#13999 The compiler can handle components with undefined named arguments'() {
        let value = 'PLACEHOLDER';
        this.registerHelper('say-hello', function (_, hash) {
            value = hash['foo'];
            return 'hello';
        });
        this.render('<div>{{say-hello foo=undefined}}</div>');
        this.assertHTML('<div>hello</div>');
        this.assert.strictEqual(value, undefined, 'is undefined');
        this.assertStableRerender();
    }
    'GH#13999 The compiler can handle components with undefined string literal named arguments'() {
        let value = 'PLACEHOLDER';
        this.registerHelper('say-hello', function (_, hash) {
            value = hash['foo'];
            return 'hello';
        });
        this.render('<div>{{say-hello foo="undefined"}}</div>');
        this.assertHTML('<div>hello</div>');
        this.assert.strictEqual(value, 'undefined', 'is undefined string literal');
        this.assertStableRerender();
    }
    'GH#13999 The compiler can handle components with null named arguments'() {
        let value;
        this.registerHelper('say-hello', function (_, hash) {
            value = hash['foo'];
            return 'hello';
        });
        this.render('<div>{{say-hello foo=null}}</div>');
        this.assertHTML('<div>hello</div>');
        this.assert.strictEqual(value, null, 'is null');
        this.assertStableRerender();
    }
    'GH#13999 The compiler can handle components with null string literal named arguments'() {
        let value;
        this.registerHelper('say-hello', function (_, hash) {
            value = hash['foo'];
            return 'hello';
        });
        this.render('<div>{{say-hello foo="null"}}</div>');
        this.assertHTML('<div>hello</div>');
        this.assert.strictEqual(value, 'null', 'is null string literal');
        this.assertStableRerender();
    }
    'Null curly in attributes'() {
        this.render('<div class="foo {{null}}">hello</div>');
        this.assertHTML('<div class="foo ">hello</div>');
        this.assertStableRerender();
    }
    'Null in primitive syntax'() {
        this.render('{{#if null}}NOPE{{else}}YUP{{/if}}');
        this.assertHTML('YUP');
        this.assertStableRerender();
    }
    'Sexpr helpers'() {
        this.registerHelper('testing', function (params) {
            return params[0] + '!';
        });
        this.render('<div>{{testing (testing "hello")}}</div>');
        this.assertHTML('<div>hello!!</div>');
        this.assertStableRerender();
    }
    'The compiler can handle multiple invocations of sexprs'() {
        this.registerHelper('testing', function (params) {
            return '' + params[0] + params[1];
        });
        this.render('<div>{{testing (testing "hello" foo) (testing (testing bar "lol") baz)}}</div>', {
            foo: 'FOO',
            bar: 'BAR',
            baz: 'BAZ',
        });
        this.assertHTML('<div>helloFOOBARlolBAZ</div>');
        this.assertStableRerender();
    }
    'The compiler passes along the hash arguments'() {
        this.registerHelper('testing', function (_, hash) {
            return hash['first'] + '-' + hash['second'];
        });
        this.render('<div>{{testing first="one" second="two"}}</div>');
        this.assertHTML('<div>one-two</div>');
        this.assertStableRerender();
    }
    'Attributes can be populated with helpers that generate a string'() {
        this.registerHelper('testing', function (params) {
            return params[0];
        });
        this.render('<a href="{{testing url}}">linky</a>', { url: 'linky.html' });
        this.assertHTML('<a href="linky.html">linky</a>');
        this.assertStableRerender();
    }
    'Attribute helpers take a hash'() {
        this.registerHelper('testing', function (_, hash) {
            return hash['path'];
        });
        this.render('<a href="{{testing path=url}}">linky</a>', { url: 'linky.html' });
        this.assertHTML('<a href="linky.html">linky</a>');
        this.assertStableRerender();
    }
    'Attributes containing multiple helpers are treated like a block'() {
        this.registerHelper('testing', function (params) {
            return params[0];
        });
        this.render('<a href="http://{{foo}}/{{testing bar}}/{{testing "baz"}}">linky</a>', {
            foo: 'foo.com',
            bar: 'bar',
        });
        this.assertHTML('<a href="http://foo.com/bar/baz">linky</a>');
        this.assertStableRerender();
    }
    'Elements inside a yielded block'() {
        this.render('{{#identity}}<div id="test">123</div>{{/identity}}');
        this.assertHTML('<div id="test">123</div>');
        this.assertStableRerender();
    }
    'A simple block helper can return text'() {
        this.render('{{#identity}}test{{else}}not shown{{/identity}}');
        this.assertHTML('test');
        this.assertStableRerender();
    }
    'A block helper can have an else block'() {
        this.render('{{#render-else}}Nope{{else}}<div id="test">123</div>{{/render-else}}');
        this.assertHTML('<div id="test">123</div>');
        this.assertStableRerender();
    }
}
InitialRenderSuite.suiteName = 'initial render';
__decorate([
    test
], InitialRenderSuite.prototype, "HTML text content", null);
__decorate([
    test
], InitialRenderSuite.prototype, "HTML tags", null);
__decorate([
    test
], InitialRenderSuite.prototype, "HTML attributes", null);
__decorate([
    test
], InitialRenderSuite.prototype, "HTML data attributes", null);
__decorate([
    test
], InitialRenderSuite.prototype, "HTML checked attributes", null);
__decorate([
    test
], InitialRenderSuite.prototype, "HTML selected options", null);
__decorate([
    test
], InitialRenderSuite.prototype, "HTML multi-select options", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Void Elements", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Nested HTML", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Custom Elements", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Nested Custom Elements", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Moar nested Custom Elements", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Custom Elements with dynamic attributes", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Custom Elements with dynamic content", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Dynamic content within single custom element", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Supports quotes", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Supports backslashes", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Supports new lines", null);
__decorate([
    test
], InitialRenderSuite.prototype, "HTML tag with empty attribute", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Attributes containing a helper are treated like a block", null);
__decorate([
    test
], InitialRenderSuite.prototype, "HTML boolean attribute 'disabled'", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Quoted attribute null values do not disable", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Unquoted attribute null values do not disable", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Quoted attribute string values", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Unquoted attribute string values", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Unquoted img src attribute is not rendered when set to `null`", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Unquoted img src attribute is not rendered when set to `undefined`", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Unquoted a href attribute is not rendered when set to `null`", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Unquoted a href attribute is not rendered when set to `undefined`", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Attribute expression can be followed by another attribute", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Dynamic selected options", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Dynamic multi-select", null);
__decorate([
    test
], InitialRenderSuite.prototype, "HTML comments", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Curlies in HTML comments", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Complex Curlies in HTML comments", null);
__decorate([
    test
], InitialRenderSuite.prototype, "HTML comments with multi-line mustaches", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Top level comments", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Handlebars comments", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Namespaced attribute", null);
__decorate([
    test
], InitialRenderSuite.prototype, "<svg> tag with case-sensitive attribute", null);
__decorate([
    test
], InitialRenderSuite.prototype, "nested element in the SVG namespace", null);
__decorate([
    test
], InitialRenderSuite.prototype, "<foreignObject> tag has an SVG namespace", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Namespaced and non-namespaced elements as siblings", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Namespaced and non-namespaced elements with nesting", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Case-sensitive tag has capitalization preserved", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Text curlies", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Repaired text nodes are ensured in the right place Part 1", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Repaired text nodes are ensured in the right place Part 2", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Repaired text nodes are ensured in the right place Part 3", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Path expressions", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Text curlies perform escaping", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Rerender respects whitespace", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Safe HTML curlies", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Triple curlies", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Triple curlie helpers", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Top level triple curlies", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Top level unescaped tr", null);
__decorate([
    test
], InitialRenderSuite.prototype, "The compiler can handle top-level unescaped td inside tr contextualElement", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Extreme nesting", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Simple blocks", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Nested blocks", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Loops", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Simple helpers", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Constant negative numbers can render", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Large numeric literals (Number.MAX_SAFE_INTEGER)", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Constant float numbers can render", null);
__decorate([
    test
], InitialRenderSuite.prototype, "GH#13999 The compiler can handle simple helpers with inline null parameter", null);
__decorate([
    test
], InitialRenderSuite.prototype, "GH#13999 The compiler can handle simple helpers with inline string literal null parameter", null);
__decorate([
    test
], InitialRenderSuite.prototype, "GH#13999 The compiler can handle simple helpers with inline undefined parameter", null);
__decorate([
    test
], InitialRenderSuite.prototype, "GH#13999 The compiler can handle simple helpers with positional parameter undefined string literal", null);
__decorate([
    test
], InitialRenderSuite.prototype, "GH#13999 The compiler can handle components with undefined named arguments", null);
__decorate([
    test
], InitialRenderSuite.prototype, "GH#13999 The compiler can handle components with undefined string literal named arguments", null);
__decorate([
    test
], InitialRenderSuite.prototype, "GH#13999 The compiler can handle components with null named arguments", null);
__decorate([
    test
], InitialRenderSuite.prototype, "GH#13999 The compiler can handle components with null string literal named arguments", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Null curly in attributes", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Null in primitive syntax", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Sexpr helpers", null);
__decorate([
    test
], InitialRenderSuite.prototype, "The compiler can handle multiple invocations of sexprs", null);
__decorate([
    test
], InitialRenderSuite.prototype, "The compiler passes along the hash arguments", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Attributes can be populated with helpers that generate a string", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Attribute helpers take a hash", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Attributes containing multiple helpers are treated like a block", null);
__decorate([
    test
], InitialRenderSuite.prototype, "Elements inside a yielded block", null);
__decorate([
    test
], InitialRenderSuite.prototype, "A simple block helper can return text", null);
__decorate([
    test
], InitialRenderSuite.prototype, "A block helper can have an else block", null);
const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdGlhbC1yZW5kZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvc3VpdGVzL2luaXRpYWwtcmVuZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUNBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUM1QyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDekMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDOUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLG9CQUFvQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDOUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFdEQsTUFBTSxPQUFPLGtCQUFtQixTQUFRLFVBQVU7SUFBbEQ7O1FBR0UsU0FBSSxHQUFHLE1BQU0sQ0FBQztJQW1zQ2hCLENBQUM7SUFqc0NDLG1CQUFtQjtRQUNqQixJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDM0IsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUdELFdBQVc7UUFDVCxJQUFJLENBQUMsTUFBTSxDQUFDLG1DQUFtQyxDQUFDLENBQUM7UUFDakQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1FBQ3JELElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFHRCxpQkFBaUI7UUFDZixJQUFJLENBQUMsTUFBTSxDQUFDLHlDQUF5QyxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLFVBQVUsQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO1FBQzNELElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFHRCxzQkFBc0I7UUFDcEIsSUFBSSxDQUFD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R0Q7SUFEQyxJQUFJO2tFQU1KO0FBR0Q7SUFEQyxJQUFJO2dFQU1KO0FBR0Q7SUFEQyxJQUFJO29IQUtKO0FBR0Q7SUFEQyxJQUFJO3lEQW1CSjtBQUdEO0lBREMsSUFBSTt1REFvQko7QUFHRDtJQURDLElBQUk7dURBMkJKO0FBR0Q7SUFEQyxJQUFJOytDQTRCSjtBQUdEO0lBREMsSUFBSTt3REFNSjtBQUdEO0lBREMsSUFBSTs4RUFNSjtBQUdEO0lBREMsSUFBSTswRkFNSjtBQUdEO0lBREMsSUFBSTsyRUFNSjtBQUdEO0lBREMsSUFBSTtvSEFXSjtBQUdEO0lBREMsSUFBSTttSUFZSjtBQUdEO0lBREMsSUFBSTt5SEFlSjtBQUdEO0lBREMsSUFBSTs0SUFlSjtBQUdEO0lBREMsSUFBSTtvSEFZSjtBQUdEO0lBREMsSUFBSTttSUFZSjtBQUdEO0lBREMsSUFBSTsrR0FZSjtBQUdEO0lBREMsSUFBSTs4SEFZSjtBQUdEO0lBREMsSUFBSTtrRUFLSjtBQUdEO0lBREMsSUFBSTtrRUFLSjtBQUdEO0lBREMsSUFBSTt1REFTSjtBQUdEO0lBREMsSUFBSTtnR0FhSjtBQUdEO0lBREMsSUFBSTtzRkFTSjtBQUdEO0lBREMsSUFBSTt5R0FTSjtBQUdEO0lBREMsSUFBSTt1RUFTSjtBQUdEO0lBREMsSUFBSTt5R0FZSjtBQUdEO0lBREMsSUFBSTt5RUFLSjtBQUdEO0lBREMsSUFBSTsrRUFLSjtBQUdEO0lBREMsSUFBSTsrRUFLSjtBQUdILE1BQU0sZUFBZSxHQUFHLDhCQUE4QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTmFtZXNwYWNlLCBTaW1wbGVFbGVtZW50IH0gZnJvbSAnQHNpbXBsZS1kb20vaW50ZXJmYWNlJztcbmltcG9ydCB7IFJlbmRlclRlc3QgfSBmcm9tICcuLi9yZW5kZXItdGVzdCc7XG5pbXBvcnQgeyB0ZXN0IH0gZnJvbSAnLi4vdGVzdC1kZWNvcmF0b3InO1xuaW1wb3J0IHsgc3RyaXAsIHVud3JhcCB9IGZyb20gJ0BnbGltbWVyL3V0aWwnO1xuaW1wb3J0IHsgZmlyc3RFbGVtZW50Q2hpbGQsIGdldEVsZW1lbnRzQnlUYWdOYW1lIH0gZnJvbSAnLi4vZG9tL3NpbXBsZS11dGlscyc7XG5pbXBvcnQgeyBhc3NlcnROb2RlVGFnTmFtZSB9IGZyb20gJy4uL2RvbS9hc3NlcnRpb25zJztcblxuZXhwb3J0IGNsYXNzIEluaXRpYWxSZW5kZXJTdWl0ZSBleHRlbmRzIFJlbmRlclRlc3Qge1xuICBzdGF0aWMgc3VpdGVOYW1lID0gJ2luaXRpYWwgcmVuZGVyJztcblxuICBuYW1lID0gJ0JBU0UnO1xuICBAdGVzdFxuICAnSFRNTCB0ZXh0IGNvbnRlbnQnKCkge1xuICAgIHRoaXMucmVuZGVyKCdjb250ZW50Jyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCdjb250ZW50Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ0hUTUwgdGFncycoKSB7XG4gICAgdGhpcy5yZW5kZXIoJzxoMT5oZWxsbyE8L2gxPjxkaXY+Y29udGVudDwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGgxPmhlbGxvITwvaDE+PGRpdj5jb250ZW50PC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ0hUTUwgYXR0cmlidXRlcycoKSB7XG4gICAgdGhpcy5yZW5kZXIoXCI8ZGl2IGNsYXNzPSdmb28nIGlkPSdiYXInPmNvbnRlbnQ8L2Rpdj5cIik7XG4gICAgdGhpcy5hc3NlcnRIVE1MKFwiPGRpdiBjbGFzcz0nZm9vJyBpZD0nYmFyJz5jb250ZW50PC9kaXY+XCIpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdIVE1MIGRhdGEgYXR0cmlidXRlcycoKSB7XG4gICAgdGhpcy5yZW5kZXIoXCI8ZGl2IGRhdGEtc29tZS1kYXRhPSdmb28nPmNvbnRlbnQ8L2Rpdj5cIik7XG4gICAgdGhpcy5hc3NlcnRIVE1MKFwiPGRpdiBkYXRhLXNvbWUtZGF0YT0nZm9vJz5jb250ZW50PC9kaXY+XCIpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdIVE1MIGNoZWNrZWQgYXR0cmlidXRlcycoKSB7XG4gICAgdGhpcy5yZW5kZXIoXCI8aW5wdXQgY2hlY2tlZD0nY2hlY2tlZCc+XCIpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTChgPGlucHV0IGNoZWNrZWQ9J2NoZWNrZWQnPmApO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdIVE1MIHNlbGVjdGVkIG9wdGlvbnMnKCkge1xuICAgIHRoaXMucmVuZGVyKHN0cmlwYFxuICAgICAgPHNlbGVjdD5cbiAgICAgICAgPG9wdGlvbj4xPC9vcHRpb24+XG4gICAgICAgIDxvcHRpb24gc2VsZWN0ZWQ+Mjwvb3B0aW9uPlxuICAgICAgICA8b3B0aW9uPjM8L29wdGlvbj5cbiAgICAgIDwvc2VsZWN0PlxuICAgIGApO1xuICAgIHRoaXMuYXNzZXJ0SFRNTChzdHJpcGBcbiAgICAgIDxzZWxlY3Q+XG4gICAgICAgIDxvcHRpb24+MTwvb3B0aW9uPlxuICAgICAgICA8b3B0aW9uIHNlbGVjdGVkPjI8L29wdGlvbj5cbiAgICAgICAgPG9wdGlvbj4zPC9vcHRpb24+XG4gICAgICA8L3NlbGVjdD5cbiAgICBgKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAnSFRNTCBtdWx0aS1zZWxlY3Qgb3B0aW9ucycoKSB7XG4gICAgdGhpcy5yZW5kZXIoc3RyaXBgXG4gICAgICA8c2VsZWN0IG11bHRpcGxlPlxuICAgICAgICA8b3B0aW9uPjE8L29wdGlvbj5cbiAgICAgICAgPG9wdGlvbiBzZWxlY3RlZD4yPC9vcHRpb24+XG4gICAgICAgIDxvcHRpb24gc2VsZWN0ZWQ+Mzwvb3B0aW9uPlxuICAgICAgPC9zZWxlY3Q+XG4gICAgYCk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKHN0cmlwYFxuICAgICAgPHNlbGVjdCBtdWx0aXBsZT5cbiAgICAgICAgPG9wdGlvbj4xPC9vcHRpb24+XG4gICAgICAgIDxvcHRpb24gc2VsZWN0ZWQ+Mjwvb3B0aW9uPlxuICAgICAgICA8b3B0aW9uIHNlbGVjdGVkPjM8L29wdGlvbj5cbiAgICAgIDwvc2VsZWN0PlxuICAgIGApO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdWb2lkIEVsZW1lbnRzJygpIHtcbiAgICBsZXQgdm9pZEVsZW1lbnRzID0gJ2FyZWEgYmFzZSBiciBlbWJlZCBociBpbWcgaW5wdXQga2V5Z2VuIGxpbmsgbWV0YSBwYXJhbSBzb3VyY2UgdHJhY2sgd2JyJztcbiAgICB2b2lkRWxlbWVudHMuc3BsaXQoJyAnKS5mb3JFYWNoKHRhZ05hbWUgPT4gdGhpcy5zaG91bGRCZVZvaWQodGFnTmFtZSkpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ05lc3RlZCBIVE1MJygpIHtcbiAgICB0aGlzLnJlbmRlcihcbiAgICAgIFwiPGRpdiBjbGFzcz0nZm9vJz48cD48c3BhbiBpZD0nYmFyJyBkYXRhLWZvbz0nYmFyJz5oaSE8L3NwYW4+PC9wPjwvZGl2PiZuYnNwO01vcmUgY29udGVudFwiXG4gICAgKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoXG4gICAgICBcIjxkaXYgY2xhc3M9J2Zvbyc+PHA+PHNwYW4gaWQ9J2JhcicgZGF0YS1mb289J2Jhcic+aGkhPC9zcGFuPjwvcD48L2Rpdj4mbmJzcDtNb3JlIGNvbnRlbnRcIlxuICAgICk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ0N1c3RvbSBFbGVtZW50cycoKSB7XG4gICAgdGhpcy5yZW5kZXIoJzx1c2UtdGhlLXBsYXRmb3JtPjwvdXNlLXRoZS1wbGF0Zm9ybT4nKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzx1c2UtdGhlLXBsYXRmb3JtPjwvdXNlLXRoZS1wbGF0Zm9ybT4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAnTmVzdGVkIEN1c3RvbSBFbGVtZW50cycoKSB7XG4gICAgdGhpcy5yZW5kZXIoXG4gICAgICBcIjx1c2UtdGhlLXBsYXRmb3JtPjxzZXJpb3VzbHktcGxlYXNlIGRhdGEtZm9vPScxJz5TdHVmZiA8ZGl2PkhlcmU8L2Rpdj48L3NlcmlvdXNseS1wbGVhc2U+PC91c2UtdGhlLXBsYXRmb3JtPlwiXG4gICAgKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoXG4gICAgICBcIjx1c2UtdGhlLXBsYXRmb3JtPjxzZXJpb3VzbHktcGxlYXNlIGRhdGEtZm9vPScxJz5TdHVmZiA8ZGl2PkhlcmU8L2Rpdj48L3NlcmlvdXNseS1wbGVhc2U+PC91c2UtdGhlLXBsYXRmb3JtPlwiXG4gICAgKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAnTW9hciBuZXN0ZWQgQ3VzdG9tIEVsZW1lbnRzJygpIHtcbiAgICB0aGlzLnJlbmRlcihcbiAgICAgIFwiPHVzZS10aGUtcGxhdGZvcm0+PHNlcmlvdXNseS1wbGVhc2UgZGF0YS1mb289JzEnPjx3aGVyZXMtdGhlLXBsYXRmb3JtPkhlcmU8L3doZXJlcy10aGUtcGxhdGZvcm0+PC9zZXJpb3VzbHktcGxlYXNlPjwvdXNlLXRoZS1wbGF0Zm9ybT5cIlxuICAgICk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKFxuICAgICAgXCI8dXNlLXRoZS1wbGF0Zm9ybT48c2VyaW91c2x5LXBsZWFzZSBkYXRhLWZvbz0nMSc+PHdoZXJlcy10aGUtcGxhdGZvcm0+SGVyZTwvd2hlcmVzLXRoZS1wbGF0Zm9ybT48L3NlcmlvdXNseS1wbGVhc2U+PC91c2UtdGhlLXBsYXRmb3JtPlwiXG4gICAgKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAnQ3VzdG9tIEVsZW1lbnRzIHdpdGggZHluYW1pYyBhdHRyaWJ1dGVzJygpIHtcbiAgICB0aGlzLnJlbmRlcihcbiAgICAgIFwiPGZha2UtdGhpbmc+PG90aGVyLWZha2UtdGhpbmcgZGF0YS1zcmM9J2V4dHJhLXt7c29tZUR5bmFtaWNCaXRzfX0taGVyZScgLz48L2Zha2UtdGhpbmc+XCIsXG4gICAgICB7IHNvbWVEeW5hbWljQml0czogJ3RoaW5ncycgfVxuICAgICk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKFwiPGZha2UtdGhpbmc+PG90aGVyLWZha2UtdGhpbmcgZGF0YS1zcmM9J2V4dHJhLXRoaW5ncy1oZXJlJyAvPjwvZmFrZS10aGluZz5cIik7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ0N1c3RvbSBFbGVtZW50cyB3aXRoIGR5bmFtaWMgY29udGVudCcoKSB7XG4gICAgdGhpcy5yZW5kZXIoJzx4LWZvbz48eC1iYXI+e3tkZXJwfX08L3gtYmFyPjwveC1mb28+JywgeyBkZXJwOiAnc3R1ZmYnIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPHgtZm9vPjx4LWJhcj5zdHVmZjwveC1iYXI+PC94LWZvbz4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAnRHluYW1pYyBjb250ZW50IHdpdGhpbiBzaW5nbGUgY3VzdG9tIGVsZW1lbnQnKCkge1xuICAgIHRoaXMucmVuZGVyKCc8eC1mb28+e3sjaWYgZGVycH19Q29udGVudCBIZXJle3svaWZ9fTwveC1mb28+JywgeyBkZXJwOiAnc3R1ZmYnIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPHgtZm9vPkNvbnRlbnQgSGVyZTwveC1mb28+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGRlcnA6IGZhbHNlIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPHgtZm9vPjwhLS0tLT48L3gtZm9vPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBkZXJwOiB0cnVlIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPHgtZm9vPkNvbnRlbnQgSGVyZTwveC1mb28+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGRlcnA6ICdzdHVmZicgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8eC1mb28+Q29udGVudCBIZXJlPC94LWZvbz4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAnU3VwcG9ydHMgcXVvdGVzJygpIHtcbiAgICB0aGlzLnJlbmRlcignPGRpdj5cIlRoaXMgaXMgYSB0aXRsZSxcIiB3ZVxcJ3JlIG9uIGEgYm9hdDwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGRpdj5cIlRoaXMgaXMgYSB0aXRsZSxcIiB3ZVxcJ3JlIG9uIGEgYm9hdDwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdTdXBwb3J0cyBiYWNrc2xhc2hlcycoKSB7XG4gICAgdGhpcy5yZW5kZXIoJzxkaXY+VGhpcyBpcyBhIGJhY2tzbGFzaDogXFxcXDwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGRpdj5UaGlzIGlzIGEgYmFja3NsYXNoOiBcXFxcPC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ1N1cHBvcnRzIG5ldyBsaW5lcycoKSB7XG4gICAgdGhpcy5yZW5kZXIoJzxkaXY+Y29tbW9uXFxuXFxuYnJvPC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8ZGl2PmNvbW1vblxcblxcbmJybzwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdIVE1MIHRhZyB3aXRoIGVtcHR5IGF0dHJpYnV0ZScoKSB7XG4gICAgdGhpcy5yZW5kZXIoXCI8ZGl2IGNsYXNzPScnPmNvbnRlbnQ8L2Rpdj5cIik7XG4gICAgdGhpcy5hc3NlcnRIVE1MKFwiPGRpdiBjbGFzcz0nJz5jb250ZW50PC9kaXY+XCIpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdBdHRyaWJ1dGVzIGNvbnRhaW5pbmcgYSBoZWxwZXIgYXJlIHRyZWF0ZWQgbGlrZSBhIGJsb2NrJygpIHtcbiAgICB0aGlzLnJlZ2lzdGVySGVscGVyKCd0ZXN0aW5nJywgcGFyYW1zID0+IHtcbiAgICAgIHRoaXMuYXNzZXJ0LmRlZXBFcXVhbChwYXJhbXMsIFsxMjNdKTtcbiAgICAgIHJldHVybiAnZXhhbXBsZS5jb20nO1xuICAgIH0pO1xuXG4gICAgdGhpcy5yZW5kZXIoJzxhIGhyZWY9XCJodHRwOi8ve3t0ZXN0aW5nIDEyM319L2luZGV4Lmh0bWxcIj5saW5reTwvYT4nKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxhIGhyZWY9XCJodHRwOi8vZXhhbXBsZS5jb20vaW5kZXguaHRtbFwiPmxpbmt5PC9hPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gIFwiSFRNTCBib29sZWFuIGF0dHJpYnV0ZSAnZGlzYWJsZWQnXCIoKSB7XG4gICAgdGhpcy5yZW5kZXIoJzxpbnB1dCBkaXNhYmxlZD4nKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxpbnB1dCBkaXNhYmxlZD4nKTtcblxuICAgIC8vIFRPRE86IFdoYXQgaXMgdGhlIHBvaW50IG9mIHRoaXMgdGVzdD8gKE5vdGUgdGhhdCBpdCB3b3VsZG4ndCB3b3JrIHdpdGggU2ltcGxlRE9NKVxuICAgIC8vIGFzc2VydE5vZGVQcm9wZXJ0eShyb290LmZpcnN0Q2hpbGQsICdpbnB1dCcsICdkaXNhYmxlZCcsIHRydWUpO1xuXG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ1F1b3RlZCBhdHRyaWJ1dGUgbnVsbCB2YWx1ZXMgZG8gbm90IGRpc2FibGUnKCkge1xuICAgIHRoaXMucmVuZGVyKCc8aW5wdXQgZGlzYWJsZWQ9XCJ7e2lzRGlzYWJsZWR9fVwiPicsIHsgaXNEaXNhYmxlZDogbnVsbCB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxpbnB1dD4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG5cbiAgICAvLyBUT0RPOiBXaGF0IGlzIHRoZSBwb2ludCBvZiB0aGlzIHRlc3Q/IChOb3RlIHRoYXQgaXQgd291bGRuJ3Qgd29yayB3aXRoIFNpbXBsZURPTSlcbiAgICAvLyBhc3NlcnROb2RlUHJvcGVydHkocm9vdC5maXJzdENoaWxkLCAnaW5wdXQnLCAnZGlzYWJsZWQnLCBmYWxzZSk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgaXNEaXNhYmxlZDogdHJ1ZSB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxpbnB1dCBkaXNhYmxlZD4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG5cbiAgICAvLyBUT0RPOiA/Pz8/Pz8/Pz8/XG4gICAgdGhpcy5yZXJlbmRlcih7IGlzRGlzYWJsZWQ6IGZhbHNlIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGlucHV0IGRpc2FibGVkPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBpc0Rpc2FibGVkOiBudWxsIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGlucHV0PicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdVbnF1b3RlZCBhdHRyaWJ1dGUgbnVsbCB2YWx1ZXMgZG8gbm90IGRpc2FibGUnKCkge1xuICAgIHRoaXMucmVuZGVyKCc8aW5wdXQgZGlzYWJsZWQ9e3tpc0Rpc2FibGVkfX0+JywgeyBpc0Rpc2FibGVkOiBudWxsIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGlucHV0PicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIC8vIFRPRE86IFdoYXQgaXMgdGhlIHBvaW50IG9mIHRoaXMgdGVzdD8gKE5vdGUgdGhhdCBpdCB3b3VsZG4ndCB3b3JrIHdpdGggU2ltcGxlRE9NKVxuICAgIC8vIGFzc2VydE5vZGVQcm9wZXJ0eShyb290LmZpcnN0Q2hpbGQsICdpbnB1dCcsICdkaXNhYmxlZCcsIGZhbHNlKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBpc0Rpc2FibGVkOiB0cnVlIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGlucHV0IGRpc2FibGVkPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBpc0Rpc2FibGVkOiBmYWxzZSB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxpbnB1dD4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgaXNEaXNhYmxlZDogbnVsbCB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxpbnB1dD4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAnUXVvdGVkIGF0dHJpYnV0ZSBzdHJpbmcgdmFsdWVzJygpIHtcbiAgICB0aGlzLnJlbmRlcihcIjxpbWcgc3JjPSd7e3NyY319Jz5cIiwgeyBzcmM6ICdpbWFnZS5wbmcnIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTChcIjxpbWcgc3JjPSdpbWFnZS5wbmcnPlwiKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgc3JjOiAnbmV3aW1hZ2UucG5nJyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoXCI8aW1nIHNyYz0nbmV3aW1hZ2UucG5nJz5cIik7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IHNyYzogJycgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKFwiPGltZyBzcmM9Jyc+XCIpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBzcmM6ICdpbWFnZS5wbmcnIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTChcIjxpbWcgc3JjPSdpbWFnZS5wbmcnPlwiKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG4gIH1cblxuICBAdGVzdFxuICAnVW5xdW90ZWQgYXR0cmlidXRlIHN0cmluZyB2YWx1ZXMnKCkge1xuICAgIHRoaXMucmVuZGVyKCc8aW1nIHNyYz17e3NyY319PicsIHsgc3JjOiAnaW1hZ2UucG5nJyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoXCI8aW1nIHNyYz0naW1hZ2UucG5nJz5cIik7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IHNyYzogJ25ld2ltYWdlLnBuZycgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKFwiPGltZyBzcmM9J25ld2ltYWdlLnBuZyc+XCIpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBzcmM6ICcnIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTChcIjxpbWcgc3JjPScnPlwiKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgc3JjOiAnaW1hZ2UucG5nJyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoXCI8aW1nIHNyYz0naW1hZ2UucG5nJz5cIik7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ1VucXVvdGVkIGltZyBzcmMgYXR0cmlidXRlIGlzIG5vdCByZW5kZXJlZCB3aGVuIHNldCB0byBgbnVsbGAnKCkge1xuICAgIHRoaXMucmVuZGVyKFwiPGltZyBzcmM9J3t7c3JjfX0nPlwiLCB7IHNyYzogbnVsbCB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxpbWc+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IHNyYzogJ25ld2ltYWdlLnBuZycgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKFwiPGltZyBzcmM9J25ld2ltYWdlLnBuZyc+XCIpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBzcmM6ICcnIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTChcIjxpbWcgc3JjPScnPlwiKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgc3JjOiBudWxsIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGltZz4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG4gIH1cblxuICBAdGVzdFxuICAnVW5xdW90ZWQgaW1nIHNyYyBhdHRyaWJ1dGUgaXMgbm90IHJlbmRlcmVkIHdoZW4gc2V0IHRvIGB1bmRlZmluZWRgJygpIHtcbiAgICB0aGlzLnJlbmRlcihcIjxpbWcgc3JjPSd7e3NyY319Jz5cIiwgeyBzcmM6IHVuZGVmaW5lZCB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxpbWc+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IHNyYzogJ25ld2ltYWdlLnBuZycgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKFwiPGltZyBzcmM9J25ld2ltYWdlLnBuZyc+XCIpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBzcmM6ICcnIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTChcIjxpbWcgc3JjPScnPlwiKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgc3JjOiB1bmRlZmluZWQgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8aW1nPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdVbnF1b3RlZCBhIGhyZWYgYXR0cmlidXRlIGlzIG5vdCByZW5kZXJlZCB3aGVuIHNldCB0byBgbnVsbGAnKCkge1xuICAgIHRoaXMucmVuZGVyKCc8YSBocmVmPXt7aHJlZn19PjwvYT4nLCB7IGhyZWY6IG51bGwgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8YT48L2E+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGhyZWY6ICdodHRwOi8vZXhhbXBsZS5jb20nIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTChcIjxhIGhyZWY9J2h0dHA6Ly9leGFtcGxlLmNvbSc+PC9hPlwiKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgaHJlZjogJycgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKFwiPGEgaHJlZj0nJz48L2E+XCIpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBocmVmOiBudWxsIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGE+PC9hPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdVbnF1b3RlZCBhIGhyZWYgYXR0cmlidXRlIGlzIG5vdCByZW5kZXJlZCB3aGVuIHNldCB0byBgdW5kZWZpbmVkYCcoKSB7XG4gICAgdGhpcy5yZW5kZXIoJzxhIGhyZWY9e3tocmVmfX0+PC9hPicsIHsgaHJlZjogdW5kZWZpbmVkIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGE+PC9hPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBocmVmOiAnaHR0cDovL2V4YW1wbGUuY29tJyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoXCI8YSBocmVmPSdodHRwOi8vZXhhbXBsZS5jb20nPjwvYT5cIik7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGhyZWY6ICcnIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTChcIjxhIGhyZWY9Jyc+PC9hPlwiKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgaHJlZjogdW5kZWZpbmVkIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGE+PC9hPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdBdHRyaWJ1dGUgZXhwcmVzc2lvbiBjYW4gYmUgZm9sbG93ZWQgYnkgYW5vdGhlciBhdHRyaWJ1dGUnKCkge1xuICAgIHRoaXMucmVuZGVyKFwiPGRpdiBmb289J3t7ZnVuc3R1ZmZ9fScgbmFtZT0nQWxpY2UnPjwvZGl2PlwiLCB7IGZ1bnN0dWZmOiAnb2ggbXknIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTChcIjxkaXYgbmFtZT0nQWxpY2UnIGZvbz0nb2ggbXknPjwvZGl2PlwiKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgZnVuc3R1ZmY6ICdvaCBib3knIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTChcIjxkaXYgbmFtZT0nQWxpY2UnIGZvbz0nb2ggYm95Jz48L2Rpdj5cIik7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGZ1bnN0dWZmOiAnJyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoXCI8ZGl2IG5hbWU9J0FsaWNlJyBmb289Jyc+PC9kaXY+XCIpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBmdW5zdHVmZjogJ29oIG15JyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoXCI8ZGl2IG5hbWU9J0FsaWNlJyBmb289J29oIG15Jz48L2Rpdj5cIik7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ0R5bmFtaWMgc2VsZWN0ZWQgb3B0aW9ucycoKSB7XG4gICAgdGhpcy5yZW5kZXIoXG4gICAgICBzdHJpcGBcbiAgICAgIDxzZWxlY3Q+XG4gICAgICAgIDxvcHRpb24+MTwvb3B0aW9uPlxuICAgICAgICA8b3B0aW9uIHNlbGVjdGVkPXt7c2VsZWN0ZWR9fT4yPC9vcHRpb24+XG4gICAgICAgIDxvcHRpb24+Mzwvb3B0aW9uPlxuICAgICAgPC9zZWxlY3Q+XG4gICAgYCxcbiAgICAgIHsgc2VsZWN0ZWQ6IHRydWUgfVxuICAgICk7XG5cbiAgICB0aGlzLmFzc2VydEhUTUwoc3RyaXBgXG4gICAgICA8c2VsZWN0PlxuICAgICAgICA8b3B0aW9uPjE8L29wdGlvbj5cbiAgICAgICAgPG9wdGlvbiAke3RoaXMubmFtZSA9PT0gJ3JlaHlkcmF0aW9uJyA/ICcgc2VsZWN0ZWQ9dHJ1ZScgOiAnJ30+Mjwvb3B0aW9uPlxuICAgICAgICA8b3B0aW9uPjM8L29wdGlvbj5cbiAgICAgIDwvc2VsZWN0PlxuICAgIGApO1xuXG4gICAgbGV0IHNlbGVjdE5vZGUgPSB1bndyYXAoZmlyc3RFbGVtZW50Q2hpbGQodGhpcy5lbGVtZW50KSkgYXMgSFRNTFNlbGVjdEVsZW1lbnQ7XG4gICAgdGhpcy5hc3NlcnQuZXF1YWwoc2VsZWN0Tm9kZS5zZWxlY3RlZEluZGV4LCAxKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgc2VsZWN0ZWQ6IGZhbHNlIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTChzdHJpcGBcbiAgICAgIDxzZWxlY3Q+XG4gICAgICAgIDxvcHRpb24+MTwvb3B0aW9uPlxuICAgICAgICA8b3B0aW9uICR7dGhpcy5uYW1lID09PSAncmVoeWRyYXRpb24nID8gJyBzZWxlY3RlZD10cnVlJyA6ICcnfT4yPC9vcHRpb24+XG4gICAgICAgIDxvcHRpb24+Mzwvb3B0aW9uPlxuICAgICAgPC9zZWxlY3Q+XG4gICAgYCk7XG5cbiAgICBzZWxlY3ROb2RlID0gdW53cmFwKGZpcnN0RWxlbWVudENoaWxkKHRoaXMuZWxlbWVudCkpIGFzIEhUTUxTZWxlY3RFbGVtZW50O1xuXG4gICAgdGhpcy5hc3NlcnQuZXF1YWwoc2VsZWN0Tm9kZS5zZWxlY3RlZEluZGV4LCAwKTtcblxuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBzZWxlY3RlZDogJycgfSk7XG5cbiAgICB0aGlzLmFzc2VydEhUTUwoc3RyaXBgXG4gICAgICA8c2VsZWN0PlxuICAgICAgICA8b3B0aW9uPjE8L29wdGlvbj5cbiAgICAgICAgPG9wdGlvbiAke3RoaXMubmFtZSA9PT0gJ3JlaHlkcmF0aW9uJyA/ICcgc2VsZWN0ZWQ9dHJ1ZScgOiAnJ30+Mjwvb3B0aW9uPlxuICAgICAgICA8b3B0aW9uPjM8L29wdGlvbj5cbiAgICAgIDwvc2VsZWN0PlxuICAgIGApO1xuXG4gICAgc2VsZWN0Tm9kZSA9IHVud3JhcChmaXJzdEVsZW1lbnRDaGlsZCh0aGlzLmVsZW1lbnQpKSBhcyBIVE1MU2VsZWN0RWxlbWVudDtcblxuICAgIHRoaXMuYXNzZXJ0LmVxdWFsKHNlbGVjdE5vZGUuc2VsZWN0ZWRJbmRleCwgMCk7XG5cbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgc2VsZWN0ZWQ6IHRydWUgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKHN0cmlwYFxuICAgICAgPHNlbGVjdD5cbiAgICAgICAgPG9wdGlvbj4xPC9vcHRpb24+XG4gICAgICAgIDxvcHRpb24gJHt0aGlzLm5hbWUgPT09ICdyZWh5ZHJhdGlvbicgPyAnIHNlbGVjdGVkPXRydWUnIDogJyd9PjI8L29wdGlvbj5cbiAgICAgICAgPG9wdGlvbj4zPC9vcHRpb24+XG4gICAgICA8L3NlbGVjdD5cbiAgICBgKTtcblxuICAgIHNlbGVjdE5vZGUgPSB1bndyYXAoZmlyc3RFbGVtZW50Q2hpbGQodGhpcy5lbGVtZW50KSkgYXMgSFRNTFNlbGVjdEVsZW1lbnQ7XG4gICAgdGhpcy5hc3NlcnQuZXF1YWwoc2VsZWN0Tm9kZS5zZWxlY3RlZEluZGV4LCAxKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG4gIH1cblxuICBAdGVzdFxuICAnRHluYW1pYyBtdWx0aS1zZWxlY3QnKCkge1xuICAgIHRoaXMucmVuZGVyKFxuICAgICAgc3RyaXBgXG4gICAgICA8c2VsZWN0IG11bHRpcGxlPlxuICAgICAgICA8b3B0aW9uPjA8L29wdGlvbj5cbiAgICAgICAgPG9wdGlvbiBzZWxlY3RlZD17e3NvbWV0aGluZ1RydWV9fT4xPC9vcHRpb24+XG4gICAgICAgIDxvcHRpb24gc2VsZWN0ZWQ9e3tzb21ldGhpbmdUcnV0aHl9fT4yPC9vcHRpb24+XG4gICAgICAgIDxvcHRpb24gc2VsZWN0ZWQ9e3tzb21ldGhpbmdVbmRlZmluZWR9fT4zPC9vcHRpb24+XG4gICAgICAgIDxvcHRpb24gc2VsZWN0ZWQ9e3tzb21ldGhpbmdOdWxsfX0+NDwvb3B0aW9uPlxuICAgICAgICA8b3B0aW9uIHNlbGVjdGVkPXt7c29tZXRoaW5nRmFsc2V9fT41PC9vcHRpb24+XG4gICAgICA8L3NlbGVjdD5gLFxuICAgICAge1xuICAgICAgICBzb21ldGhpbmdUcnVlOiB0cnVlLFxuICAgICAgICBzb21ldGhpbmdUcnV0aHk6ICdpcy10cnVlJyxcbiAgICAgICAgc29tZXRoaW5nVW5kZWZpbmVkOiB1bmRlZmluZWQsXG4gICAgICAgIHNvbWV0aGluZ051bGw6IG51bGwsXG4gICAgICAgIHNvbWV0aGluZ0ZhbHNlOiBmYWxzZSxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgbGV0IHNlbGVjdE5vZGUgPSBmaXJzdEVsZW1lbnRDaGlsZCh0aGlzLmVsZW1lbnQpO1xuICAgIHRoaXMuYXNzZXJ0Lm9rKHNlbGVjdE5vZGUsICdyZW5kZXJlZCBzZWxlY3QnKTtcbiAgICBpZiAoc2VsZWN0Tm9kZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsZXQgb3B0aW9ucyA9IGdldEVsZW1lbnRzQnlUYWdOYW1lKHNlbGVjdE5vZGUsICdvcHRpb24nKTtcbiAgICBsZXQgc2VsZWN0ZWQ6IFNpbXBsZUVsZW1lbnRbXSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb3B0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgbGV0IG9wdGlvbiA9IG9wdGlvbnNbaV07XG4gICAgICAvLyBUT0RPOiBUaGlzIGlzIGEgcmVhbCBkaXNjcmVwYW5jeSB3aXRoIFNpbXBsZURPTVxuICAgICAgaWYgKChvcHRpb24gYXMgYW55KS5zZWxlY3RlZCkge1xuICAgICAgICBzZWxlY3RlZC5wdXNoKG9wdGlvbik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5hc3NlcnRIVE1MKHN0cmlwYFxuICAgICAgPHNlbGVjdCBtdWx0aXBsZT1cIlwiPlxuICAgICAgICA8b3B0aW9uPjA8L29wdGlvbj5cbiAgICAgICAgPG9wdGlvbiAke3RoaXMubmFtZSA9PT0gJ3JlaHlkcmF0aW9uJyA/ICcgc2VsZWN0ZWQ9dHJ1ZScgOiAnJ30+MTwvb3B0aW9uPlxuICAgICAgICA8b3B0aW9uICR7dGhpcy5uYW1lID09PSAncmVoeWRyYXRpb24nID8gJyBzZWxlY3RlZD10cnVlJyA6ICcnfT4yPC9vcHRpb24+XG4gICAgICAgIDxvcHRpb24+Mzwvb3B0aW9uPlxuICAgICAgICA8b3B0aW9uPjQ8L29wdGlvbj5cbiAgICAgICAgPG9wdGlvbj41PC9vcHRpb24+XG4gICAgICA8L3NlbGVjdD5gKTtcblxuICAgIHRoaXMuYXNzZXJ0LmVxdWFsKHNlbGVjdGVkLmxlbmd0aCwgMiwgJ3R3byBvcHRpb25zIGFyZSBzZWxlY3RlZCcpO1xuICAgIHRoaXMuYXNzZXJ0LmVxdWFsKChzZWxlY3RlZFswXSBhcyBIVE1MT3B0aW9uRWxlbWVudCkudmFsdWUsICcxJywgJ2ZpcnN0IHNlbGVjdGVkIGl0ZW0gaXMgXCIxXCInKTtcbiAgICB0aGlzLmFzc2VydC5lcXVhbCgoc2VsZWN0ZWRbMV0gYXMgSFRNTE9wdGlvbkVsZW1lbnQpLnZhbHVlLCAnMicsICdzZWNvbmQgc2VsZWN0ZWQgaXRlbSBpcyBcIjJcIicpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ0hUTUwgY29tbWVudHMnKCkge1xuICAgIHRoaXMucmVuZGVyKCc8ZGl2PjwhLS0gSnVzdCBwYXNzaW5nIHRocm91Z2ggLS0+PC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8ZGl2PjwhLS0gSnVzdCBwYXNzaW5nIHRocm91Z2ggLS0+PC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ0N1cmxpZXMgaW4gSFRNTCBjb21tZW50cycoKSB7XG4gICAgdGhpcy5yZW5kZXIoJzxkaXY+PCEtLSB7e2Zvb319IC0tPjwvZGl2PicsIHsgZm9vOiAnZm9vJyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+PCEtLSB7e2Zvb319IC0tPjwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBmb286ICdiYXInIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGRpdj48IS0tIHt7Zm9vfX0gLS0+PC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGZvbzogJycgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8ZGl2PjwhLS0ge3tmb299fSAtLT48L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgZm9vOiAnZm9vJyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+PCEtLSB7e2Zvb319IC0tPjwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdDb21wbGV4IEN1cmxpZXMgaW4gSFRNTCBjb21tZW50cycoKSB7XG4gICAgdGhpcy5yZW5kZXIoJzxkaXY+PCEtLSB7e2ZvbyBiYXIgYmF6fX0gLS0+PC9kaXY+JywgeyBmb286ICdmb28nIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGRpdj48IS0tIHt7Zm9vIGJhciBiYXp9fSAtLT48L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgZm9vOiAnYmFyJyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+PCEtLSB7e2ZvbyBiYXIgYmF6fX0gLS0+PC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGZvbzogJycgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8ZGl2PjwhLS0ge3tmb28gYmFyIGJhen19IC0tPjwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBmb286ICdmb28nIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGRpdj48IS0tIHt7Zm9vIGJhciBiYXp9fSAtLT48L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG4gIH1cblxuICBAdGVzdFxuICAnSFRNTCBjb21tZW50cyB3aXRoIG11bHRpLWxpbmUgbXVzdGFjaGVzJygpIHtcbiAgICB0aGlzLnJlbmRlcignPGRpdj48IS0tIHt7I2VhY2ggZm9vIGFzIHxiYXJ8fX1cXG57e2Jhcn19XFxuXFxue3svZWFjaH19IC0tPjwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGRpdj48IS0tIHt7I2VhY2ggZm9vIGFzIHxiYXJ8fX1cXG57e2Jhcn19XFxuXFxue3svZWFjaH19IC0tPjwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdUb3AgbGV2ZWwgY29tbWVudHMnKCkge1xuICAgIHRoaXMucmVuZGVyKCc8IS0tIHt7Zm9vfX0gLS0+Jyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8IS0tIHt7Zm9vfX0gLS0+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ0hhbmRsZWJhcnMgY29tbWVudHMnKCkge1xuICAgIHRoaXMucmVuZGVyKCc8ZGl2Pnt7ISBCZXR0ZXIgbm90IGJyZWFrISB9fWNvbnRlbnQ8L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+Y29udGVudDwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdOYW1lc3BhY2VkIGF0dHJpYnV0ZScoKSB7XG4gICAgdGhpcy5yZW5kZXIoXCI8c3ZnIHhsaW5rOnRpdGxlPSdzdmctdGl0bGUnPmNvbnRlbnQ8L3N2Zz5cIik7XG4gICAgdGhpcy5hc3NlcnRIVE1MKFwiPHN2ZyB4bGluazp0aXRsZT0nc3ZnLXRpdGxlJz5jb250ZW50PC9zdmc+XCIpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICc8c3ZnPiB0YWcgd2l0aCBjYXNlLXNlbnNpdGl2ZSBhdHRyaWJ1dGUnKCkge1xuICAgIHRoaXMucmVuZGVyKCc8c3ZnIHZpZXdCb3g9XCIwIDAgMCAwXCI+PC9zdmc+Jyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8c3ZnIHZpZXdCb3g9XCIwIDAgMCAwXCI+PC9zdmc+Jyk7XG4gICAgbGV0IHN2ZyA9IHRoaXMuZWxlbWVudC5maXJzdENoaWxkO1xuICAgIGlmIChhc3NlcnROb2RlVGFnTmFtZShzdmcsICdzdmcnKSkge1xuICAgICAgdGhpcy5hc3NlcnQuZXF1YWwoc3ZnLm5hbWVzcGFjZVVSSSwgTmFtZXNwYWNlLlNWRyk7XG4gICAgICB0aGlzLmFzc2VydC5lcXVhbChzdmcuZ2V0QXR0cmlidXRlKCd2aWV3Qm94JyksICcwIDAgMCAwJyk7XG4gICAgfVxuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICduZXN0ZWQgZWxlbWVudCBpbiB0aGUgU1ZHIG5hbWVzcGFjZScoKSB7XG4gICAgbGV0IGQgPSAnTSAwIDAgTCAxMDAgMTAwJztcbiAgICB0aGlzLnJlbmRlcihgPHN2Zz48cGF0aCBkPVwiJHtkfVwiPjwvcGF0aD48L3N2Zz5gKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoYDxzdmc+PHBhdGggZD1cIiR7ZH1cIj48L3BhdGg+PC9zdmc+YCk7XG5cbiAgICBsZXQgc3ZnID0gdGhpcy5lbGVtZW50LmZpcnN0Q2hpbGQ7XG5cbiAgICBpZiAoYXNzZXJ0Tm9kZVRhZ05hbWUoc3ZnLCAnc3ZnJykpIHtcbiAgICAgIHRoaXMuYXNzZXJ0LmVxdWFsKHN2Zy5uYW1lc3BhY2VVUkksIE5hbWVzcGFjZS5TVkcpO1xuXG4gICAgICBsZXQgcGF0aCA9IHN2Zy5maXJzdENoaWxkO1xuICAgICAgaWYgKGFzc2VydE5vZGVUYWdOYW1lKHBhdGgsICdwYXRoJykpIHtcbiAgICAgICAgdGhpcy5hc3NlcnQuZXF1YWwoXG4gICAgICAgICAgcGF0aC5uYW1lc3BhY2VVUkksXG4gICAgICAgICAgTmFtZXNwYWNlLlNWRyxcbiAgICAgICAgICAnY3JlYXRlcyB0aGUgcGF0aCBlbGVtZW50IHdpdGggYSBuYW1lc3BhY2UnXG4gICAgICAgICk7XG4gICAgICAgIHRoaXMuYXNzZXJ0LmVxdWFsKHBhdGguZ2V0QXR0cmlidXRlKCdkJyksIGQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICc8Zm9yZWlnbk9iamVjdD4gdGFnIGhhcyBhbiBTVkcgbmFtZXNwYWNlJygpIHtcbiAgICB0aGlzLnJlbmRlcignPHN2Zz48Zm9yZWlnbk9iamVjdD5IaTwvZm9yZWlnbk9iamVjdD48L3N2Zz4nKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxzdmc+PGZvcmVpZ25PYmplY3Q+SGk8L2ZvcmVpZ25PYmplY3Q+PC9zdmc+Jyk7XG5cbiAgICBsZXQgc3ZnID0gdGhpcy5lbGVtZW50LmZpcnN0Q2hpbGQ7XG5cbiAgICBpZiAoYXNzZXJ0Tm9kZVRhZ05hbWUoc3ZnLCAnc3ZnJykpIHtcbiAgICAgIHRoaXMuYXNzZXJ0LmVxdWFsKHN2Zy5uYW1lc3BhY2VVUkksIE5hbWVzcGFjZS5TVkcpO1xuXG4gICAgICBsZXQgZm9yZWlnbk9iamVjdCA9IHN2Zy5maXJzdENoaWxkO1xuXG4gICAgICBpZiAoYXNzZXJ0Tm9kZVRhZ05hbWUoZm9yZWlnbk9iamVjdCwgJ2ZvcmVpZ25PYmplY3QnKSkge1xuICAgICAgICB0aGlzLmFzc2VydC5lcXVhbChcbiAgICAgICAgICBmb3JlaWduT2JqZWN0Lm5hbWVzcGFjZVVSSSxcbiAgICAgICAgICBOYW1lc3BhY2UuU1ZHLFxuICAgICAgICAgICdjcmVhdGVzIHRoZSBmb3JlaWduT2JqZWN0IGVsZW1lbnQgd2l0aCBhIG5hbWVzcGFjZSdcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAnTmFtZXNwYWNlZCBhbmQgbm9uLW5hbWVzcGFjZWQgZWxlbWVudHMgYXMgc2libGluZ3MnKCkge1xuICAgIHRoaXMucmVuZGVyKCc8c3ZnPjwvc3ZnPjxzdmc+PC9zdmc+PGRpdj48L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxzdmc+PC9zdmc+PHN2Zz48L3N2Zz48ZGl2PjwvZGl2PicpO1xuXG4gICAgdGhpcy5hc3NlcnQuZXF1YWwoXG4gICAgICAodGhpcy5lbGVtZW50LmNoaWxkTm9kZXNbMF0gYXMgTm9kZSkubmFtZXNwYWNlVVJJLFxuICAgICAgTmFtZXNwYWNlLlNWRyxcbiAgICAgICdjcmVhdGVzIHRoZSBmaXJzdCBzdmcgZWxlbWVudCB3aXRoIGEgbmFtZXNwYWNlJ1xuICAgICk7XG5cbiAgICB0aGlzLmFzc2VydC5lcXVhbChcbiAgICAgICh0aGlzLmVsZW1lbnQuY2hpbGROb2Rlc1sxXSBhcyBOb2RlKS5uYW1lc3BhY2VVUkksXG4gICAgICBOYW1lc3BhY2UuU1ZHLFxuICAgICAgJ2NyZWF0ZXMgdGhlIHNlY29uZCBzdmcgZWxlbWVudCB3aXRoIGEgbmFtZXNwYWNlJ1xuICAgICk7XG5cbiAgICB0aGlzLmFzc2VydC5lcXVhbChcbiAgICAgICh0aGlzLmVsZW1lbnQuY2hpbGROb2Rlc1syXSBhcyBOb2RlKS5uYW1lc3BhY2VVUkksXG4gICAgICBYSFRNTF9OQU1FU1BBQ0UsXG4gICAgICAnY3JlYXRlcyB0aGUgZGl2IGVsZW1lbnQgd2l0aG91dCBhIG5hbWVzcGFjZSdcbiAgICApO1xuXG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ05hbWVzcGFjZWQgYW5kIG5vbi1uYW1lc3BhY2VkIGVsZW1lbnRzIHdpdGggbmVzdGluZycoKSB7XG4gICAgdGhpcy5yZW5kZXIoJzxkaXY+PHN2Zz48L3N2Zz48L2Rpdj48ZGl2PjwvZGl2PicpO1xuXG4gICAgbGV0IGZpcnN0RGl2ID0gdGhpcy5lbGVtZW50LmZpcnN0Q2hpbGQ7XG4gICAgbGV0IHNlY29uZERpdiA9IHRoaXMuZWxlbWVudC5sYXN0Q2hpbGQ7XG4gICAgbGV0IHN2ZyA9IGZpcnN0RGl2ICYmIGZpcnN0RGl2LmZpcnN0Q2hpbGQ7XG5cbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+PHN2Zz48L3N2Zz48L2Rpdj48ZGl2PjwvZGl2PicpO1xuXG4gICAgaWYgKGFzc2VydE5vZGVUYWdOYW1lKGZpcnN0RGl2LCAnZGl2JykpIHtcbiAgICAgIHRoaXMuYXNzZXJ0LmVxdWFsKFxuICAgICAgICBmaXJzdERpdi5uYW1lc3BhY2VVUkksXG4gICAgICAgIFhIVE1MX05BTUVTUEFDRSxcbiAgICAgICAgXCJmaXJzdCBkaXYncyBuYW1lc3BhY2UgaXMgeGh0bWxOYW1lc3BhY2VcIlxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAoYXNzZXJ0Tm9kZVRhZ05hbWUoc3ZnLCAnc3ZnJykpIHtcbiAgICAgIHRoaXMuYXNzZXJ0LmVxdWFsKHN2Zy5uYW1lc3BhY2VVUkksIE5hbWVzcGFjZS5TVkcsIFwic3ZnJ3MgbmFtZXNwYWNlIGlzIHN2Z05hbWVzcGFjZVwiKTtcbiAgICB9XG5cbiAgICBpZiAoYXNzZXJ0Tm9kZVRhZ05hbWUoc2Vjb25kRGl2LCAnZGl2JykpIHtcbiAgICAgIHRoaXMuYXNzZXJ0LmVxdWFsKFxuICAgICAgICBzZWNvbmREaXYubmFtZXNwYWNlVVJJLFxuICAgICAgICBYSFRNTF9OQU1FU1BBQ0UsXG4gICAgICAgIFwibGFzdCBkaXYncyBuYW1lc3BhY2UgaXMgeGh0bWxOYW1lc3BhY2VcIlxuICAgICAgKTtcbiAgICB9XG5cbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAnQ2FzZS1zZW5zaXRpdmUgdGFnIGhhcyBjYXBpdGFsaXphdGlvbiBwcmVzZXJ2ZWQnKCkge1xuICAgIHRoaXMucmVuZGVyKCc8c3ZnPjxsaW5lYXJHcmFkaWVudCBpZD1cImdyYWRpZW50XCI+PC9saW5lYXJHcmFkaWVudD48L3N2Zz4nKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxzdmc+PGxpbmVhckdyYWRpZW50IGlkPVwiZ3JhZGllbnRcIj48L2xpbmVhckdyYWRpZW50Pjwvc3ZnPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdUZXh0IGN1cmxpZXMnKCkge1xuICAgIHRoaXMucmVuZGVyKCc8ZGl2Pnt7dGl0bGV9fTxzcGFuPnt7dGl0bGV9fTwvc3Bhbj48L2Rpdj4nLCB7IHRpdGxlOiAnaGVsbG8nIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGRpdj5oZWxsbzxzcGFuPmhlbGxvPC9zcGFuPjwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyB0aXRsZTogJ2dvb2RieWUnIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGRpdj5nb29kYnllPHNwYW4+Z29vZGJ5ZTwvc3Bhbj48L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgdGl0bGU6ICcnIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGRpdj48c3Bhbj48L3NwYW4+PC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IHRpdGxlOiAnaGVsbG8nIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGRpdj5oZWxsbzxzcGFuPmhlbGxvPC9zcGFuPjwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdSZXBhaXJlZCB0ZXh0IG5vZGVzIGFyZSBlbnN1cmVkIGluIHRoZSByaWdodCBwbGFjZSBQYXJ0IDEnKCkge1xuICAgIHRoaXMucmVuZGVyKCd7e2F9fSB7e2J9fScsIHsgYTogJ0EnLCBiOiAnQicsIGM6ICdDJywgZDogJ0QnIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnQSBCJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ1JlcGFpcmVkIHRleHQgbm9kZXMgYXJlIGVuc3VyZWQgaW4gdGhlIHJpZ2h0IHBsYWNlIFBhcnQgMicoKSB7XG4gICAgdGhpcy5yZW5kZXIoJzxkaXY+e3thfX17e2J9fXt7Y319d2F0e3tkfX08L2Rpdj4nLCB7IGE6ICdBJywgYjogJ0InLCBjOiAnQycsIGQ6ICdEJyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+QUJDd2F0RDwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdSZXBhaXJlZCB0ZXh0IG5vZGVzIGFyZSBlbnN1cmVkIGluIHRoZSByaWdodCBwbGFjZSBQYXJ0IDMnKCkge1xuICAgIHRoaXMucmVuZGVyKCd7e2F9fXt7Yn19PGltZz48aW1nPjxpbWc+PGltZz4nLCB7IGE6ICdBJywgYjogJ0InLCBjOiAnQycsIGQ6ICdEJyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJ0FCPGltZz48aW1nPjxpbWc+PGltZz4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAnUGF0aCBleHByZXNzaW9ucycoKSB7XG4gICAgdGhpcy5yZW5kZXIoJzxkaXY+e3ttb2RlbC5mb28uYmFyfX08c3Bhbj57e21vZGVsLmZvby5iYXJ9fTwvc3Bhbj48L2Rpdj4nLCB7XG4gICAgICBtb2RlbDogeyBmb286IHsgYmFyOiAnaGVsbG8nIH0gfSxcbiAgICB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+aGVsbG88c3Bhbj5oZWxsbzwvc3Bhbj48L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgbW9kZWw6IHsgZm9vOiB7IGJhcjogJ2dvb2RieWUnIH0gfSB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+Z29vZGJ5ZTxzcGFuPmdvb2RieWU8L3NwYW4+PC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IG1vZGVsOiB7IGZvbzogeyBiYXI6ICcnIH0gfSB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+PHNwYW4+PC9zcGFuPjwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBtb2RlbDogeyBmb286IHsgYmFyOiAnaGVsbG8nIH0gfSB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+aGVsbG88c3Bhbj5oZWxsbzwvc3Bhbj48L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG4gIH1cblxuICBAdGVzdFxuICAnVGV4dCBjdXJsaWVzIHBlcmZvcm0gZXNjYXBpbmcnKCkge1xuICAgIHRoaXMucmVuZGVyKCc8ZGl2Pnt7dGl0bGV9fTxzcGFuPnt7dGl0bGV9fTwvc3Bhbj48L2Rpdj4nLCB7IHRpdGxlOiAnPHN0cm9uZz5oZWxsbzwvc3Ryb25nPicgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKFxuICAgICAgJzxkaXY+Jmx0O3N0cm9uZyZndDtoZWxsbyZsdDsvc3Ryb25nJmd0OzxzcGFuPiZsdDtzdHJvbmc+aGVsbG8mbHQ7L3N0cm9uZyZndDs8L3NwYW4+PC9kaXY+J1xuICAgICk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IHRpdGxlOiAnPGk+Z29vZGJ5ZTwvaT4nIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGRpdj4mbHQ7aSZndDtnb29kYnllJmx0Oy9pJmd0OzxzcGFuPiZsdDtpJmd0O2dvb2RieWUmbHQ7L2kmZ3Q7PC9zcGFuPjwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyB0aXRsZTogJycgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8ZGl2PjxzcGFuPjwvc3Bhbj48L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgdGl0bGU6ICc8c3Ryb25nPmhlbGxvPC9zdHJvbmc+JyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoXG4gICAgICAnPGRpdj4mbHQ7c3Ryb25nJmd0O2hlbGxvJmx0Oy9zdHJvbmcmZ3Q7PHNwYW4+Jmx0O3N0cm9uZz5oZWxsbyZsdDsvc3Ryb25nJmd0Ozwvc3Bhbj48L2Rpdj4nXG4gICAgKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG4gIH1cblxuICBAdGVzdFxuICAnUmVyZW5kZXIgcmVzcGVjdHMgd2hpdGVzcGFjZScoKSB7XG4gICAgdGhpcy5yZW5kZXIoJ0hlbGxvIHt7IGZvbyB9fSAnLCB7IGZvbzogJ2JhcicgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCdIZWxsbyBiYXIgJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGZvbzogJ2JheicgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCdIZWxsbyBiYXogJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGZvbzogJycgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCdIZWxsbyAgJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGZvbzogJ2JhcicgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCdIZWxsbyBiYXIgJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ1NhZmUgSFRNTCBjdXJsaWVzJygpIHtcbiAgICBsZXQgdGl0bGUgPSB7XG4gICAgICB0b0hUTUwoKSB7XG4gICAgICAgIHJldHVybiAnPHNwYW4+aGVsbG88L3NwYW4+IDxlbT53b3JsZDwvZW0+JztcbiAgICAgIH0sXG4gICAgfTtcbiAgICB0aGlzLnJlbmRlcignPGRpdj57e3RpdGxlfX08L2Rpdj4nLCB7IHRpdGxlIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGRpdj48c3Bhbj5oZWxsbzwvc3Bhbj4gPGVtPndvcmxkPC9lbT48L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAnVHJpcGxlIGN1cmxpZXMnKCkge1xuICAgIGxldCB0aXRsZSA9ICc8c3Bhbj5oZWxsbzwvc3Bhbj4gPGVtPndvcmxkPC9lbT4nO1xuICAgIHRoaXMucmVuZGVyKCc8ZGl2Pnt7e3RpdGxlfX19PC9kaXY+JywgeyB0aXRsZSB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+PHNwYW4+aGVsbG88L3NwYW4+IDxlbT53b3JsZDwvZW0+PC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ1RyaXBsZSBjdXJsaWUgaGVscGVycycoKSB7XG4gICAgdGhpcy5yZWdpc3RlckhlbHBlcigndW5lc2NhcGVkJywgKFtwYXJhbV0pID0+IHBhcmFtKTtcbiAgICB0aGlzLnJlZ2lzdGVySGVscGVyKCdlc2NhcGVkJywgKFtwYXJhbV0pID0+IHBhcmFtKTtcbiAgICB0aGlzLnJlbmRlcigne3t7dW5lc2NhcGVkIFwiPHN0cm9uZz5Zb2xvPC9zdHJvbmc+XCJ9fX0ge3tlc2NhcGVkIFwiPHN0cm9uZz5Zb2xvPC9zdHJvbmc+XCJ9fScpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPHN0cm9uZz5Zb2xvPC9zdHJvbmc+ICZsdDtzdHJvbmcmZ3Q7WW9sbyZsdDsvc3Ryb25nJmd0OycpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdUb3AgbGV2ZWwgdHJpcGxlIGN1cmxpZXMnKCkge1xuICAgIGxldCB0aXRsZSA9ICc8c3Bhbj5oZWxsbzwvc3Bhbj4gPGVtPndvcmxkPC9lbT4nO1xuICAgIHRoaXMucmVuZGVyKCd7e3t0aXRsZX19fScsIHsgdGl0bGUgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8c3Bhbj5oZWxsbzwvc3Bhbj4gPGVtPndvcmxkPC9lbT4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAnVG9wIGxldmVsIHVuZXNjYXBlZCB0cicoKSB7XG4gICAgbGV0IHRpdGxlID0gJzx0cj48dGQ+WW88L3RkPjwvdHI+JztcbiAgICB0aGlzLnJlbmRlcignPHRhYmxlPnt7e3RpdGxlfX19PC90YWJsZT4nLCB7IHRpdGxlIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPHRhYmxlPjx0Ym9keT48dHI+PHRkPllvPC90ZD48L3RyPjwvdGJvZHk+PC90YWJsZT4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAnVGhlIGNvbXBpbGVyIGNhbiBoYW5kbGUgdG9wLWxldmVsIHVuZXNjYXBlZCB0ZCBpbnNpZGUgdHIgY29udGV4dHVhbEVsZW1lbnQnKCkge1xuICAgIHRoaXMucmVuZGVyKCd7e3todG1sfX19JywgeyBodG1sOiAnPHRkPllvPC90ZD4nIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPHRyPjx0ZD5ZbzwvdGQ+PC90cj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAnRXh0cmVtZSBuZXN0aW5nJygpIHtcbiAgICB0aGlzLnJlbmRlcihcbiAgICAgICd7e2Zvb319PHNwYW4+e3tiYXJ9fTxhPnt7YmF6fX08ZW0+e3tib299fXt7YnJld319PC9lbT57e2JhdH19PC9hPjwvc3Bhbj48c3Bhbj48c3Bhbj57e2ZsdXRlfX08L3NwYW4+PC9zcGFuPnt7YXJnaH19JyxcbiAgICAgIHtcbiAgICAgICAgZm9vOiAnRk9PJyxcbiAgICAgICAgYmFyOiAnQkFSJyxcbiAgICAgICAgYmF6OiAnQkFaJyxcbiAgICAgICAgYm9vOiAnQk9PJyxcbiAgICAgICAgYnJldzogJ0JSRVcnLFxuICAgICAgICBiYXQ6ICdCQVQnLFxuICAgICAgICBmbHV0ZTogJ0ZMVVRFJyxcbiAgICAgICAgYXJnaDogJ0FSR0gnLFxuICAgICAgfVxuICAgICk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKFxuICAgICAgJ0ZPTzxzcGFuPkJBUjxhPkJBWjxlbT5CT09CUkVXPC9lbT5CQVQ8L2E+PC9zcGFuPjxzcGFuPjxzcGFuPkZMVVRFPC9zcGFuPjwvc3Bhbj5BUkdIJ1xuICAgICk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ1NpbXBsZSBibG9ja3MnKCkge1xuICAgIHRoaXMucmVuZGVyKCc8ZGl2Pnt7I2lmIGFkbWlufX08cD57e3VzZXJ9fTwvcD57ey9pZn19ITwvZGl2PicsIHtcbiAgICAgIGFkbWluOiB0cnVlLFxuICAgICAgdXNlcjogJ2NoYW5jYW5jb2RlJyxcbiAgICB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+PHA+Y2hhbmNhbmNvZGU8L3A+ITwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIGxldCBwID0gdGhpcy5lbGVtZW50LmZpcnN0Q2hpbGQhLmZpcnN0Q2hpbGQhO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGFkbWluOiBmYWxzZSB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+PCEtLS0tPiE8L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKHsgZXhjZXB0OiBwIH0pO1xuXG4gICAgbGV0IGNvbW1lbnQgPSB0aGlzLmVsZW1lbnQuZmlyc3RDaGlsZCEuZmlyc3RDaGlsZCE7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgYWRtaW46IHRydWUgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8ZGl2PjxwPmNoYW5jYW5jb2RlPC9wPiE8L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKHsgZXhjZXB0OiBjb21tZW50IH0pO1xuICB9XG5cbiAgQHRlc3RcbiAgJ05lc3RlZCBibG9ja3MnKCkge1xuICAgIHRoaXMucmVuZGVyKCc8ZGl2Pnt7I2lmIGFkbWlufX17eyNpZiBhY2Nlc3N9fTxwPnt7dXNlcn19PC9wPnt7L2lmfX17ey9pZn19ITwvZGl2PicsIHtcbiAgICAgIGFkbWluOiB0cnVlLFxuICAgICAgYWNjZXNzOiB0cnVlLFxuICAgICAgdXNlcjogJ2NoYW5jYW5jb2RlJyxcbiAgICB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+PHA+Y2hhbmNhbmNvZGU8L3A+ITwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIGxldCBwID0gdGhpcy5lbGVtZW50LmZpcnN0Q2hpbGQhLmZpcnN0Q2hpbGQhO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGFkbWluOiBmYWxzZSB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+PCEtLS0tPiE8L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKHsgZXhjZXB0OiBwIH0pO1xuXG4gICAgbGV0IGNvbW1lbnQgPSB0aGlzLmVsZW1lbnQuZmlyc3RDaGlsZCEuZmlyc3RDaGlsZCE7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgYWRtaW46IHRydWUgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8ZGl2PjxwPmNoYW5jYW5jb2RlPC9wPiE8L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKHsgZXhjZXB0OiBjb21tZW50IH0pO1xuXG4gICAgcCA9IHRoaXMuZWxlbWVudC5maXJzdENoaWxkIS5maXJzdENoaWxkITtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBhY2Nlc3M6IGZhbHNlIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGRpdj48IS0tLS0+ITwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoeyBleGNlcHQ6IHAgfSk7XG4gIH1cblxuICBAdGVzdFxuICBMb29wcygpIHtcbiAgICB0aGlzLnJlbmRlcihcbiAgICAgICc8ZGl2Pnt7I2VhY2ggcGVvcGxlIGtleT1cImhhbmRsZVwiIGFzIHxwfH19PHNwYW4+e3twLmhhbmRsZX19PC9zcGFuPiAtIHt7cC5uYW1lfX17ey9lYWNofX08L2Rpdj4nLFxuICAgICAge1xuICAgICAgICBwZW9wbGU6IFtcbiAgICAgICAgICB7IGhhbmRsZTogJ3RvbWRhbGUnLCBuYW1lOiAnVG9tIERhbGUnIH0sXG4gICAgICAgICAgeyBoYW5kbGU6ICdjaGFuY2FuY29kZScsIG5hbWU6ICdHb2RmcmV5IENoYW4nIH0sXG4gICAgICAgICAgeyBoYW5kbGU6ICd3eWNhdHMnLCBuYW1lOiAnWWVodWRhIEthdHonIH0sXG4gICAgICAgIF0sXG4gICAgICB9XG4gICAgKTtcblxuICAgIHRoaXMuYXNzZXJ0SFRNTChcbiAgICAgICc8ZGl2PjxzcGFuPnRvbWRhbGU8L3NwYW4+IC0gVG9tIERhbGU8c3Bhbj5jaGFuY2FuY29kZTwvc3Bhbj4gLSBHb2RmcmV5IENoYW48c3Bhbj53eWNhdHM8L3NwYW4+IC0gWWVodWRhIEthdHo8L2Rpdj4nXG4gICAgKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHtcbiAgICAgIHBlb3BsZTogW1xuICAgICAgICB7IGhhbmRsZTogJ3RvbWRhbGUnLCBuYW1lOiAnVGhvbWFzIERhbGUnIH0sXG4gICAgICAgIHsgaGFuZGxlOiAnd3ljYXRzJywgbmFtZTogJ1llaHVkYSBLYXR6JyB9LFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0SFRNTChcbiAgICAgICc8ZGl2PjxzcGFuPnRvbWRhbGU8L3NwYW4+IC0gVGhvbWFzIERhbGU8c3Bhbj53eWNhdHM8L3NwYW4+IC0gWWVodWRhIEthdHo8L2Rpdj4nXG4gICAgKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdTaW1wbGUgaGVscGVycycoKSB7XG4gICAgdGhpcy5yZWdpc3RlckhlbHBlcigndGVzdGluZycsIChbaWRdKSA9PiBpZCk7XG4gICAgdGhpcy5yZW5kZXIoJzxkaXY+e3t0ZXN0aW5nIHRpdGxlfX08L2Rpdj4nLCB7IHRpdGxlOiAnaGVsbG8nIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGRpdj5oZWxsbzwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdDb25zdGFudCBuZWdhdGl2ZSBudW1iZXJzIGNhbiByZW5kZXInKCkge1xuICAgIHRoaXMucmVnaXN0ZXJIZWxwZXIoJ3Rlc3RpbmcnLCAoW2lkXSkgPT4gaWQpO1xuICAgIHRoaXMucmVuZGVyKCc8ZGl2Pnt7dGVzdGluZyAtMTIzMzIxfX08L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+LTEyMzMyMTwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdMYXJnZSBudW1lcmljIGxpdGVyYWxzIChOdW1iZXIuTUFYX1NBRkVfSU5URUdFUiknKCkge1xuICAgIHRoaXMucmVnaXN0ZXJIZWxwZXIoJ3Rlc3RpbmcnLCAoW2lkXSkgPT4gaWQpO1xuICAgIHRoaXMucmVuZGVyKCc8ZGl2Pnt7dGVzdGluZyA5MDA3MTk5MjU0NzQwOTkxfX08L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+OTAwNzE5OTI1NDc0MDk5MTwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdDb25zdGFudCBmbG9hdCBudW1iZXJzIGNhbiByZW5kZXInKCkge1xuICAgIHRoaXMucmVnaXN0ZXJIZWxwZXIoJ3Rlc3RpbmcnLCAoW2lkXSkgPT4gaWQpO1xuICAgIHRoaXMucmVuZGVyKCc8ZGl2Pnt7dGVzdGluZyAwLjEyM319PC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8ZGl2PjAuMTIzPC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ0dIIzEzOTk5IFRoZSBjb21waWxlciBjYW4gaGFuZGxlIHNpbXBsZSBoZWxwZXJzIHdpdGggaW5saW5lIG51bGwgcGFyYW1ldGVyJygpIHtcbiAgICBsZXQgdmFsdWU7XG4gICAgdGhpcy5yZWdpc3RlckhlbHBlcignc2F5LWhlbGxvJywgZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgICB2YWx1ZSA9IHBhcmFtc1swXTtcbiAgICAgIHJldHVybiAnaGVsbG8nO1xuICAgIH0pO1xuICAgIHRoaXMucmVuZGVyKCc8ZGl2Pnt7c2F5LWhlbGxvIG51bGx9fTwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGRpdj5oZWxsbzwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0LnN0cmljdEVxdWFsKHZhbHVlLCBudWxsLCAnaXMgbnVsbCcpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdHSCMxMzk5OSBUaGUgY29tcGlsZXIgY2FuIGhhbmRsZSBzaW1wbGUgaGVscGVycyB3aXRoIGlubGluZSBzdHJpbmcgbGl0ZXJhbCBudWxsIHBhcmFtZXRlcicoKSB7XG4gICAgbGV0IHZhbHVlO1xuICAgIHRoaXMucmVnaXN0ZXJIZWxwZXIoJ3NheS1oZWxsbycsIGZ1bmN0aW9uKHBhcmFtcykge1xuICAgICAgdmFsdWUgPSBwYXJhbXNbMF07XG4gICAgICByZXR1cm4gJ2hlbGxvJztcbiAgICB9KTtcblxuICAgIHRoaXMucmVuZGVyKCc8ZGl2Pnt7c2F5LWhlbGxvIFwibnVsbFwifX08L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+aGVsbG88L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydC5zdHJpY3RFcXVhbCh2YWx1ZSwgJ251bGwnLCAnaXMgbnVsbCBzdHJpbmcgbGl0ZXJhbCcpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdHSCMxMzk5OSBUaGUgY29tcGlsZXIgY2FuIGhhbmRsZSBzaW1wbGUgaGVscGVycyB3aXRoIGlubGluZSB1bmRlZmluZWQgcGFyYW1ldGVyJygpIHtcbiAgICBsZXQgdmFsdWU6IHVua25vd24gPSAnUExBQ0VIT0xERVInO1xuICAgIGxldCBsZW5ndGg7XG4gICAgdGhpcy5yZWdpc3RlckhlbHBlcignc2F5LWhlbGxvJywgZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgICBsZW5ndGggPSBwYXJhbXMubGVuZ3RoO1xuICAgICAgdmFsdWUgPSBwYXJhbXNbMF07XG4gICAgICByZXR1cm4gJ2hlbGxvJztcbiAgICB9KTtcblxuICAgIHRoaXMucmVuZGVyKCc8ZGl2Pnt7c2F5LWhlbGxvIHVuZGVmaW5lZH19PC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8ZGl2PmhlbGxvPC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnQuc3RyaWN0RXF1YWwobGVuZ3RoLCAxKTtcbiAgICB0aGlzLmFzc2VydC5zdHJpY3RFcXVhbCh2YWx1ZSwgdW5kZWZpbmVkLCAnaXMgdW5kZWZpbmVkJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ0dIIzEzOTk5IFRoZSBjb21waWxlciBjYW4gaGFuZGxlIHNpbXBsZSBoZWxwZXJzIHdpdGggcG9zaXRpb25hbCBwYXJhbWV0ZXIgdW5kZWZpbmVkIHN0cmluZyBsaXRlcmFsJygpIHtcbiAgICBsZXQgdmFsdWU6IHVua25vd24gPSAnUExBQ0VIT0xERVInO1xuICAgIGxldCBsZW5ndGg7XG4gICAgdGhpcy5yZWdpc3RlckhlbHBlcignc2F5LWhlbGxvJywgZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgICBsZW5ndGggPSBwYXJhbXMubGVuZ3RoO1xuICAgICAgdmFsdWUgPSBwYXJhbXNbMF07XG4gICAgICByZXR1cm4gJ2hlbGxvJztcbiAgICB9KTtcblxuICAgIHRoaXMucmVuZGVyKCc8ZGl2Pnt7c2F5LWhlbGxvIFwidW5kZWZpbmVkXCJ9fSB1bmRlZmluZWQ8L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+aGVsbG8gdW5kZWZpbmVkPC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnQuc3RyaWN0RXF1YWwobGVuZ3RoLCAxKTtcbiAgICB0aGlzLmFzc2VydC5zdHJpY3RFcXVhbCh2YWx1ZSwgJ3VuZGVmaW5lZCcsICdpcyB1bmRlZmluZWQgc3RyaW5nIGxpdGVyYWwnKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAnR0gjMTM5OTkgVGhlIGNvbXBpbGVyIGNhbiBoYW5kbGUgY29tcG9uZW50cyB3aXRoIHVuZGVmaW5lZCBuYW1lZCBhcmd1bWVudHMnKCkge1xuICAgIGxldCB2YWx1ZTogdW5rbm93biA9ICdQTEFDRUhPTERFUic7XG4gICAgdGhpcy5yZWdpc3RlckhlbHBlcignc2F5LWhlbGxvJywgZnVuY3Rpb24oXywgaGFzaCkge1xuICAgICAgdmFsdWUgPSBoYXNoWydmb28nXTtcbiAgICAgIHJldHVybiAnaGVsbG8nO1xuICAgIH0pO1xuXG4gICAgdGhpcy5yZW5kZXIoJzxkaXY+e3tzYXktaGVsbG8gZm9vPXVuZGVmaW5lZH19PC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8ZGl2PmhlbGxvPC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnQuc3RyaWN0RXF1YWwodmFsdWUsIHVuZGVmaW5lZCwgJ2lzIHVuZGVmaW5lZCcpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdHSCMxMzk5OSBUaGUgY29tcGlsZXIgY2FuIGhhbmRsZSBjb21wb25lbnRzIHdpdGggdW5kZWZpbmVkIHN0cmluZyBsaXRlcmFsIG5hbWVkIGFyZ3VtZW50cycoKSB7XG4gICAgbGV0IHZhbHVlOiB1bmtub3duID0gJ1BMQUNFSE9MREVSJztcbiAgICB0aGlzLnJlZ2lzdGVySGVscGVyKCdzYXktaGVsbG8nLCBmdW5jdGlvbihfLCBoYXNoKSB7XG4gICAgICB2YWx1ZSA9IGhhc2hbJ2ZvbyddO1xuICAgICAgcmV0dXJuICdoZWxsbyc7XG4gICAgfSk7XG5cbiAgICB0aGlzLnJlbmRlcignPGRpdj57e3NheS1oZWxsbyBmb289XCJ1bmRlZmluZWRcIn19PC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8ZGl2PmhlbGxvPC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnQuc3RyaWN0RXF1YWwodmFsdWUsICd1bmRlZmluZWQnLCAnaXMgdW5kZWZpbmVkIHN0cmluZyBsaXRlcmFsJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ0dIIzEzOTk5IFRoZSBjb21waWxlciBjYW4gaGFuZGxlIGNvbXBvbmVudHMgd2l0aCBudWxsIG5hbWVkIGFyZ3VtZW50cycoKSB7XG4gICAgbGV0IHZhbHVlO1xuICAgIHRoaXMucmVnaXN0ZXJIZWxwZXIoJ3NheS1oZWxsbycsIGZ1bmN0aW9uKF8sIGhhc2gpIHtcbiAgICAgIHZhbHVlID0gaGFzaFsnZm9vJ107XG4gICAgICByZXR1cm4gJ2hlbGxvJztcbiAgICB9KTtcblxuICAgIHRoaXMucmVuZGVyKCc8ZGl2Pnt7c2F5LWhlbGxvIGZvbz1udWxsfX08L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+aGVsbG88L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydC5zdHJpY3RFcXVhbCh2YWx1ZSwgbnVsbCwgJ2lzIG51bGwnKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAnR0gjMTM5OTkgVGhlIGNvbXBpbGVyIGNhbiBoYW5kbGUgY29tcG9uZW50cyB3aXRoIG51bGwgc3RyaW5nIGxpdGVyYWwgbmFtZWQgYXJndW1lbnRzJygpIHtcbiAgICBsZXQgdmFsdWU7XG4gICAgdGhpcy5yZWdpc3RlckhlbHBlcignc2F5LWhlbGxvJywgZnVuY3Rpb24oXywgaGFzaCkge1xuICAgICAgdmFsdWUgPSBoYXNoWydmb28nXTtcbiAgICAgIHJldHVybiAnaGVsbG8nO1xuICAgIH0pO1xuXG4gICAgdGhpcy5yZW5kZXIoJzxkaXY+e3tzYXktaGVsbG8gZm9vPVwibnVsbFwifX08L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+aGVsbG88L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydC5zdHJpY3RFcXVhbCh2YWx1ZSwgJ251bGwnLCAnaXMgbnVsbCBzdHJpbmcgbGl0ZXJhbCcpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdOdWxsIGN1cmx5IGluIGF0dHJpYnV0ZXMnKCkge1xuICAgIHRoaXMucmVuZGVyKCc8ZGl2IGNsYXNzPVwiZm9vIHt7bnVsbH19XCI+aGVsbG88L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXYgY2xhc3M9XCJmb28gXCI+aGVsbG88L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAnTnVsbCBpbiBwcmltaXRpdmUgc3ludGF4JygpIHtcbiAgICB0aGlzLnJlbmRlcigne3sjaWYgbnVsbH19Tk9QRXt7ZWxzZX19WVVQe3svaWZ9fScpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnWVVQJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ1NleHByIGhlbHBlcnMnKCkge1xuICAgIHRoaXMucmVnaXN0ZXJIZWxwZXIoJ3Rlc3RpbmcnLCBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICAgIHJldHVybiBwYXJhbXNbMF0gKyAnISc7XG4gICAgfSk7XG5cbiAgICB0aGlzLnJlbmRlcignPGRpdj57e3Rlc3RpbmcgKHRlc3RpbmcgXCJoZWxsb1wiKX19PC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8ZGl2PmhlbGxvISE8L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAnVGhlIGNvbXBpbGVyIGNhbiBoYW5kbGUgbXVsdGlwbGUgaW52b2NhdGlvbnMgb2Ygc2V4cHJzJygpIHtcbiAgICB0aGlzLnJlZ2lzdGVySGVscGVyKCd0ZXN0aW5nJywgZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgICByZXR1cm4gJycgKyBwYXJhbXNbMF0gKyBwYXJhbXNbMV07XG4gICAgfSk7XG5cbiAgICB0aGlzLnJlbmRlcignPGRpdj57e3Rlc3RpbmcgKHRlc3RpbmcgXCJoZWxsb1wiIGZvbykgKHRlc3RpbmcgKHRlc3RpbmcgYmFyIFwibG9sXCIpIGJheil9fTwvZGl2PicsIHtcbiAgICAgIGZvbzogJ0ZPTycsXG4gICAgICBiYXI6ICdCQVInLFxuICAgICAgYmF6OiAnQkFaJyxcbiAgICB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+aGVsbG9GT09CQVJsb2xCQVo8L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAnVGhlIGNvbXBpbGVyIHBhc3NlcyBhbG9uZyB0aGUgaGFzaCBhcmd1bWVudHMnKCkge1xuICAgIHRoaXMucmVnaXN0ZXJIZWxwZXIoJ3Rlc3RpbmcnLCBmdW5jdGlvbihfLCBoYXNoKSB7XG4gICAgICByZXR1cm4gaGFzaFsnZmlyc3QnXSArICctJyArIGhhc2hbJ3NlY29uZCddO1xuICAgIH0pO1xuXG4gICAgdGhpcy5yZW5kZXIoJzxkaXY+e3t0ZXN0aW5nIGZpcnN0PVwib25lXCIgc2Vjb25kPVwidHdvXCJ9fTwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGRpdj5vbmUtdHdvPC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ0F0dHJpYnV0ZXMgY2FuIGJlIHBvcHVsYXRlZCB3aXRoIGhlbHBlcnMgdGhhdCBnZW5lcmF0ZSBhIHN0cmluZycoKSB7XG4gICAgdGhpcy5yZWdpc3RlckhlbHBlcigndGVzdGluZycsIGZ1bmN0aW9uKHBhcmFtcykge1xuICAgICAgcmV0dXJuIHBhcmFtc1swXTtcbiAgICB9KTtcblxuICAgIHRoaXMucmVuZGVyKCc8YSBocmVmPVwie3t0ZXN0aW5nIHVybH19XCI+bGlua3k8L2E+JywgeyB1cmw6ICdsaW5reS5odG1sJyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxhIGhyZWY9XCJsaW5reS5odG1sXCI+bGlua3k8L2E+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ0F0dHJpYnV0ZSBoZWxwZXJzIHRha2UgYSBoYXNoJygpIHtcbiAgICB0aGlzLnJlZ2lzdGVySGVscGVyKCd0ZXN0aW5nJywgZnVuY3Rpb24oXywgaGFzaCkge1xuICAgICAgcmV0dXJuIGhhc2hbJ3BhdGgnXTtcbiAgICB9KTtcblxuICAgIHRoaXMucmVuZGVyKCc8YSBocmVmPVwie3t0ZXN0aW5nIHBhdGg9dXJsfX1cIj5saW5reTwvYT4nLCB7IHVybDogJ2xpbmt5Lmh0bWwnIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGEgaHJlZj1cImxpbmt5Lmh0bWxcIj5saW5reTwvYT4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAnQXR0cmlidXRlcyBjb250YWluaW5nIG11bHRpcGxlIGhlbHBlcnMgYXJlIHRyZWF0ZWQgbGlrZSBhIGJsb2NrJygpIHtcbiAgICB0aGlzLnJlZ2lzdGVySGVscGVyKCd0ZXN0aW5nJywgZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgICByZXR1cm4gcGFyYW1zWzBdO1xuICAgIH0pO1xuXG4gICAgdGhpcy5yZW5kZXIoJzxhIGhyZWY9XCJodHRwOi8ve3tmb299fS97e3Rlc3RpbmcgYmFyfX0ve3t0ZXN0aW5nIFwiYmF6XCJ9fVwiPmxpbmt5PC9hPicsIHtcbiAgICAgIGZvbzogJ2Zvby5jb20nLFxuICAgICAgYmFyOiAnYmFyJyxcbiAgICB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxhIGhyZWY9XCJodHRwOi8vZm9vLmNvbS9iYXIvYmF6XCI+bGlua3k8L2E+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ0VsZW1lbnRzIGluc2lkZSBhIHlpZWxkZWQgYmxvY2snKCkge1xuICAgIHRoaXMucmVuZGVyKCd7eyNpZGVudGl0eX19PGRpdiBpZD1cInRlc3RcIj4xMjM8L2Rpdj57ey9pZGVudGl0eX19Jyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8ZGl2IGlkPVwidGVzdFwiPjEyMzwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdBIHNpbXBsZSBibG9jayBoZWxwZXIgY2FuIHJldHVybiB0ZXh0JygpIHtcbiAgICB0aGlzLnJlbmRlcigne3sjaWRlbnRpdHl9fXRlc3R7e2Vsc2V9fW5vdCBzaG93bnt7L2lkZW50aXR5fX0nKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJ3Rlc3QnKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAnQSBibG9jayBoZWxwZXIgY2FuIGhhdmUgYW4gZWxzZSBibG9jaycoKSB7XG4gICAgdGhpcy5yZW5kZXIoJ3t7I3JlbmRlci1lbHNlfX1Ob3Ble3tlbHNlfX08ZGl2IGlkPVwidGVzdFwiPjEyMzwvZGl2Pnt7L3JlbmRlci1lbHNlfX0nKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXYgaWQ9XCJ0ZXN0XCI+MTIzPC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG59XG5cbmNvbnN0IFhIVE1MX05BTUVTUEFDRSA9ICdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sJztcbiJdfQ==
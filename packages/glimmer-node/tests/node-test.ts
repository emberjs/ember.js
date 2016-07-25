import * as QUnit from 'qunitjs';
import * as SimpleDOM from 'simple-dom';
import { forEach } from "glimmer-util";
import { TestEnvironment, TestDynamicScope} from "glimmer-test-helpers/lib/environment";
import { Template, AttributeChangeList } from 'glimmer-runtime';
import { UpdatableReference } from 'glimmer-object-reference';
import { DOMHelper } from 'glimmer-runtime';

let HTMLSerializer = SimpleDOM.HTMLSerializer;
let voidMap = SimpleDOM.voidMap;

let serializer = new HTMLSerializer(voidMap);

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';
const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

let env: TestEnvironment, root: HTMLElement;
let helper: NodeDOMHelper;

class NodeDOMHelper extends DOMHelper {
  constructor() {
    super(new SimpleDOM.Document());
  }

  createTextNode(text: string): Text {
    return this.document.createTextNode(text);
  }

  createElement(tag: string, context?: Element): Element {
    return this.document.createElement(tag);
  }
}

function compile(template: string) {
  return env.compile(template);
}

function compilesTo(html: string, expected: string=html, context: any={}) {
  let template = compile(html);
  root = rootElement();
  render(template, context);
}

function rootElement(): HTMLDivElement {
  return env.getDOM().createElement('div', new SimpleDOM.Document().body) as HTMLDivElement;
}

function commonSetup() {
  helper = new NodeDOMHelper();
  env = new TestEnvironment(helper); // TODO: Support SimpleDOM
  root = rootElement();
}

function render(template: Template, self: any) {
  return template.render(new UpdatableReference(self), env, { appendTo: root, dynamicScope: new TestDynamicScope(null) });
}

function module(name: string) {
  return QUnit.module(name, {
    beforeEach() { commonSetup(); }
  });
}

module("Server-side rendering in Node.js");

QUnit.test("HTML text content", function(assert) {
  let template = compile("content");
  render(template, {});

  assert.equal(serializer.serializeChildren(root), 'content');
});

QUnit.test("HTML tags", function(assert) {
  let template = compile("<h1>hello!</h1><div>content</div>");
  render(template, {});

  assert.equal(serializer.serializeChildren(root), "<h1>hello!</h1><div>content</div>");
});

QUnit.test("HTML tags re-rendered", function(assert) {
  let template = compile("<h1>hello!</h1><div>content</div>");
  let result = render(template, {});

  let oldFirstChild = root.firstChild;

  env.begin();
  result.rerender();
  env.commit();

  assert.equal(serializer.serializeChildren(root), "<h1>hello!</h1><div>content</div>");
});

QUnit.test("HTML attributes", function(assert) {
  let template = compile("<div class='foo' id='bar'>content</div>");
  render(template, {});

  assert.equal(serializer.serializeChildren(root), '<div class="foo" id="bar">content</div>');
});

QUnit.test("HTML tag with empty attribute", function(assert) {
  let template = compile("<div class=''>content</div>");
  render(template, {});

  assert.equal(serializer.serializeChildren(root), "<div class>content</div>");
});

QUnit.test("HTML boolean attribute 'disabled'", function(assert) {
  let template = compile('<input disabled>');
  render(template, {});

  assert.deepEqual((root.firstChild as HTMLElement).attributes, [{
    name: 'disabled', value: '', specified: true
  }], 'disabled without value set as property is true');
});
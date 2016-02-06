import { Template, RenderResult } from "glimmer-runtime";
import { TestEnvironment, TestDynamicScope, equalTokens, stripTight } from "glimmer-test-helpers";
import { UpdatableReference, PathReference } from "glimmer-reference";
import { Opaque } from "glimmer-util";

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';
const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

/*
 * Phantom 1.9 does not serialize namespaced attributes correctly. The namespace
 * prefix is incorrectly stripped off.
 */
const serializesNSAttributesCorrectly = (function() {
  let div = document.createElement('div');
  let span = document.createElement('span');
  span.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:lang', 'en-uk');
  div.appendChild(span);
  return div.innerHTML === '<span xml:lang="en-uk"></span>';
})();

let hooks, root: Element;
let env: TestEnvironment;
let self: UpdatableReference<any>;
let result: RenderResult;

function compile(template: string) {
  return env.compile(template);
}

function rootElement() {
  return env.getDOM().createElement('div', document.body);
}

function commonSetup() {
  env = new TestEnvironment(); // TODO: Support SimpleDOM
  root = rootElement();
  root.setAttribute('debug-root', 'true');
}

function render(template: Template, context = {}, view: PathReference<Opaque> = null) {
  let options = { appendTo: root, dynamicScope: new TestDynamicScope(view) };
  self = new UpdatableReference(context);
  result = template.render(self, env, options);
  assertInvariants(result);
  return result;
}

function rerender(context: any = null) {
  if (context !== null) self.update(context);
  result.rerender();
}

QUnit.module("Updating", {
  setup: commonSetup
});

test("updating a single curly", () => {
  let object = { value: 'hello world' };
  let template = compile('<div><p>{{value}}</p></div>');
  render(template, object);
  let valueNode = root.firstChild.firstChild.firstChild;

  equalTokens(root, '<div><p>hello world</p></div>', "Initial render");

  rerender();

  equalTokens(root, '<div><p>hello world</p></div>', "no change");
  strictEqual(root.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");

  object.value = 'goodbye world';
  rerender();

  equalTokens(root, '<div><p>goodbye world</p></div>', "After updating and dirtying");
  strictEqual(root.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");
});

test("updating a single trusting curly", () => {
  let object = { value: '<p>hello world</p>' };
  let template = compile('<div>{{{value}}}</div>');
  render(template, object);
  let valueNode = root.firstChild.firstChild.firstChild;

  equalTokens(root, '<div><p>hello world</p></div>', "Initial render");

  rerender();

  equalTokens(root, '<div><p>hello world</p></div>', "no change");
  strictEqual(root.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");

  object.value = '<span>goodbye world</span>';
  rerender();

  equalTokens(root, '<div><span>goodbye world</span></div>', "After updating and dirtying");
  notStrictEqual(root.firstChild.firstChild.firstChild, valueNode, "The text node was blown away");
});

// This is to catch a regression about not caching lastValue correctly
test("Cycling between two values in a trusting curly", () => {
  let a = '<p>A</p>';
  let b = '<p>B</p>';

  let object = { value: a };
  let template = compile('<div>{{{value}}}</div>');
  render(template, object);

  equalTokens(root, '<div><p>A</p></div>', "Initial render");

  object.value = b;
  rerender();
  equalTokens(root, '<div><p>B</p></div>', "Updating");

  // Change it back
  object.value = a;
  rerender();
  equalTokens(root, '<div><p>A</p></div>', "Updating");

  // Change it back
  object.value = b;
  rerender();
  equalTokens(root, '<div><p>B</p></div>', "Updating");
});

test("dynamically scoped keywords can be passed to render, and used in curlies", assert => {
  let template = compile("{{view.name}}");
  let view = { name: 'Godfrey' };
  let viewRef = new UpdatableReference(view);

  render(template, {}, viewRef);

  equalTokens(root, 'Godfrey', "Initial render");

  rerender();

  equalTokens(root, 'Godfrey', "Noop rerender");

  view.name = 'Godhuda';
  rerender();

  equalTokens(root, 'Godhuda', "Update with mutation");

  viewRef.update({ name: 'Godfrey' });
  rerender();

  equalTokens(root, 'Godfrey', "Reset with replacement");
});

test("changing dynamic scope", assert => {
  let template = compile("{{view.name}} {{#with-keywords view=innerView}}{{view.name}}{{/with-keywords}} {{view.name}}");
  let view = { name: 'Godfrey' };
  let viewRef = new UpdatableReference(view);
  let innerView = { name: 'Yehuda' };

  render(template, { innerView }, viewRef);

  equalTokens(root, 'Godfrey Yehuda Godfrey', "Initial render");

  rerender();

  equalTokens(root, 'Godfrey Yehuda Godfrey', "Noop rerender");

  innerView.name = 'Tom';
  rerender();

  equalTokens(root, 'Godfrey Tom Godfrey', "Update with mutation");

  view.name = 'Godhuda';
  rerender();

  equalTokens(root, 'Godhuda Tom Godhuda', "Update with mutation");

  self.update({ innerView: { name: 'Yehuda' } });
  viewRef.update({ name: 'Godfrey' });
  rerender();

  equalTokens(root, 'Godfrey Yehuda Godfrey', "Reset with replacement");
});

test("changing dynamic scope derived from another keyword from the outer scope", assert => {
  let template = compile("{{view.name}} {{#with-keywords view=view.innerView}}{{view.name}}{{/with-keywords}} {{view.name}}");
  let innerView = { name: 'Yehuda' };
  let view = { name: 'Godfrey', innerView };
  let viewRef = new UpdatableReference(view);

  render(template, { innerView }, viewRef);

  equalTokens(root, 'Godfrey Yehuda Godfrey', "Initial render");

  rerender();

  equalTokens(root, 'Godfrey Yehuda Godfrey', "Noop rerender");

  innerView.name = 'Tom';
  rerender();

  equalTokens(root, 'Godfrey Tom Godfrey', "Update with mutation");

  view.name = 'Godhuda';
  rerender();

  equalTokens(root, 'Godhuda Tom Godhuda', "Update with mutation");

  viewRef.update({ name: 'Godfrey', innerView: { name: 'Yehuda' } });
  rerender();

  equalTokens(root, 'Godfrey Yehuda Godfrey', "Reset with replacement");
});

test("a simple implementation of a dirtying rerender", function() {
  let object = { condition: true, value: 'hello world' };
  let template = compile('<div>{{#if condition}}<p>{{value}}</p>{{else}}<p>Nothing</p>{{/if}}</div>');
  render(template, object);
  let valueNode = root.firstChild.firstChild.firstChild;

  equalTokens(root, '<div><p>hello world</p></div>', "Initial render");

  rerender();

  equalTokens(root, '<div><p>hello world</p></div>', "After dirtying but not updating");
  strictEqual(root.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");

  // Even though the #if was stable, a dirty child node is updated
  object.value = 'goodbye world';
  rerender();
  equalTokens(root, '<div><p>goodbye world</p></div>', "After updating and dirtying");
  strictEqual(root.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");

  object.condition = false;
  rerender();
  equalTokens(root, '<div><p>Nothing</p></div>', "And then dirtying");
  QUnit.notStrictEqual(root.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");
});

test('The if helper should consider an empty array falsy', function() {
  let object: any = { condition: [], value: 'hello world' };
  let template = compile('<div>{{#if condition}}<p>{{value}}</p>{{else}}<p>Nothing</p>{{/if}}</div>');
  render(template, object);

  equalTokens(root, '<div><p>Nothing</p></div>');

  object.condition.push('thing');
  rerender();
  equalTokens(root, '<div><p>hello world</p></div>', "Initial render");
  object.condition.pop();
  rerender();
  equalTokens(root, '<div><p>Nothing</p></div>');
});

test("a simple implementation of a dirtying rerender without inverse", function() {
  let object = { condition: true, value: 'hello world' };
  let template = compile('<div>{{#if condition}}<p>{{value}}</p>{{/if}}</div>');
  render(template, object);

  equalTokens(root, '<div><p>hello world</p></div>', "Initial render");

  object.condition = false;

  rerender();
  equalTokens(root, '<div><!----></div>', "If the condition is false, the morph becomes empty");

  object.condition = true;

  rerender();
  equalTokens(root, '<div><p>hello world</p></div>', "If the condition is true, the morph repopulates");
});

test('The unless helper without inverse', function() {
  let object: any = { condition: true, value: 'hello world' };
  let template = compile('<div>{{#unless condition}}<p>{{value}}</p>{{/unless}}</div>');
  render(template, object);

  equalTokens(root, '<div><!----></div>', "Initial render");

  object.condition = false;
  rerender();
  equalTokens(root, '<div><p>hello world</p></div>', "If the condition is false, the morph becomes populated");
  object.condition = true;
  rerender();
  equalTokens(root, '<div><!----></div>', "If the condition is true, the morph unpopulated");
});

test('The unless helper with inverse', function() {
  let object: any = { condition: true, value: 'hello world' };
  let template = compile('<div>{{#unless condition}}<p>{{value}}</p>{{else}}<p>Nothing</p>{{/unless}}</div>');

  render(template, object);

  equalTokens(root, '<div><p>Nothing</p></div>', "Initial render");

  object.condition = false;
  rerender();
  equalTokens(root, '<div><p>hello world</p></div>', "If the condition is false, the default renders");
  object.condition = true;
  rerender();
  equalTokens(root, '<div><p>Nothing</p></div>', "If the condition is true, the inverse renders");
});

test('The unless helper should consider an empty array falsy', function() {
  let object: any = { condition: [], value: 'hello world' };
  let template = compile('<div>{{#unless condition}}<p>{{value}}</p>{{else}}<p>Nothing</p>{{/unless}}</div>');

  render(template, object);

  equalTokens(root, '<div><p>hello world</p></div>', "Initial render");

  object.condition.push(1);
  rerender();
  equalTokens(root, '<div><p>Nothing</p></div>', "If the condition is true, the inverse renders");

  object.condition.pop();
  rerender();
  equalTokens(root, '<div><p>hello world</p></div>', "If the condition is false, the default renders");
});

test("a conditional that is false on the first run", assert => {
  let object = { condition: false, value: 'hello world' };
  let template = compile('<div>{{#if condition}}<p>{{value}}</p>{{/if}}</div>');
  render(template, object);

  equalTokens(root, '<div><!----></div>', "Initial render");

  object.condition = true;

  rerender();
  equalTokens(root, '<div><p>hello world</p></div>', "If the condition is true, the morph populates");

  object.condition = false;

  rerender();
  equalTokens(root, '<div><!----></div>', "If the condition is false, the morph is empty");
});

test("block arguments", assert => {
  let template = compile("<div>{{#with person.name.first as |f|}}{{f}}{{/with}}</div>");

  let object = { person: { name: { first: "Godfrey", last: "Chan" } } };
  render(template, object);

  equalTokens(root, '<div>Godfrey</div>', "Initial render");

  object.person.name.first = "Godfreak";
  rerender();

  equalTokens(root, '<div>Godfreak</div>', "After updating");
});

test("block arguments (ensure balanced push/pop)", assert => {
  let template = compile("<div>{{#with person.name.first as |f|}}{{f}}{{/with}}{{f}}</div>");

  let object = { person: { name: { first: "Godfrey", last: "Chan" } }, f: "Outer" };
  render(template, object);

  equalTokens(root, '<div>GodfreyOuter</div>', "Initial render");

  object.person.name.first = "Godfreak";
  rerender();

  equalTokens(root, '<div>GodfreakOuter</div>', "After updating");
});

test("The with helper should consider an empty array falsy", assert => {
  let object = { condition: [] };
  let template = compile("<div>{{#with condition as |c|}}{{c.length}}{{/with}}</div>");
  render(template, object);

  equalTokens(root, '<div><!----></div>', "Initial render");

  object.condition.push(1);
  rerender();

  equalTokens(root, '<div>1</div>', "After updating");
});

test("block helpers whose template has a morph at the edge", function() {
  let template = compile("{{#identity}}{{value}}{{/identity}}");
  let object = { value: "hello world" };
  render(template, object);

  equalTokens(root, 'hello world');
  let firstNode = result.firstNode();
  equal(firstNode.nodeType, 3, "the first node of the helper should be a text node");
  equal(firstNode.nodeValue, "hello world", "its content should be hello world");

  strictEqual(firstNode.nextSibling, null, "there should only be one nodes");
});

function assertInvariants(result, msg?) {
  strictEqual(result.firstNode(), root.firstChild, `The firstNode of the result is the same as the root's firstChild${msg ? ': ' + msg : ''}`);
  strictEqual(result.lastNode(), root.lastChild, `The lastNode of the result is the same as the root's lastChild${msg ? ': ' + msg : ''}`);
}

test("clean content doesn't get blown away", function() {
  let template = compile("<div>{{value}}</div>");
  let object = { value: "hello" };
  render(template, object);

  let textNode = result.firstNode().firstChild;
  equal(textNode.nodeValue, "hello");

  object.value = "goodbye";
  rerender();

  equalTokens(root, '<div>goodbye</div>');

  object.value = "hello";
  rerender();

  textNode = root.firstChild.firstChild;
  equal(textNode.nodeValue, "hello");
});

test("helper calls follow the normal dirtying rules", function() {
  env.registerHelper('capitalize', function(params) {
    return params[0].toUpperCase();
  });

  let template = compile("<div>{{capitalize value}}</div>");
  let object = { value: "hello" };
  render(template, object);

  let textNode = result.firstNode().firstChild;
  equal(textNode.nodeValue, "HELLO");

  object.value = "goodbye";
  rerender();

  equalTokens(root, '<div>GOODBYE</div>');

  rerender();

  equalTokens(root, '<div>GOODBYE</div>');

  // Checks normalized value, not raw value
  object.value = "GoOdByE";
  rerender();

  textNode = root.firstChild.firstChild;
  equal(textNode.nodeValue, "GOODBYE");
});

test("class attribute follow the normal dirtying rules", function() {
  let template = compile("<div class='{{value}}'>hello</div>");
  let object = { value: "world" };

  render(template, object);

  equalTokens(root, "<div class='world'>hello</div>", "Initial render");

  object.value = "universe";
  rerender(); // without setting the node to dirty

  equalTokens(root, "<div class='universe'>hello</div>", "Revalidating without dirtying");

  rerender();

  equalTokens(root, "<div class='universe'>hello</div>", "Revalidating after dirtying");

  object.value = "world";
  rerender();

  equalTokens(root, "<div class='world'>hello</div>", "Revalidating after dirtying");
});

test("class attribute w/ concat follow the normal dirtying rules", function() {
  let template = compile("<div class='hello {{value}}'>hello</div>");
  let object = { value: "world" };
  render(template, object);

  equalTokens(root, "<div class='hello world'>hello</div>");

  object.value = "universe";
  rerender(); // without setting the node to dirty

  equalTokens(root, "<div class='hello universe'>hello</div>");

  rerender();

  equalTokens(root, "<div class='hello universe'>hello</div>");

  object.value = "world";
  rerender();

  equalTokens(root, "<div class='hello world'>hello</div>");
});

test("attribute nodes follow the normal dirtying rules", function() {
  let template = compile("<div data-value='{{value}}'>hello</div>");
  let object = { value: "world" };

  render(template, object);

  equalTokens(root, "<div data-value='world'>hello</div>", "Initial render");

  object.value = "universe";
  rerender(); // without setting the node to dirty

  equalTokens(root, "<div data-value='universe'>hello</div>", "Revalidating without dirtying");

  rerender();

  equalTokens(root, "<div data-value='universe'>hello</div>", "Revalidating after dirtying");

  object.value = "world";
  rerender();

  equalTokens(root, "<div data-value='world'>hello</div>", "Revalidating after dirtying");
});

test("attribute nodes w/ concat follow the normal dirtying rules", function() {
  let template = compile("<div data-value='hello {{value}}'>hello</div>");
  let object = { value: "world" };
  render(template, object);

  equalTokens(root, "<div data-value='hello world'>hello</div>");

  object.value = "universe";
  rerender(); // without setting the node to dirty

  equalTokens(root, "<div data-value='hello universe'>hello</div>");

  rerender();

  equalTokens(root, "<div data-value='hello universe'>hello</div>");

  object.value = "world";
  rerender();

  equalTokens(root, "<div data-value='hello world'>hello</div>");
});

if (serializesNSAttributesCorrectly) {
test("namespaced attribute nodes follow the normal dirtying rules", function() {
  let template = compile("<div xml:lang='{{lang}}'>hello</div>");
  let object = { lang: "en-us" };

  render(template, object);

  equalTokens(root, "<div xml:lang='en-us'>hello</div>", "Initial render");

  object.lang = "en-uk";
  rerender();

  equalTokens(root, "<div xml:lang='en-uk'>hello</div>", "Revalidating without dirtying");

  rerender();

  equalTokens(root, "<div xml:lang='en-uk'>hello</div>", "Revalidating after dirtying");
});

test("namespaced attribute nodes w/ concat follow the normal dirtying rules", function() {
  let template = compile("<div xml:lang='en-{{locale}}'>hello</div>");
  let object = { locale: "us" };

  render(template, object);

  equalTokens(root, "<div xml:lang='en-us'>hello</div>", "Initial render");

  object.locale = "uk";
  rerender();

  equalTokens(root, "<div xml:lang='en-uk'>hello</div>", "Revalidating without dirtying");

  rerender();

  equalTokens(root, "<div xml:lang='en-uk'>hello</div>", "Revalidating after dirtying");
});
}

test("non-standard namespaced attribute nodes follow the normal dirtying rules", function() {
  let template = compile("<div epub:type='{{type}}'>hello</div>");
  let object = { type: "dedication" };

  render(template, object);

  equalTokens(root, "<div epub:type='dedication'>hello</div>", "Initial render");

  object.type = "backmatter";
  rerender();

  equalTokens(root, "<div epub:type='backmatter'>hello</div>", "Revalidating without dirtying");

  rerender();

  equalTokens(root, "<div epub:type='backmatter'>hello</div>", "Revalidating after dirtying");
});

test("non-standard namespaced attribute nodes w/ concat follow the normal dirtying rules", function() {
  let template = compile("<div epub:type='dedication {{type}}'>hello</div>");
  let object = { type: "backmatter" };

  render(template, object);

  equalTokens(root, "<div epub:type='dedication backmatter'>hello</div>", "Initial render");

  object.type = "index";
  rerender();

  equalTokens(root, "<div epub:type='dedication index'>hello</div>", "Revalidating without dirtying");

  rerender();

  equalTokens(root, "<div epub:type='dedication index'>hello</div>", "Revalidating after dirtying");
});

test("property nodes follow the normal dirtying rules", function() {
  let template = compile("<div foo={{value}}>hello</div>");
  let object = { value: true };

  render(template, object);

  equalTokens(root, "<div>hello</div>", "Initial render");
  strictEqual(root.firstChild['foo'], true, "Initial render");

  object.value = false;
  rerender(); // without setting the node to dirty

  equalTokens(root, "<div>hello</div>", "Revalidating without dirtying");
  strictEqual(root.firstChild['foo'], false, "Revalidating without dirtying");

  rerender();

  equalTokens(root, "<div>hello</div>", "Revalidating after dirtying");
  strictEqual(root.firstChild['foo'], false, "Revalidating after dirtying");

  object.value = true;
  rerender();

  equalTokens(root, "<div>hello</div>", "Revalidating after dirtying");
  strictEqual(root.firstChild['foo'], true, "Revalidating after dirtying");
});

test("top-level bounds are correct when swapping order", assert => {
  let template = compile("{{#each list key='key' as |item|}}{{item.name}}{{/each}}");

  let tom = { key: "1", name: "Tom Dale", "class": "tomdale" };
  let yehuda = { key: "2", name: "Yehuda Katz", "class": "wycats" };
  let object = { list: [ tom, yehuda ] };

  render(template, object);
  assertInvariants(result, "initial render");

  rerender();
  assertInvariants(result, "after no-op rerender");

  object = { list: [yehuda, tom] };
  rerender(object);
  assertInvariants(result, "after reordering");

  object = { list: [tom] };
  rerender(object);
  assertInvariants(result, "after deleting from the front");

  object = { list: [] };
  rerender(object);
  assertInvariants(result, "after emptying the list");
});

test("top-level bounds are correct when toggling conditionals", assert => {
  let template = compile("{{#if item}}{{item.name}}{{/if}}");

  let tom = { name: "Tom Dale" };
  let yehuda = { name: "Yehuda Katz" };
  let object = { item: tom };

  render(template, object);
  assertInvariants(result, "initial render");

  rerender();
  assertInvariants(result, "after no-op rerender");

  object = { item: yehuda };
  rerender(object);
  assertInvariants(result, "after replacement");

  object = { item: null };
  rerender(object);
  assertInvariants(result, "after nulling");
});

test("top-level bounds are correct when changing innerHTML", assert => {
  let template = compile("{{{html}}}");

  let object = { html: "<b>inner</b>-<b>before</b>" };

  render(template, object);
  assertInvariants(result, "initial render");

  rerender();
  assertInvariants(result, "after no-op rerender");

  object = { html: "<p>inner-after</p>" };
  rerender(object);
  assertInvariants(result, "after replacement");

  object = { html: "" };
  rerender(object);
  assertInvariants(result, "after emptying");
});

testEachHelper(
  "An implementation of #each using block params",
  "<ul>{{#each list key='key' as |item|}}<li class='{{item.class}}'>{{item.name}}</li>{{/each}}</ul>"
);

testEachHelper(
  "An implementation of #each using a self binding",
  "<ul>{{#each list}}<li class={{class}}>{{name}}</li>{{/each}}</ul>",
  QUnit.skip
);

function testEachHelper(testName, templateSource, testMethod=QUnit.test) {
  testMethod(testName, function() {
    let template = compile(templateSource);
    let tom = { key: "1", name: "Tom Dale", "class": "tomdale" };
    let yehuda = { key: "2", name: "Yehuda Katz", "class": "wycats" };
    let object = { list: [ tom, yehuda ] };

    render(template, object);

    let itemNode = getItemNode('tomdale');
    let nameNode = getNameNode('tomdale');

    equalTokens(root, "<ul><li class='tomdale'>Tom Dale</li><li class='wycats'>Yehuda Katz</li></ul>", "Initial render");

    rerender();
    assertStableNodes('tomdale', "after no-op rerender");
    equalTokens(root, "<ul><li class='tomdale'>Tom Dale</li><li class='wycats'>Yehuda Katz</li></ul>", "After no-op re-render");

    rerender();
    assertStableNodes('tomdale', "after non-dirty rerender");
    equalTokens(root, "<ul><li class='tomdale'>Tom Dale</li><li class='wycats'>Yehuda Katz</li></ul>", "After no-op re-render");

    object = { list: [yehuda, tom] };
    rerender(object);
    assertStableNodes('tomdale', "after changing the list order");
    equalTokens(root, "<ul><li class='wycats'>Yehuda Katz</li><li class='tomdale'>Tom Dale</li></ul>", "After changing the list order");

    object = { list: [
      { key: "1", name: "Martin Muñoz", "class": "mmun" },
      { key: "2", name: "Kris Selden", "class": "krisselden" }
    ]};
    rerender(object);
    assertStableNodes('mmun', "after changing the list entries, but with stable keys");
    equalTokens(
      root,
      `<ul><li class='mmun'>Martin Muñoz</li><li class='krisselden'>Kris Selden</li></ul>`,
      `After changing the list entries, but with stable keys`
    );

    object = { list: [
      { key: "1", name: "Martin Muñoz", "class": "mmun" },
      { key: "2", name: "Kristoph Selden", "class": "krisselden" },
      { key: "3", name: "Matthew Beale", "class": "mixonic" }
    ]};

    rerender(object);
    assertStableNodes('mmun', "after adding an additional entry");
    equalTokens(
      root,
      stripTight`<ul><li class='mmun'>Martin Muñoz</li><li class='krisselden'>Kristoph Selden</li>
        <li class='mixonic'>Matthew Beale</li></ul>`,
      `After adding an additional entry`
    );

    object = { list: [
      { key: "1", name: "Martin Muñoz", "class": "mmun" },
      { key: "3", name: "Matthew Beale", "class": "mixonic" }
    ]};

    rerender(object);
    assertStableNodes('mmun', "after removing the middle entry");
    equalTokens(root, "<ul><li class='mmun'>Martin Muñoz</li><li class='mixonic'>Matthew Beale</li></ul>", "after removing the middle entry");

    object = { list: [
      { key: "1", name: "Martin Muñoz", "class": "mmun" },
      { key: "4", name: "Stefan Penner", "class": "stefanpenner" },
      { key: "5", name: "Robert Jackson", "class": "rwjblue" }
    ]};

    rerender(object);
    assertStableNodes('mmun', "after adding two more entries");
    equalTokens(
      root,
      stripTight`<ul><li class='mmun'>Martin Muñoz</li><li class='stefanpenner'>Stefan Penner</li>
        <li class='rwjblue'>Robert Jackson</li></ul>`,
      `After adding two more entries`
    );

    // New node for stability check
    itemNode = getItemNode('rwjblue');
    nameNode = getNameNode('rwjblue');

    object = { list: [
      { key: "5", name: "Robert Jackson", "class": "rwjblue" }
    ]};

    rerender(object);
    assertStableNodes('rwjblue', "after removing two entries");
    equalTokens(root, "<ul><li class='rwjblue'>Robert Jackson</li></ul>", "After removing two entries");

    object = { list: [
      { key: "1", name: "Martin Muñoz", "class": "mmun" },
      { key: "4", name: "Stefan Penner", "class": "stefanpenner" },
      { key: "5", name: "Robert Jackson", "class": "rwjblue" }
    ]};

    rerender(object);
    assertStableNodes('rwjblue', "after adding back entries");
    equalTokens(
      root,
      stripTight`<ul><li class='mmun'>Martin Muñoz</li><li class='stefanpenner'>Stefan Penner</li>
        <li class='rwjblue'>Robert Jackson</li></ul>`,
      `After adding back entries`
    );

    // New node for stability check
    itemNode = getItemNode('mmun');
    nameNode = getNameNode('mmun');

    object = { list: [
      { key: "1", name: "Martin Muñoz", "class": "mmun" }
    ]};

    rerender(object);
    assertStableNodes('mmun', "after removing from the back");
    equalTokens(root, "<ul><li class='mmun'>Martin Muñoz</li></ul>", "After removing from the back");

    object = { list: [] };

    rerender(object);
    strictEqual(root.firstChild.firstChild.nodeType, 8, "there are no li's after removing the remaining entry");
    equalTokens(root, "<ul><!----></ul>", "After removing the remaining entries");

    function assertStableNodes(className, message) {
      strictEqual(getItemNode(className), itemNode, "The item node has not changed " + message);
      strictEqual(getNameNode(className), nameNode, "The name node has not changed " + message);
    }

    function getItemNode(className) {
      // <li>
      let itemNode = root.firstChild.firstChild;

      while (itemNode && itemNode['getAttribute']) {
        if (itemNode['getAttribute']('class') === className) { break; }
        itemNode = itemNode.nextSibling;
      }

      ok(itemNode, "Expected node with class='" + className + "'");
      return itemNode;
    }

    function getNameNode(className) {
      // {{item.name}}
      let itemNode = getItemNode(className);
      ok(itemNode, "Expected child node of node with class='" + className + "', but no parent node found");

      let childNode = itemNode && itemNode.firstChild;
      ok(childNode, "Expected child node of node with class='" + className + "', but not child node found");

      return childNode;
    }
  });
}

let destroyedRenderNodeCount;
let destroyedRenderNode;

QUnit.module("HTML-based compiler (dirtying) - pruning", {
  setup: function() {
    commonSetup();
    destroyedRenderNodeCount = 0;
    destroyedRenderNode = null;

    hooks.destroyRenderNode = function(renderNode) {
      destroyedRenderNode = renderNode;
      destroyedRenderNodeCount++;
    };
  }
});

QUnit.skip("Pruned render nodes invoke a cleanup hook when replaced", function() {
  let object = { condition: true, value: 'hello world', falsy: "Nothing" };
  let template = compile('<div>{{#if condition}}<p>{{value}}</p>{{else}}<p>{{falsy}}</p>{{/if}}</div>');

  render(template, object);

  equalTokens(root, "<div><p>hello world</p></div>");

  object.condition = false;
  rerender();

  strictEqual(destroyedRenderNodeCount, 1, "cleanup hook was invoked once");
  strictEqual(destroyedRenderNode.lastValue, 'hello world', "The correct render node is passed in");

  object.condition = true;
  rerender();

  strictEqual(destroyedRenderNodeCount, 2, "cleanup hook was invoked again");
  strictEqual(destroyedRenderNode.lastValue, 'Nothing', "The correct render node is passed in");
});

QUnit.skip("MorphLists in childMorphs are properly cleared", function() {
  let object = {
    condition: true,
    falsy: "Nothing",
    list: [
      { key: "1", word: 'Hello' },
      { key: "2", word: 'World' }
    ]
  };
  let template = compile('<div>{{#if condition}}{{#each list as |item|}}<p>{{item.word}}</p>{{/each}}{{else}}<p>{{falsy}}</p>{{/if}}</div>');

  render(template, object);

  equalTokens(root, "<div><p>Hello</p><p>World</p></div>");

  object.condition = false;
  rerender();

  equalTokens(root, "<div><p>Nothing</p></div>");

  strictEqual(destroyedRenderNodeCount, 5, "cleanup hook was invoked for each morph");

  object.condition = true;
  rerender();

  strictEqual(destroyedRenderNodeCount, 6, "cleanup hook was invoked again");
});

QUnit.skip("Pruned render nodes invoke a cleanup hook when cleared", function() {
  let object = { condition: true, value: 'hello world' };
  let template = compile('<div>{{#if condition}}<p>{{value}}</p>{{/if}}</div>');

  render(template, object);

  equalTokens(root, "<div><p>hello world</p></div>");

  object.condition = false;
  rerender();

  strictEqual(destroyedRenderNodeCount, 1, "cleanup hook was invoked once");
  strictEqual(destroyedRenderNode.lastValue, 'hello world', "The correct render node is passed in");

  object.condition = true;
  rerender();

  strictEqual(destroyedRenderNodeCount, 1, "cleanup hook was not invoked again");
});

QUnit.skip("Pruned lists invoke a cleanup hook when removing elements", function() {
  let object = { list: [{ key: "1", word: "hello" }, { key: "2", word: "world" }] };
  let template = compile('<div>{{#each list as |item|}}<p>{{item.word}}</p>{{/each}}</div>');

  render(template, object);

  equalTokens(root, "<div><p>hello</p><p>world</p></div>");

  object.list.pop();
  rerender();

  strictEqual(destroyedRenderNodeCount, 2, "cleanup hook was invoked once for the wrapper morph and once for the {{item.word}}");
  strictEqual(destroyedRenderNode.lastValue, "world", "The correct render node is passed in");

  object.list.pop();
  rerender();

  strictEqual(destroyedRenderNodeCount, 4, "cleanup hook was invoked once for the wrapper morph and once for the {{item.word}}");
  strictEqual(destroyedRenderNode.lastValue, "hello", "The correct render node is passed in");
});

QUnit.skip("Pruned lists invoke a cleanup hook on their subtrees when removing elements", function() {
  let object = { list: [{ key: "1", word: "hello" }, { key: "2", word: "world" }] };
  let template = compile('<div>{{#each list as |item|}}<p>{{#if item.word}}{{item.word}}{{/if}}</p>{{/each}}</div>');

  render(template, object);

  equalTokens(root, "<div><p>hello</p><p>world</p></div>");

  object.list.pop();
  rerender();

  strictEqual(destroyedRenderNodeCount, 3, "cleanup hook was invoked once for the wrapper morph and once for the {{item.word}}");
  strictEqual(destroyedRenderNode.lastValue, "world", "The correct render node is passed in");

  object.list.pop();
  rerender();

  strictEqual(destroyedRenderNodeCount, 6, "cleanup hook was invoked once for the wrapper morph and once for the {{item.word}}");
  strictEqual(destroyedRenderNode.lastValue, "hello", "The correct render node is passed in");
});

QUnit.module("Updating SVG", {
  setup: commonSetup
});

test("HTML namespace from root element is continued to child templates", () => {
  let object = { hasCircle: true };
  let getSvg = () => root.firstChild;
  let getCircle = () => getSvg().firstChild;
  let template = compile('<svg>{{#if hasCircle}}<circle />{{/if}}</svg>');
  render(template, object);

  equalTokens(root, "<svg><circle /></svg>");
  equal(getSvg().namespaceURI, SVG_NAMESPACE);
  equal(getCircle().namespaceURI, SVG_NAMESPACE);

  rerender();

  equalTokens(root, "<svg><circle /></svg>");
  equal(getSvg().namespaceURI, SVG_NAMESPACE);
  equal(getCircle().namespaceURI, SVG_NAMESPACE);

  object.hasCircle = false;
  rerender();

  equalTokens(root, "<svg><!----></svg>");

  rerender({ hasCircle: true });

  equalTokens(root, "<svg><circle /></svg>");
  equal(getSvg().namespaceURI, SVG_NAMESPACE);
  equal(getCircle().namespaceURI, SVG_NAMESPACE);
});

test("root <foreignObject> tag is SVG namespaced",  () => {
  let object = { hasForeignObject: true };
  let getForeignObject = () => root.firstChild;
  let getDiv = () => getForeignObject().firstChild;
  let template = compile('{{#if hasForeignObject}}<foreignObject><div></div></foreignObject>{{/if}}');
  // Add an SVG node on the root that can be rendered into
  root.appendChild(env.getDOM().createElement('svg', document.body));
  root = root.firstChild as Element;

  render(template, object);

  equalTokens(root.parentNode, "<svg><foreignObject><div></div></foreignObject></svg>");
  equal(getForeignObject().namespaceURI, SVG_NAMESPACE);
  equal(getDiv().namespaceURI, XHTML_NAMESPACE);

  rerender();

  equalTokens(root.parentNode, "<svg><foreignObject><div></div></foreignObject></svg>");
  equal(getForeignObject().namespaceURI, SVG_NAMESPACE);
  equal(getDiv().namespaceURI, XHTML_NAMESPACE);

  object.hasForeignObject = false;
  rerender();

  equalTokens(root.parentNode, "<svg><!----></svg>");

  rerender({ hasForeignObject: true });

  equalTokens(root.parentNode, "<svg><foreignObject><div></div></foreignObject></svg>");
  equal(getForeignObject().namespaceURI, SVG_NAMESPACE);
  equal(getDiv().namespaceURI, XHTML_NAMESPACE);
});

test("elements nested inside <foreignObject> have an XHTML namespace", function() {
  let object = { hasDiv: true };
  let getSvg = () => root.firstChild;
  let getForeignObject = () => getSvg().firstChild;
  let getDiv = () => getForeignObject().firstChild;
  let template = compile('<svg><foreignObject>{{#if hasDiv}}<div></div>{{/if}}</foreignObject></svg>');
  render(template, object);

  equalTokens(root, "<svg><foreignObject><div></div></foreignObject></svg>");
  equal(getSvg().namespaceURI, SVG_NAMESPACE);
  equal(getForeignObject().namespaceURI, SVG_NAMESPACE);
  equal(getDiv().namespaceURI, XHTML_NAMESPACE);

  rerender();

  equalTokens(root, "<svg><foreignObject><div></div></foreignObject></svg>");
  equal(getSvg().namespaceURI, SVG_NAMESPACE);
  equal(getForeignObject().namespaceURI, SVG_NAMESPACE);
  equal(getDiv().namespaceURI, XHTML_NAMESPACE);

  object.hasDiv = false;
  rerender();

  equalTokens(root, "<svg><foreignObject><!----></foreignObject></svg>");

  rerender({ hasDiv: true });

  equalTokens(root, "<svg><foreignObject><div></div></foreignObject></svg>");
  equal(getSvg().namespaceURI, SVG_NAMESPACE);
  equal(getForeignObject().namespaceURI, SVG_NAMESPACE);
  equal(getDiv().namespaceURI, XHTML_NAMESPACE);
});

test("Namespaced attribute with a quoted expression", function() {
  let title = 'svg-title';
  let context = { title };
  let getSvg = () => root.firstChild;
  let getXlinkAttr = () => getSvg().attributes[0];
  let template = compile('<svg xlink:title="{{title}}">content</svg>');
  render(template, context);

  equalTokens(root, `<svg xlink:title="${title}">content</svg>`);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);
  equal(getXlinkAttr().namespaceURI, XLINK_NAMESPACE);

  rerender();

  equalTokens(root, `<svg xlink:title="${title}">content</svg>`);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);
  equal(getXlinkAttr().namespaceURI, XLINK_NAMESPACE);

  context.title = 'mmun';
  rerender();

  equalTokens(root, `<svg xlink:title="${context.title}">content</svg>`);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);
  equal(getXlinkAttr().namespaceURI, XLINK_NAMESPACE);

  rerender({ title });

  equalTokens(root, `<svg xlink:title="${title}">content</svg>`);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);
  equal(getXlinkAttr().namespaceURI, XLINK_NAMESPACE);
});

test("<svg> tag and expression as sibling" function() {
  let name = 'svg-title';
  let context = { name };
  let getSvg = () => root.firstChild;
  let template = compile('<svg></svg>{{name}}');
  render(template, context);

  equalTokens(root, `<svg></svg>${name}`);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);

  rerender();

  equalTokens(root, `<svg></svg>${name}`);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);

  context.name = null;
  rerender();

  equalTokens(root, `<svg></svg>`);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);

  rerender({name});

  equalTokens(root, `<svg></svg>${name}`);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);
});

test("<svg> tag and unsafe expression as sibling" function() {
  let name = '<i>Biff</i>';
  let context = { name };
  let getSvg = () => root.firstChild;
  let getItalic = () => root.lastChild;
  let template = compile('<svg></svg>{{{name}}}');
  render(template, context);

  equalTokens(root, `<svg></svg>${name}`);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);
  equal(getItalic().namespaceURI, XHTML_NAMESPACE);

  rerender();

  equalTokens(root, `<svg></svg>${name}`);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);
  equal(getItalic().namespaceURI, XHTML_NAMESPACE);

  context.name = 'ef4';
  rerender();

  equalTokens(root, `<svg></svg>${context.name}`);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);

  rerender({name});

  equalTokens(root, `<svg></svg>${name}`);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);
  equal(getItalic().namespaceURI, XHTML_NAMESPACE);
});

test("unsafe expression nested inside a namespace" function() {
  let content = '<path></path>';
  let context = { content };
  let getSvg = () => root.firstChild;
  let getPath = () => getSvg().firstChild;
  let getDiv = () => root.lastChild;
  let template = compile('<svg>{{{content}}}</svg><div></div>');
  render(template, context);

  equalTokens(root, `<svg>${content}</svg><div></div>`);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);
  equal(getDiv().namespaceURI, XHTML_NAMESPACE);
  equal(getPath().namespaceURI, SVG_NAMESPACE, 'initial render path has SVG namespace');

  rerender();

  equalTokens(root, `<svg>${content}</svg><div></div>`);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);
  equal(getDiv().namespaceURI, XHTML_NAMESPACE);
  equal(getPath().namespaceURI, SVG_NAMESPACE, 'path has SVG namespace');

  context.content = '<foreignObject><span></span></foreignObject>';
  rerender();

  equalTokens(root, `<svg>${context.content}</svg><div></div>`);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);
  equal(getDiv().namespaceURI, XHTML_NAMESPACE);
  equal(getSvg().firstChild.namespaceURI, SVG_NAMESPACE, 'foreignObject has SVG NS');
  equal(getSvg().firstChild.firstChild.namespaceURI, XHTML_NAMESPACE, 'span has XHTML NS');

  rerender({content});

  equalTokens(root, `<svg>${content}</svg><div></div>`);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);
  equal(getDiv().namespaceURI, XHTML_NAMESPACE);
  equal(getPath().namespaceURI, SVG_NAMESPACE);
});

test("expression nested inside a namespace" function() {
  let content = 'Milly';
  let context = { content };
  let getDiv = () => root.firstChild;
  let getSvg = () => getDiv().firstChild;
  let template = compile('<div><svg>{{content}}</svg></div>');
  render(template, context);

  equalTokens(root, `<div><svg>${content}</svg></div>`);
  equal(getDiv().namespaceURI, XHTML_NAMESPACE);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);

  rerender();

  equalTokens(root, `<div><svg>${content}</svg></div>`);
  equal(getDiv().namespaceURI, XHTML_NAMESPACE);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);

  context.content = 'Moe';
  rerender();

  equalTokens(root, `<div><svg>${context.content}</svg></div>`);
  equal(getDiv().namespaceURI, XHTML_NAMESPACE);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);

  rerender({content});

  equalTokens(root, `<div><svg>${content}</svg></div>`);
  equal(getDiv().namespaceURI, XHTML_NAMESPACE);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);
});

test("expression nested inside a namespaced root element" function() {
  let content = 'Maurice';
  let context = { content };
  let getSvg = () => root.firstChild;
  let template = compile('<svg>{{content}}</svg>');
  render(template, context);

  equalTokens(root, `<svg>${content}</svg>`);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);

  rerender();

  equalTokens(root, `<svg>${content}</svg>`);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);

  context.content = null;
  rerender();

  equal(getSvg().tagName, 'svg');
  ok(getSvg().firstChild.textContent === '');
  equal(getSvg().namespaceURI, SVG_NAMESPACE);

  rerender({content});

  equalTokens(root, `<svg>${content}</svg>`);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);
});

test("HTML namespace is created in child templates" function() {
  let isTrue = true;
  let context = { isTrue };
  let template = compile('{{#if isTrue}}<svg></svg>{{else}}<div><svg></svg></div>{{/if}}');
  render(template, context);

  equalTokens(root, `<svg></svg>`);
  equal(root.firstChild.namespaceURI, SVG_NAMESPACE);

  rerender();

  equalTokens(root, `<svg></svg>`);
  equal(root.firstChild.namespaceURI, SVG_NAMESPACE);

  context.isTrue = false;
  rerender();

  equalTokens(root, `<div><svg></svg></div>`);
  equal(root.firstChild.namespaceURI, XHTML_NAMESPACE);
  equal(root.firstChild.firstChild.namespaceURI, SVG_NAMESPACE);

  rerender({isTrue});

  equalTokens(root, `<svg></svg>`);
  equal(root.firstChild.namespaceURI, SVG_NAMESPACE);
});

test("HTML namespace is continued to child templates" function() {
  let isTrue = true;
  let context = { isTrue };
  let getDiv = () => root.firstChild;
  let getSvg = () => getDiv().firstChild;
  let template = compile('<div><svg>{{#if isTrue}}<circle />{{/if}}</svg></div>');
  render(template, context);

  equalTokens(root, `<div><svg><circle /></svg></div>`);
  equal(getDiv().namespaceURI, XHTML_NAMESPACE);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);
  equal(getSvg().firstChild.namespaceURI, SVG_NAMESPACE);

  rerender();

  equalTokens(root, `<div><svg><circle /></svg></div>`);
  equal(getDiv().namespaceURI, XHTML_NAMESPACE);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);
  equal(getSvg().firstChild.namespaceURI, SVG_NAMESPACE);

  context.isTrue = false;
  rerender();

  equalTokens(root, `<div><svg><!----></svg></div>`);
  equal(getDiv().namespaceURI, XHTML_NAMESPACE);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);

  rerender({isTrue});

  equalTokens(root, `<div><svg><circle /></svg></div>`);
  equal(getDiv().namespaceURI, XHTML_NAMESPACE);
  equal(getSvg().namespaceURI, SVG_NAMESPACE);
  equal(getSvg().firstChild.namespaceURI, SVG_NAMESPACE);
});

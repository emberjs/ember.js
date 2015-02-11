import { compile } from "../htmlbars-compiler/compiler";
import defaultHooks from "../htmlbars-runtime/hooks";
import { merge } from "../htmlbars-util/object-utils";
import DOMHelper from "../dom-helper";
import { equalTokens } from "../htmlbars-test-helpers";

var hooks, helpers, partials, env;

function registerHelper(name, callback) {
  helpers[name] = callback;
}

function commonSetup() {
  hooks = merge({}, defaultHooks);
  helpers = {};
  partials = {};

  env = {
    dom: new DOMHelper(),
    hooks: hooks,
    helpers: helpers,
    partials: partials,
    useFragmentCache: true
  };
}

QUnit.module("HTML-based compiler (dirtying)", {
  beforeEach: commonSetup
});

test("a simple implementation of a dirtying rerender", function() {
  registerHelper('if', function(params, hash, options) {
    if (!!params[0]) {
      return options.template.yield();
    } else {
      return options.inverse.yield();
    }
  });

  var object = { condition: true, value: 'hello world' };
  var template = compile('<div>{{#if condition}}<p>{{value}}</p>{{else}}<p>Nothing</p>{{/if}}</div>');
  var result = template.render(object, env);
  var valueNode = result.fragment.firstChild.firstChild.firstChild;

  equalTokens(result.fragment, '<div><p>hello world</p></div>', "Initial render");

  result.dirty();
  result.revalidate();

  equalTokens(result.fragment, '<div><p>hello world</p></div>', "After dirtying but not updating");
  strictEqual(result.fragment.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");

  // Even though the #if was stable, a dirty child node is updated
  object.value = 'goodbye world';
  result.dirty();
  result.revalidate();
  equalTokens(result.fragment, '<div><p>goodbye world</p></div>', "After updating and dirtying");
  strictEqual(result.fragment.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");

  // Should not update since render node is not marked as dirty
  object.condition = false;
  result.revalidate();
  equalTokens(result.fragment, '<div><p>goodbye world</p></div>', "After flipping the condition but not dirtying");
  strictEqual(result.fragment.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");

  result.dirty();
  result.revalidate();
  equalTokens(result.fragment, '<div><p>Nothing</p></div>', "And then dirtying");
  QUnit.notStrictEqual(result.fragment.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");
});

test("a dirtying rerender using `withLayout`", function() {
  var component = compile("<p>{{yield}}</p>");
  var template = compile("<div><simple-component>{{title}}</simple-component></div>");

  registerHelper("simple-component", function() {
    return this.withLayout(component);
  });

  var object = { title: "Hello world" };
  var result = template.render(object, env);

  var valueNode = getValueNode();
  equalTokens(result.fragment, '<div><p>Hello world</p></div>');

  result.dirty();
  result.revalidate();

  equalTokens(result.fragment, '<div><p>Hello world</p></div>');
  strictEqual(getValueNode(), valueNode);

  object.title = "Goodbye world";

  result.dirty();
  result.revalidate();
  equalTokens(result.fragment, '<div><p>Goodbye world</p></div>');
  strictEqual(getValueNode(), valueNode);

  function getValueNode() {
    return result.fragment.firstChild.firstChild.firstChild;
  }
});

test("a dirtying rerender using `withLayout` and self", function() {
  var component = compile("<p><span>{{attrs.name}}</span>{{yield}}</p>");
  var template = compile("<div><simple-component name='Yo! '>{{title}}</simple-component></div>");

  registerHelper("simple-component", function(params, hash) {
    return this.withLayout(component, { attrs: hash });
  });

  var object = { title: "Hello world" };
  var result = template.render(object, env);

  var nameNode = getNameNode();
  var titleNode = getTitleNode();
  equalTokens(result.fragment, '<div><p><span>Yo! </span>Hello world</p></div>');

  rerender();
  equalTokens(result.fragment, '<div><p><span>Yo! </span>Hello world</p></div>');
  assertStableNodes();

  object.title = "Goodbye world";

  rerender();
  equalTokens(result.fragment, '<div><p><span>Yo! </span>Goodbye world</p></div>');
  assertStableNodes();

  function rerender() {
    result.dirty();
    result.revalidate();
  }

  function assertStableNodes() {
    strictEqual(getNameNode(), nameNode);
    strictEqual(getTitleNode(), titleNode);
  }

  function getNameNode() {
    return result.fragment.firstChild.firstChild.firstChild.firstChild;
  }

  function getTitleNode() {
    return result.fragment.firstChild.firstChild.firstChild.nextSibling;
  }
});

test("a dirtying rerender using `withLayout`, self and block args", function() {
  var component = compile("<p>{{yield attrs.name}}</p>");
  var template = compile("<div><simple-component name='Yo! ' as |key|><span>{{key}}</span>{{title}}</simple-component></div>");

  registerHelper("simple-component", function(params, hash) {
    return this.withLayout(component, { attrs: hash });
  });

  var object = { title: "Hello world" };
  var result = template.render(object, env);

  var nameNode = getNameNode();
  var titleNode = getTitleNode();
  equalTokens(result.fragment, '<div><p><span>Yo! </span>Hello world</p></div>');

  rerender();
  equalTokens(result.fragment, '<div><p><span>Yo! </span>Hello world</p></div>');
  assertStableNodes();

  object.title = "Goodbye world";

  rerender();
  equalTokens(result.fragment, '<div><p><span>Yo! </span>Goodbye world</p></div>');
  assertStableNodes();

  function rerender() {
    result.dirty();
    result.revalidate();
  }

  function assertStableNodes() {
    strictEqual(getNameNode(), nameNode);
    strictEqual(getTitleNode(), titleNode);
  }

  function getNameNode() {
    return result.fragment.firstChild.firstChild.firstChild.firstChild;
  }

  function getTitleNode() {
    return result.fragment.firstChild.firstChild.firstChild.nextSibling;
  }
});

test("block helpers whose template has a morph at the edge", function() {
  registerHelper('id', function(params, hash, options) {
    return options.template.yield();
  });

  var template = compile("{{#id}}{{value}}{{/id}}");
  var object = { value: "hello world" };
  var result = template.render(object, env);

  equalTokens(result.fragment, 'hello world');
  var firstNode = result.root.firstNode;
  equal(firstNode.nodeType, 3, "first node of the parent template");
  equal(firstNode.textContent, "", "its content should be empty");

  var secondNode = firstNode.nextSibling;
  equal(secondNode.nodeType, 3, "first node of the helper template should be a text node");
  equal(secondNode.textContent, "", "its content should be empty");

  var textContent = secondNode.nextSibling;
  equal(textContent.nodeType, 3, "second node of the helper should be a text node");
  equal(textContent.textContent, "hello world", "its content should be hello world");

  var fourthNode = textContent.nextSibling;
  equal(fourthNode.nodeType, 3, "last node of the helper should be a text node");
  equal(fourthNode.textContent, "", "its content should be empty");

  var lastNode = fourthNode.nextSibling;
  equal(lastNode.nodeType, 3, "last node of the parent template should be a text node");
  equal(lastNode.textContent, "", "its content should be empty");

  strictEqual(lastNode.nextSibling, null, "there should only be five nodes");
});

test("clean content doesn't get blown away", function() {
  var template = compile("<div>{{value}}</div>");
  var object = { value: "hello" };
  var result = template.render(object, env);

  var textNode = result.fragment.firstChild.firstChild;
  equal(textNode.textContent, "hello");

  object.value = "goodbye";
  result.revalidate(); // without setting the node to dirty

  equalTokens(result.fragment, '<div>hello</div>');

  var textRenderNode = result.root.childNodes[0];

  textRenderNode.setContent = function() {
    ok(false, "Should not get called");
  };

  object.value = "hello";
  result.dirty();
  result.revalidate();
});

test("helper calls follow the normal dirtying rules", function() {
  registerHelper('capitalize', function(params) {
    return params[0].toUpperCase();
  });

  var template = compile("<div>{{capitalize value}}</div>");
  var object = { value: "hello" };
  var result = template.render(object, env);

  var textNode = result.fragment.firstChild.firstChild;
  equal(textNode.textContent, "HELLO");

  object.value = "goodbye";
  result.revalidate(); // without setting the node to dirty

  equalTokens(result.fragment, '<div>HELLO</div>');

  var textRenderNode = result.root.childNodes[0];

  result.dirty();
  result.revalidate();

  equalTokens(result.fragment, '<div>GOODBYE</div>');

  textRenderNode.setContent = function() {
    ok(false, "Should not get called");
  };

  // Checks normalized value, not raw value
  object.value = "GoOdByE";
  result.dirty();
  result.revalidate();
});

test("attribute nodes follow the normal dirtying rules", function() {
  var template = compile("<div class={{value}}>hello</div>");
  var object = { value: "world" };
  var result = template.render(object, env);

  equalTokens(result.fragment, "<div class='world'>hello</div>", "Initial render");

  object.value = "universe";
  result.revalidate(); // without setting the node to dirty

  equalTokens(result.fragment, "<div class='world'>hello</div>", "Revalidating without dirtying");

  var attrRenderNode = result.root.childNodes[0];

  result.dirty();
  result.revalidate();

  equalTokens(result.fragment, "<div class='universe'>hello</div>", "Revalidating after dirtying");

  attrRenderNode.setContent = function() {
    ok(false, "Should not get called");
  };

  object.value = "universe";
  result.dirty();
  result.revalidate();
});

test("attribute nodes w/ concat follow the normal dirtying rules", function() {
  var template = compile("<div class='hello {{value}}'>hello</div>");
  var object = { value: "world" };
  var result = template.render(object, env);

  equalTokens(result.fragment, "<div class='hello world'>hello</div>");

  object.value = "universe";
  result.revalidate(); // without setting the node to dirty

  equalTokens(result.fragment, "<div class='hello world'>hello</div>");

  var attrRenderNode = result.root.childNodes[0];

  result.dirty();
  result.revalidate();

  equalTokens(result.fragment, "<div class='hello universe'>hello</div>");

  attrRenderNode.setContent = function() {
    ok(false, "Should not get called");
  };

  object.value = "universe";
  result.dirty();
  result.revalidate();
});

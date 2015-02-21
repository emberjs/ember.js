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

  registerHelper('if', function(params, hash, options) {
    if (!!params[0]) {
      return options.template.yield();
    } else if (options.inverse.yield) {
      return options.inverse.yield();
    }
  });

  registerHelper('each', function(params) {
    var list = params[0];

    for (var i=0, l=list.length; i<l; i++) {
      var item = list[i];
      this.yieldItem(item.key, [item]);
    }
  });

}

QUnit.module("HTML-based compiler (dirtying)", {
  beforeEach: commonSetup
});

test("a simple implementation of a dirtying rerender", function() {
  var object = { condition: true, value: 'hello world' };
  var template = compile('<div>{{#if condition}}<p>{{value}}</p>{{else}}<p>Nothing</p>{{/if}}</div>');
  var result = template.render(object, env);
  var valueNode = result.fragment.firstChild.firstChild.firstChild;

  equalTokens(result.fragment, '<div><p>hello world</p></div>', "Initial render");

  result.rerender();

  equalTokens(result.fragment, '<div><p>hello world</p></div>', "After dirtying but not updating");
  strictEqual(result.fragment.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");

  // Even though the #if was stable, a dirty child node is updated
  object.value = 'goodbye world';
  result.rerender();
  equalTokens(result.fragment, '<div><p>goodbye world</p></div>', "After updating and dirtying");
  strictEqual(result.fragment.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");

  // Should not update since render node is not marked as dirty
  object.condition = false;
  result.revalidate();
  equalTokens(result.fragment, '<div><p>goodbye world</p></div>', "After flipping the condition but not dirtying");
  strictEqual(result.fragment.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");

  result.rerender();
  equalTokens(result.fragment, '<div><p>Nothing</p></div>', "And then dirtying");
  QUnit.notStrictEqual(result.fragment.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");
});

test("a simple implementation of a dirtying rerender without inverse", function() {
  var object = { condition: true, value: 'hello world' };
  var template = compile('<div>{{#if condition}}<p>{{value}}</p>{{/if}}</div>');
  var result = template.render(object, env);

  equalTokens(result.fragment, '<div><p>hello world</p></div>', "Initial render");

  // Should not update since render node is not marked as dirty
  object.condition = false;

  result.rerender();
  equalTokens(result.fragment, '<div><!----></div>', "If the condition is false, the morph becomes empty");

  object.condition = true;

  result.rerender();
  equalTokens(result.fragment, '<div><p>hello world</p></div>', "If the condition is false, the morph becomes empty");
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

  result.rerender();

  equalTokens(result.fragment, '<div><p>Hello world</p></div>');
  strictEqual(getValueNode(), valueNode);

  object.title = "Goodbye world";

  result.rerender();
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
    result.rerender();
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
    result.rerender();
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
  result.rerender();
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

  result.rerender();

  equalTokens(result.fragment, '<div>GOODBYE</div>');

  textRenderNode.setContent = function() {
    ok(false, "Should not get called");
  };

  // Checks normalized value, not raw value
  object.value = "GoOdByE";
  result.rerender();
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

  result.rerender();

  equalTokens(result.fragment, "<div class='universe'>hello</div>", "Revalidating after dirtying");

  attrRenderNode.setContent = function() {
    ok(false, "Should not get called");
  };

  object.value = "universe";
  result.rerender();
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

  result.rerender();

  equalTokens(result.fragment, "<div class='hello universe'>hello</div>");

  attrRenderNode.setContent = function() {
    ok(false, "Should not get called");
  };

  object.value = "universe";
  result.rerender();
});

test("An implementation of #each", function() {
  var template = compile("<ul>{{#each list as |item|}}<li class={{item.class}}>{{item.name}}</li>{{/each}}</ul>");
  var object = { list: [
    { key: "1", name: "Tom Dale", "class": "tomdale" },
    { key: "2", name: "Yehuda Katz", "class": "wycats" }
  ]};
  var result = template.render(object, env);

  var itemNode = getItemNode('tomdale');
  var nameNode = getNameNode('tomdale');

  equalTokens(result.fragment, "<ul><li class='tomdale'>Tom Dale</li><li class='wycats'>Yehuda Katz</li></ul>", "Initial render");

  rerender();
  assertStableNodes('tomdale', "after no-op rerender");
  equalTokens(result.fragment, "<ul><li class='tomdale'>Tom Dale</li><li class='wycats'>Yehuda Katz</li></ul>", "After no-op re-render");

  result.revalidate();
  assertStableNodes('tomdale', "after non-dirty rerender");
  equalTokens(result.fragment, "<ul><li class='tomdale'>Tom Dale</li><li class='wycats'>Yehuda Katz</li></ul>", "After no-op re-render");

  object = { list: [object.list[1], object.list[0]] };
  rerender(object);
  assertStableNodes('tomdale', "after changing the list order");
  equalTokens(result.fragment, "<ul><li class='wycats'>Yehuda Katz</li><li class='tomdale'>Tom Dale</li></ul>", "After changing the list order");

  object = { list: [
    { key: "1", name: "Martin Muñoz", "class": "mmun" },
    { key: "2", name: "Kris Selden", "class": "krisselden" }
  ]};
  rerender(object);
  assertStableNodes('mmun', "after changing the list entries, but with stable keys");
  equalTokens(result.fragment, "<ul><li class='mmun'>Martin Muñoz</li><li class='krisselden'>Kris Selden</li></ul>", "After changing the list entries, but with stable keys");

  object = { list: [
    { key: "1", name: "Martin Muñoz", "class": "mmun" },
    { key: "2", name: "Kristoph Selden", "class": "krisselden" },
    { key: "3", name: "Matthew Beale", "class": "mixonic" }
  ]};

  rerender(object);
  assertStableNodes('mmun', "after adding an additional entry");
  equalTokens(result.fragment, "<ul><li class='mmun'>Martin Muñoz</li><li class='krisselden'>Kristoph Selden</li><li class='mixonic'>Matthew Beale</li></ul>", "After adding an additional entry");

  object = { list: [
    { key: "1", name: "Martin Muñoz", "class": "mmun" },
    { key: "3", name: "Matthew Beale", "class": "mixonic" }
  ]};

  rerender(object);
  assertStableNodes('mmun', "after removing the middle entry");
  equalTokens(result.fragment, "<ul><li class='mmun'>Martin Muñoz</li><li class='mixonic'>Matthew Beale</li></ul>", "After adding an additional entry");

  object = { list: [
    { key: "1", name: "Martin Muñoz", "class": "mmun" },
    { key: "4", name: "Stefan Penner", "class": "stefanpenner" },
    { key: "5", name: "Robert Jackson", "class": "rwjblue" },
  ]};

  rerender(object);
  assertStableNodes('mmun', "after adding two more entries");
  equalTokens(result.fragment, "<ul><li class='mmun'>Martin Muñoz</li><li class='stefanpenner'>Stefan Penner</li><li class='rwjblue'>Robert Jackson</li></ul>", "After adding two more entries");

  // New node for stability check
  itemNode = getItemNode('rwjblue');
  nameNode = getNameNode('rwjblue');

  object = { list: [
    { key: "5", name: "Robert Jackson", "class": "rwjblue" }
  ]};

  rerender(object);
  assertStableNodes('rwjblue', "after removing two entries");
  equalTokens(result.fragment, "<ul><li class='rwjblue'>Robert Jackson</li></ul>", "After removing two entries");

  object = { list: [
    { key: "1", name: "Martin Muñoz", "class": "mmun" },
    { key: "4", name: "Stefan Penner", "class": "stefanpenner" },
    { key: "5", name: "Robert Jackson", "class": "rwjblue" },
  ]};

  rerender(object);
  assertStableNodes('rwjblue', "after adding back entries");
  equalTokens(result.fragment, "<ul><li class='mmun'>Martin Muñoz</li><li class='stefanpenner'>Stefan Penner</li><li class='rwjblue'>Robert Jackson</li></ul>", "After adding back entries");

  // New node for stability check
  itemNode = getItemNode('mmun');
  nameNode = getNameNode('mmun');

  object = { list: [
    { key: "1", name: "Martin Muñoz", "class": "mmun" },
  ]};

  rerender(object);
  assertStableNodes('mmun', "after removing from the back");
  equalTokens(result.fragment, "<ul><li class='mmun'>Martin Muñoz</li></ul>", "After removing from the back");

  object = { list: [] };

  rerender(object);
  strictEqual(result.fragment.firstChild.firstChild.nodeType, 8, "there are no li's after removing the remaining entry");
  equalTokens(result.fragment, "<ul><!----></ul>", "After removing the remaining entries");

  function rerender(context) {
    result.rerender(context);
  }

  function assertStableNodes(className, message) {
    strictEqual(getItemNode(className), itemNode, "The item node has not changed " + message);
    strictEqual(getNameNode(className), nameNode, "The name node has not changed " + message);
  }

  function getItemNode(className) {
    // <li>
    var itemNode = result.fragment.firstChild.firstChild;

    while (itemNode) {
      if (itemNode.getAttribute('class') === className) { break; }
      itemNode = itemNode.nextSibling;
    }

    ok(itemNode, "Expected node with class='" + className + "'");
    return itemNode;
  }

  function getNameNode(className) {
    // {{item.name}}
    var itemNode = getItemNode(className);
    ok(itemNode, "Expected child node of node with class='" + className + "', but no parent node found");

    var childNode = itemNode && itemNode.firstChild;
    ok(childNode, "Expected child node of node with class='" + className + "', but not child node found");

    return childNode;
  }
});

test("Returning true from `linkRenderNodes` makes the value itself stable across renders", function() {
  var streams = { hello: { value: "hello" }, world: { value: "world" } };

  hooks.linkRenderNode = function() {
    return true;
  };

  hooks.getValue = function(stream) {
    return stream();
  };

  var concatCalled = 0;
  hooks.concat = function(env, params) {
    ok(++concatCalled === 1, "The concat hook is only invoked one time (invoked " + concatCalled + " times)");
    return function() {
      return params[0].value + params[1] + params[2].value;
    };
  };

  var template = compile("<div class='{{hello}} {{world}}'></div>");
  var result = template.render(streams, env);

  equalTokens(result.fragment, "<div class='hello world'></div>");

  streams.hello.value = "goodbye";

  result.rerender();

  equalTokens(result.fragment, "<div class='goodbye world'></div>");
});

var cleanedUpCount;
var cleanedUpNode;

QUnit.module("HTML-based compiler (dirtying) - pruning", {
  beforeEach: function() {
    commonSetup();
    cleanedUpCount = 0;
    cleanedUpNode = null;

    hooks.cleanup = function(renderNode) {
      cleanedUpNode = renderNode;
      cleanedUpCount++;
    };
  }
});

test("Pruned render nodes invoke a cleanup hook when replaced", function() {
  var object = { condition: true, value: 'hello world', falsy: "Nothing" };
  var template = compile('<div>{{#if condition}}<p>{{value}}</p>{{else}}<p>{{falsy}}</p>{{/if}}</div>');

  var result = template.render(object, env);

  equalTokens(result.fragment, "<div><p>hello world</p></div>");

  object.condition = false;
  result.rerender();

  strictEqual(cleanedUpCount, 1, "cleanup hook was invoked once");
  strictEqual(cleanedUpNode.lastValue, 'hello world', "The correct render node is passed in");

  object.condition = true;
  result.rerender();

  strictEqual(cleanedUpCount, 2, "cleanup hook was invoked again");
  strictEqual(cleanedUpNode.lastValue, 'Nothing', "The correct render node is passed in");
});

test("Pruned render nodes invoke a cleanup hook when cleared", function() {
  var object = { condition: true, value: 'hello world' };
  var template = compile('<div>{{#if condition}}<p>{{value}}</p>{{/if}}</div>');

  var result = template.render(object, env);

  equalTokens(result.fragment, "<div><p>hello world</p></div>");

  object.condition = false;
  result.rerender();

  strictEqual(cleanedUpCount, 1, "cleanup hook was invoked once");
  strictEqual(cleanedUpNode.lastValue, 'hello world', "The correct render node is passed in");

  object.condition = true;
  result.rerender();

  strictEqual(cleanedUpCount, 1, "cleanup hook was not invoked again");
});

test("Pruned lists invoke a cleanup hook when removing elements", function() {
  var object = { list: [{ key: "1", word: "hello" }, { key: "2", word: "world" }] };
  var template = compile('<div>{{#each list as |item|}}<p>{{item.word}}</p>{{/each}}</div>');

  var result = template.render(object, env);

  equalTokens(result.fragment, "<div><p>hello</p><p>world</p></div>");

  object.list.pop();
  result.rerender();

  strictEqual(cleanedUpCount, 2, "cleanup hook was invoked once for the wrapper morph and once for the {{item.word}}");
  strictEqual(cleanedUpNode.lastValue, "world", "The correct render node is passed in");

  object.list.pop();
  result.rerender();

  strictEqual(cleanedUpCount, 4, "cleanup hook was invoked once for the wrapper morph and once for the {{item.word}}");
  strictEqual(cleanedUpNode.lastValue, "hello", "The correct render node is passed in");
});

test("Pruned lists invoke a cleanup hook on their subtrees when removing elements", function() {
  var object = { list: [{ key: "1", word: "hello" }, { key: "2", word: "world" }] };
  var template = compile('<div>{{#each list as |item|}}<p>{{#if item.word}}{{item.word}}{{/if}}</p>{{/each}}</div>');

  var result = template.render(object, env);

  equalTokens(result.fragment, "<div><p>hello</p><p>world</p></div>");

  object.list.pop();
  result.rerender();

  strictEqual(cleanedUpCount, 3, "cleanup hook was invoked once for the wrapper morph and once for the {{item.word}}");
  strictEqual(cleanedUpNode.lastValue, "world", "The correct render node is passed in");

  object.list.pop();
  result.rerender();

  strictEqual(cleanedUpCount, 6, "cleanup hook was invoked once for the wrapper morph and once for the {{item.word}}");
  strictEqual(cleanedUpNode.lastValue, "hello", "The correct render node is passed in");
});

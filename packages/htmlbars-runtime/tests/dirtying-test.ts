import { compile } from "htmlbars-compiler";
import { manualElement, DOMHelper } from "htmlbars-runtime";
import { equalTokens } from "htmlbars-test-helpers";
import { TestEnvironment, TestBaseReference } from "./support";

var hooks, env, dom, root;

function rootElement() {
  return dom.createElement('div');
}

function commonSetup() {
  dom = new DOMHelper();
  env = new TestEnvironment({ dom, BaseReference: TestBaseReference });
  root = rootElement();

  env.registerHelper('if', function(params, hash, options) {
    if (!!params[0]) {
      return options.template.yield();
    } else if (options.inverse) {
      return options.inverse.yield();
    }
  });

  env.registerHelper('each', function(params) {
    var list = params[0];

    for (var i=0, l=list.length; i<l; i++) {
      var item = list[i];
      if (this.arity > 0) {
        this.yieldItem(item.key, [item]);
      } else {
        this.yieldItem(item.key, undefined, item);
      }
    }
  });

}

function render(template, context={}) {
  return template.render(context, env, { appendTo: root });
}

QUnit.module("HTML-based compiler (dirtying)", {
  beforeEach: commonSetup
});

test("a simple implementation of a dirtying rerender", function() {
  var object = { condition: true, value: 'hello world' };
  var template = compile('<div>{{#if condition}}<p>{{value}}</p>{{else}}<p>Nothing</p>{{/if}}</div>');
  var result = render(template, object);
  var valueNode = root.firstChild.firstChild.firstChild;

  equalTokens(root, '<div><p>hello world</p></div>', "Initial render");

  result.rerender();

  equalTokens(root, '<div><p>hello world</p></div>', "After dirtying but not updating");
  strictEqual(root.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");

  // Even though the #if was stable, a dirty child node is updated
  object.value = 'goodbye world';
  result.rerender();
  equalTokens(root, '<div><p>goodbye world</p></div>', "After updating and dirtying");
  strictEqual(root.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");

  object.condition = false;
  result.rerender();
  equalTokens(root, '<div><p>Nothing</p></div>', "And then dirtying");
  QUnit.notStrictEqual(root.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");
});

test("a simple implementation of a dirtying rerender without inverse", function() {
  var object = { condition: true, value: 'hello world' };
  var template = compile('<div>{{#if condition}}<p>{{value}}</p>{{/if}}</div>');
  var result = render(template, object);

  equalTokens(root, '<div><p>hello world</p></div>', "Initial render");

  object.condition = false;

  result.rerender();
  equalTokens(root, '<div><!----></div>', "If the condition is false, the morph becomes empty");

  object.condition = true;

  result.rerender();
  equalTokens(root, '<div><p>hello world</p></div>', "If the condition is true, the morph repopulates");
});

test("block helpers whose template has a morph at the edge", function() {
  env.registerHelper('id', function(params, hash, options) {
    return options.template.yield();
  });

  var template = compile("{{#id}}{{value}}{{/id}}");
  var object = { value: "hello world" };
  let result = render(template, object);

  equalTokens(root, 'hello world');
  var firstNode = result.root.firstNode;
  equal(firstNode.nodeType, 3, "the first node of the helper should be a text node");
  equal(firstNode.nodeValue, "hello world", "its content should be hello world");

  strictEqual(firstNode.nextSibling, null, "there should only be one nodes");
});

test("clean content doesn't get blown away", function() {
  var template = compile("<div>{{value}}</div>");
  var object = { value: "hello" };
  var result = render(template, object);

  var textNode = root.firstChild.firstChild;
  equal(textNode.nodeValue, "hello");

  object.value = "goodbye";
  result.revalidate(); // without setting the node to dirty

  equalTokens(root, '<div>hello</div>');

  object.value = "hello";
  result.rerender();

  textNode = root.firstChild.firstChild;
  equal(textNode.nodeValue, "hello");
});

test("helper calls follow the normal dirtying rules", function() {
  env.registerHelper('capitalize', function(params) {
    return params[0].toUpperCase();
  });

  var template = compile("<div>{{capitalize value}}</div>");
  var object = { value: "hello" };
  var result = render(template, object);

  var textNode = root.firstChild.firstChild;
  equal(textNode.nodeValue, "HELLO");

  object.value = "goodbye";
  result.revalidate(); // without setting the node to dirty

  equalTokens(root, '<div>HELLO</div>');

  result.rerender();

  equalTokens(root, '<div>GOODBYE</div>');

  // Checks normalized value, not raw value
  object.value = "GoOdByE";
  result.rerender();

  textNode = root.firstChild.firstChild;
  equal(textNode.nodeValue, "GOODBYE");
});

test("attribute nodes follow the normal dirtying rules", function() {
  var template = compile("<div class={{value}}>hello</div>");
  var object = { value: "world" };

  var result = render(template, object);

  equalTokens(root, "<div class='world'>hello</div>", "Initial render");

  object.value = "universe";
  result.revalidate(); // without setting the node to dirty

  equalTokens(root, "<div class='world'>hello</div>", "Revalidating without dirtying");

  var attrRenderNode = result.root.childMorphs[0];

  result.rerender();

  equalTokens(root, "<div class='universe'>hello</div>", "Revalidating after dirtying");

  attrRenderNode.setContent = function() {
    ok(false, "Should not get called");
  };

  object.value = "universe";
  result.rerender();

  equalTokens(root, "<div class='universe'>hello</div>", "Revalidating after dirtying");
});

test("attribute nodes w/ concat follow the normal dirtying rules", function() {
  var template = compile("<div class='hello {{value}}'>hello</div>");
  var object = { value: "world" };
  var result = render(template, object);

  equalTokens(root, "<div class='hello world'>hello</div>");

  object.value = "universe";
  result.revalidate(); // without setting the node to dirty

  equalTokens(root, "<div class='hello world'>hello</div>");

  var attrRenderNode = result.root.childMorphs[0];

  result.rerender();

  equalTokens(root, "<div class='hello universe'>hello</div>");

  attrRenderNode.setContent = function() {
    ok(false, "Should not get called");
  };

  object.value = "universe";
  result.rerender();
});

testEachHelper(
  "An implementation of #each using block params",
  "<ul>{{#each list as |item|}}<li class={{item.class}}>{{item.name}}</li>{{/each}}</ul>"
);

testEachHelper(
  "An implementation of #each using a self binding",
  "<ul>{{#each list}}<li class={{class}}>{{name}}</li>{{/each}}</ul>"
);

function testEachHelper(testName, templateSource) {
  test(testName, function() {
    var template = compile(templateSource);
    var object = { list: [
      { key: "1", name: "Tom Dale", "class": "tomdale" },
      { key: "2", name: "Yehuda Katz", "class": "wycats" }
    ]};
    var result = render(template, object);

    var itemNode = getItemNode('tomdale');
    var nameNode = getNameNode('tomdale');

    equalTokens(root, "<ul><li class='tomdale'>Tom Dale</li><li class='wycats'>Yehuda Katz</li></ul>", "Initial render");

    rerender();
    assertStableNodes('tomdale', "after no-op rerender");
    equalTokens(root, "<ul><li class='tomdale'>Tom Dale</li><li class='wycats'>Yehuda Katz</li></ul>", "After no-op re-render");

    result.revalidate();
    assertStableNodes('tomdale', "after non-dirty rerender");
    equalTokens(root, "<ul><li class='tomdale'>Tom Dale</li><li class='wycats'>Yehuda Katz</li></ul>", "After no-op re-render");

    object = { list: [object.list[1], object.list[0]] };
    rerender(object);
    assertStableNodes('tomdale', "after changing the list order");
    equalTokens(root, "<ul><li class='wycats'>Yehuda Katz</li><li class='tomdale'>Tom Dale</li></ul>", "After changing the list order");

    object = { list: [
      { key: "1", name: "Martin Muñoz", "class": "mmun" },
      { key: "2", name: "Kris Selden", "class": "krisselden" }
    ]};
    rerender(object);
    assertStableNodes('mmun', "after changing the list entries, but with stable keys");
    equalTokens(root, "<ul><li class='mmun'>Martin Muñoz</li><li class='krisselden'>Kris Selden</li></ul>", "After changing the list entries, but with stable keys");

    object = { list: [
      { key: "1", name: "Martin Muñoz", "class": "mmun" },
      { key: "2", name: "Kristoph Selden", "class": "krisselden" },
      { key: "3", name: "Matthew Beale", "class": "mixonic" }
    ]};

    rerender(object);
    assertStableNodes('mmun', "after adding an additional entry");
    equalTokens(root, "<ul><li class='mmun'>Martin Muñoz</li><li class='krisselden'>Kristoph Selden</li><li class='mixonic'>Matthew Beale</li></ul>", "After adding an additional entry");

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
    equalTokens(root, "<ul><li class='mmun'>Martin Muñoz</li><li class='stefanpenner'>Stefan Penner</li><li class='rwjblue'>Robert Jackson</li></ul>", "After adding two more entries");

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
    equalTokens(root, "<ul><li class='mmun'>Martin Muñoz</li><li class='stefanpenner'>Stefan Penner</li><li class='rwjblue'>Robert Jackson</li></ul>", "After adding back entries");

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

    function rerender(context) {
      result.rerender(env, context);
    }

    function assertStableNodes(className, message) {
      strictEqual(getItemNode(className), itemNode, "The item node has not changed " + message);
      strictEqual(getNameNode(className), nameNode, "The name node has not changed " + message);
    }

    function getItemNode(className) {
      // <li>
      var itemNode = root.firstChild.firstChild;

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
}

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
  var result = render(template, streams);

  equalTokens(root, "<div class='hello world'></div>");

  streams.hello.value = "goodbye";

  result.rerender();

  equalTokens(root, "<div class='goodbye world'></div>");
});

var destroyedRenderNodeCount;
var destroyedRenderNode;

QUnit.module("HTML-based compiler (dirtying) - pruning", {
  beforeEach: function() {
    commonSetup();
    destroyedRenderNodeCount = 0;
    destroyedRenderNode = null;

    hooks.destroyRenderNode = function(renderNode) {
      destroyedRenderNode = renderNode;
      destroyedRenderNodeCount++;
    };
  }
});

test("Pruned render nodes invoke a cleanup hook when replaced", function() {
  var object = { condition: true, value: 'hello world', falsy: "Nothing" };
  var template = compile('<div>{{#if condition}}<p>{{value}}</p>{{else}}<p>{{falsy}}</p>{{/if}}</div>');

  var result = render(template, object);

  equalTokens(root, "<div><p>hello world</p></div>");

  object.condition = false;
  result.rerender();

  strictEqual(destroyedRenderNodeCount, 1, "cleanup hook was invoked once");
  strictEqual(destroyedRenderNode.lastValue, 'hello world', "The correct render node is passed in");

  object.condition = true;
  result.rerender();

  strictEqual(destroyedRenderNodeCount, 2, "cleanup hook was invoked again");
  strictEqual(destroyedRenderNode.lastValue, 'Nothing', "The correct render node is passed in");
});

test("MorphLists in childMorphs are properly cleared", function() {
  var object = {
    condition: true,
    falsy: "Nothing",
    list: [
      { key: "1", word: 'Hello' },
      { key: "2", word: 'World' }
    ]
  };
  var template = compile('<div>{{#if condition}}{{#each list as |item|}}<p>{{item.word}}</p>{{/each}}{{else}}<p>{{falsy}}</p>{{/if}}</div>');

  var result = render(template, object);

  equalTokens(root, "<div><p>Hello</p><p>World</p></div>");

  object.condition = false;
  result.rerender();

  equalTokens(root, "<div><p>Nothing</p></div>");

  strictEqual(destroyedRenderNodeCount, 5, "cleanup hook was invoked for each morph");

  object.condition = true;
  result.rerender();

  strictEqual(destroyedRenderNodeCount, 6, "cleanup hook was invoked again");
});

test("Pruned render nodes invoke a cleanup hook when cleared", function() {
  var object = { condition: true, value: 'hello world' };
  var template = compile('<div>{{#if condition}}<p>{{value}}</p>{{/if}}</div>');

  var result = render(template, object);

  equalTokens(root, "<div><p>hello world</p></div>");

  object.condition = false;
  result.rerender();

  strictEqual(destroyedRenderNodeCount, 1, "cleanup hook was invoked once");
  strictEqual(destroyedRenderNode.lastValue, 'hello world', "The correct render node is passed in");

  object.condition = true;
  result.rerender();

  strictEqual(destroyedRenderNodeCount, 1, "cleanup hook was not invoked again");
});

test("Pruned lists invoke a cleanup hook when removing elements", function() {
  var object = { list: [{ key: "1", word: "hello" }, { key: "2", word: "world" }] };
  var template = compile('<div>{{#each list as |item|}}<p>{{item.word}}</p>{{/each}}</div>');

  var result = render(template, object);

  equalTokens(root, "<div><p>hello</p><p>world</p></div>");

  object.list.pop();
  result.rerender();

  strictEqual(destroyedRenderNodeCount, 2, "cleanup hook was invoked once for the wrapper morph and once for the {{item.word}}");
  strictEqual(destroyedRenderNode.lastValue, "world", "The correct render node is passed in");

  object.list.pop();
  result.rerender();

  strictEqual(destroyedRenderNodeCount, 4, "cleanup hook was invoked once for the wrapper morph and once for the {{item.word}}");
  strictEqual(destroyedRenderNode.lastValue, "hello", "The correct render node is passed in");
});

test("Pruned lists invoke a cleanup hook on their subtrees when removing elements", function() {
  var object = { list: [{ key: "1", word: "hello" }, { key: "2", word: "world" }] };
  var template = compile('<div>{{#each list as |item|}}<p>{{#if item.word}}{{item.word}}{{/if}}</p>{{/each}}</div>');

  var result = render(template, object);

  equalTokens(root, "<div><p>hello</p><p>world</p></div>");

  object.list.pop();
  result.rerender();

  strictEqual(destroyedRenderNodeCount, 3, "cleanup hook was invoked once for the wrapper morph and once for the {{item.word}}");
  strictEqual(destroyedRenderNode.lastValue, "world", "The correct render node is passed in");

  object.list.pop();
  result.rerender();

  strictEqual(destroyedRenderNodeCount, 6, "cleanup hook was invoked once for the wrapper morph and once for the {{item.word}}");
  strictEqual(destroyedRenderNode.lastValue, "hello", "The correct render node is passed in");
});

QUnit.module("Manual elements", {
  beforeEach: commonSetup
});

QUnit.skip("Setting up a manual element renders and revalidates", function() {
  hooks.keywords['manual-element'] = {
    render: function(morph, env, scope, params, hash, template, inverse, visitor) {
      var attributes = {
        title: "Tom Dale",
        href: ['concat', ['http://tomdale.', ['get', 'tld']]],
        'data-bar': ['get', 'bar']
      };

      var layout = manualElement('span', attributes);

      hostBlock(morph, env, scope, template, inverse, null, visitor, function(options) {
        options.templates.template.yieldIn({ raw: layout }, hash);
      });

      manualElement(env, scope, 'span', attributes, morph);
    },

    isStable: function() { return true; }
  };

  var template = compile("{{#manual-element bar='baz' tld='net'}}Hello {{world}}!{{/manual-element}}");
  render(template, { world: "world" });

  equalTokens(root, "<span title='Tom Dale' href='http://tomdale.net' data-bar='baz'>Hello world!</span>");
});

test("It is possible to nest multiple templates into a manual element", function() {
  hooks.keywords['manual-element'] = {
    render: function(morph, env, scope, params, hash, template, inverse, visitor) {
      var attributes = {
        title: "Tom Dale",
        href: ['concat', ['http://tomdale.', ['get', 'tld']]],
        'data-bar': ['get', 'bar']
      };

      var elementTemplate = manualElement('span', attributes);

      var contentBlock = blockFor(template, { scope: scope });

      var layoutBlock = blockFor(layout.raw, {
        yieldTo: contentBlock,
        self: { attrs: hash },
      });

      var elementBlock = blockFor(elementTemplate, {
        yieldTo: layoutBlock,
        self: hash
      });

      elementBlock.invoke(env, null, undefined, morph, null, visitor);
    },

    isStable: function() { return true; }
  };

  var layout = compile("<em>{{attrs.foo}}. {{yield}}</em>");
  var template = compile("{{#manual-element foo='foo' bar='baz' tld='net'}}Hello {{world}}!{{/manual-element}}");
  render(template, { world: "world" });

  equalTokens(root, "<span title='Tom Dale' href='http://tomdale.net' data-bar='baz'><em>foo. Hello world!</em></span>");
});

test("The invoke helper hook can instruct the runtime to link the result", function() {
  let invokeCount = 0;

  env.hooks.invokeHelper = function(morph, env, scope, visitor, params, hash, helper) {
    invokeCount++;
    return { value: helper(params, hash), link: true };
  };

  env.registerHelper('double', function([input]) {
    return input * 2;
  });

  let template = compile("{{double 12}}");
  let result = render(template, {});

  equalTokens(root, "24");
  equal(invokeCount, 1);

  result.rerender();

  equalTokens(root, "24");
  equal(invokeCount, 1);
});

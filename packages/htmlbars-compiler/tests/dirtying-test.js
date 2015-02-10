import { compile } from "../htmlbars-compiler/compiler";
import defaultHooks from "../htmlbars-runtime/hooks";
import defaultHelpers from "../htmlbars-runtime/helpers";
import { merge } from "../htmlbars-util/object-utils";
import DOMHelper from "../dom-helper";
import { equalTokens } from "../htmlbars-test-helpers";

var hooks, helpers, partials, env;

function registerHelper(name, callback) {
  helpers[name] = callback;
}

function commonSetup() {
  hooks = merge({}, defaultHooks);
  helpers = merge({}, defaultHelpers);
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
  var makeNodeDirty;

  // This represents the internals of a higher-level helper API
  registerHelper('if', function(params, hash, options) {
    var renderNode = options.renderNode;

    makeNodeDirty = function() {
      renderNode.isDirty = true;
    };

    var state = renderNode.state;
    var value = params[0];
    var normalized = !!value;

    // If the node is unstable
    if (state.condition !== normalized) {
      state.condition = normalized;

      if (normalized) {
        return options.template.render(this);
      } else {
        return options.inverse.render(this);
      }
    }
  });

  var object = { condition: true, value: 'hello world' };
  var template = compile('<div>{{#if condition}}<p>{{value}}</p>{{else}}<p>Nothing</p>{{/if}}</div>');
  var result = template.render(object, env);

  equalTokens(result.fragment, '<div><p>hello world</p></div>');

  makeNodeDirty();
  result.revalidate();

  equalTokens(result.fragment, '<div><p>hello world</p></div>');

  // Even though the #if was stable, a dirty child node is updated
  object.value = 'goodbye world';
  var textRenderNode = result.root.childNodes[0].childNodes[0];
  textRenderNode.isDirty = true;
  result.revalidate();
  equalTokens(result.fragment, '<div><p>goodbye world</p></div>');

  // Should not update since render node is not marked as dirty
  object.condition = false;
  result.revalidate();
  equalTokens(result.fragment, '<div><p>goodbye world</p></div>');

  makeNodeDirty();
  result.revalidate();
  equalTokens(result.fragment, '<div><p>Nothing</p></div>');
});

test("block helpers whose template has a morph at the edge", function() {
  registerHelper('id', function(params, hash, options) {
    return options.template.render(this);
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
  textRenderNode.isDirty = true;
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

  textRenderNode.isDirty = true;
  result.revalidate();

  equalTokens(result.fragment, '<div>GOODBYE</div>');

  textRenderNode.setContent = function() {
    ok(false, "Should not get called");
  };

  // Checks normalized value, not raw value
  object.value = "GoOdByE";
  textRenderNode.isDirty = true;
  result.revalidate();
});

test("attribute nodes follow the normal dirtying rules", function() {
  var template = compile("<div class={{value}}>hello</div>");
  var object = { value: "world" };
  var result = template.render(object, env);

  equalTokens(result.fragment, "<div class='world'>hello</div>");

  object.value = "universe";
  result.revalidate(); // without setting the node to dirty

  equalTokens(result.fragment, "<div class='world'>hello</div>");

  var attrRenderNode = result.root.childNodes[0];

  attrRenderNode.isDirty = true;
  result.revalidate();

  equalTokens(result.fragment, "<div class='universe'>hello</div>");

  attrRenderNode.setContent = function() {
    ok(false, "Should not get called");
  };

  object.value = "universe";
  attrRenderNode.isDirty = true;
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

  attrRenderNode.isDirty = true;
  result.revalidate();

  equalTokens(result.fragment, "<div class='hello universe'>hello</div>");

  attrRenderNode.setContent = function() {
    ok(false, "Should not get called");
  };

  object.value = "universe";
  attrRenderNode.isDirty = true;
  result.revalidate();
});

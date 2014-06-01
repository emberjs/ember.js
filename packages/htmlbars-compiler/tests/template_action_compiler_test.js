import { preprocess } from "htmlbars-compiler/parser";
import TemplateActionCompiler from "htmlbars-compiler/compiler/template_action";

function actionsEqual(input, expectedActions) {
  var ast = preprocess(input);

  var templateActionCompiler = new TemplateActionCompiler();
  var actualActions = templateActionCompiler.compile(ast);

  // Remove the AST node reference from the actions to keep tests leaner
  for (var i = 0; i < actualActions.length; i++) {
    actualActions[i][1].shift();
  }

  deepEqual(actualActions, expectedActions);
}

module("TemplateActionCompiler");

test("empty", function() {
  var input = "";
  actionsEqual(input, [
    ['startTemplate', [0]],
    ['endTemplate', []]
  ]);
});

test("basic", function() {
  var input = "foo{{bar}}<div></div>";
  actionsEqual(input, [
    ['startTemplate', [0]],
    ['text', [0, 3]],
    ['mustache', [1, 3]],
    ['openElement', [2, 3, 0]],
    ['closeElement', [2, 3]],
    ['endTemplate', []]
  ]);
});

test("nested HTML", function() {
  var input = "<a></a><a><a><a></a></a></a>";
  actionsEqual(input, [
    ['startTemplate', [0]],
    ['openElement', [0, 2, 0]],
    ['closeElement', [0, 2]],
    ['openElement', [1, 2, 0]],
    ['openElement', [0, 1, 0]],
    ['openElement', [0, 1, 0]],
    ['closeElement', [0, 1]],
    ['closeElement', [0, 1]],
    ['closeElement', [1, 2]],
    ['endTemplate', []]
  ]);
});

test("mustaches are counted correctly", function() {
  var input = "<a><a>{{foo}}</a><a {{foo}}><a>{{foo}}</a><a>{{foo}}</a></a></a>";
  actionsEqual(input, [
    ['startTemplate', [0]],
    ['openElement', [0, 1, 2]],
    ['openElement', [0, 2, 1]],
    ['mustache', [0, 1]],
    ['closeElement', [0, 2]],
    ['openElement', [1, 2, 3]],
    ['openElement', [0, 2, 1]],
    ['mustache', [0, 1]],
    ['closeElement', [0, 2]],
    ['openElement', [1, 2, 1]],
    ['mustache', [0, 1]],
    ['closeElement', [1, 2]],
    ['closeElement', [1, 2]],
    ['closeElement', [0, 1]],
    ['endTemplate', []]
  ]);
});

test("empty block", function() {
  var input = "{{#a}}{{/a}}";
  actionsEqual(input, [
    ['startTemplate', [0]],
    ['endTemplate', []],
    ['startTemplate', [1]],
    ['text', [0, 3]],
    ['block', [1, 3]],
    ['text', [2, 3]],
    ['endTemplate', []]
  ]);
});

test("block with inverse", function() {
  var input = "{{#a}}b{{^}}{{/a}}";
  actionsEqual(input, [
    ['startTemplate', [0]],
    ['endTemplate', []],
    ['startTemplate', [0]],
    ['text', [0, 1]],
    ['endTemplate', []],
    ['startTemplate', [2]],
    ['text', [0, 3]],
    ['block', [1, 3]],
    ['text', [2, 3]],
    ['endTemplate', []]
  ]);
});

test("nested blocks", function() {
  var input = "{{#a}}{{#a}}<b></b>{{/a}}{{#a}}{{b}}{{/a}}{{/a}}{{#a}}b{{/a}}";
  actionsEqual(input, [
    ['startTemplate', [0]],
    ['text', [0, 1]],
    ['endTemplate', []],
    ['startTemplate', [0]],
    ['text', [0, 3]],
    ['mustache', [1, 3]],
    ['text', [2, 3]],
    ['endTemplate', []],
    ['startTemplate', [0]],
    ['openElement', [0, 1, 0]],
    ['closeElement', [0, 1]],
    ['endTemplate', []],
    ['startTemplate', [2]],
    ['text', [0, 5]],
    ['block', [1, 5]],
    ['text', [2, 5]],
    ['block', [3, 5]],
    ['text', [4, 5]],
    ['endTemplate', []],
    ['startTemplate', [2]],
    ['text', [0, 5]],
    ['block', [1, 5]],
    ['text', [2, 5]],
    ['block', [3, 5]],
    ['text', [4, 5]],
    ['endTemplate', []]
  ]);
});

test("web component", function() {
  var input = "<x-foo>bar</x-foo>";
  actionsEqual(input, [
    ['startTemplate', [0]],
    ['text', [0, 1]],
    ['endTemplate', []],
    ['startTemplate', [1]],
    ['text', [0, 3]],
    ['component', [1, 3]],
    ['text', [2, 3]],
    ['endTemplate', []]
  ]);
});

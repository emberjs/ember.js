import { preprocess } from "htmlbars-compiler/parser";
import TemplateVisitor from "htmlbars-compiler/compiler/template_visitor";

function actionsEqual(input, expectedActions) {
  var ast = preprocess(input);

  var templateVisitor = new TemplateVisitor();
  templateVisitor.visit(ast);
  var actualActions = templateVisitor.actions;

  // Remove the AST node reference from the actions to keep tests leaner
  for (var i = 0; i < actualActions.length; i++) {
    actualActions[i][1].shift();
  }

  deepEqual(actualActions, expectedActions);
}

module("TemplateVisitor");

test("empty", function() {
  var input = "";
  actionsEqual(input, [
    ['startProgram', [0]],
    ['endProgram', []]
  ]);
});

test("basic", function() {
  var input = "foo{{bar}}<div></div>";
  actionsEqual(input, [
    ['startProgram', [0]],
    ['text', [0, 3]],
    ['mustache', [1, 3]],
    ['openElement', [2, 3, 0]],
    ['closeElement', [2, 3]],
    ['endProgram', []]
  ]);
});

test("nested HTML", function() {
  var input = "<a></a><a><a><a></a></a></a>";
  actionsEqual(input, [
    ['startProgram', [0]],
    ['openElement', [0, 2, 0]],
    ['closeElement', [0, 2]],
    ['openElement', [1, 2, 0]],
    ['openElement', [0, 1, 0]],
    ['openElement', [0, 1, 0]],
    ['closeElement', [0, 1]],
    ['closeElement', [0, 1]],
    ['closeElement', [1, 2]],
    ['endProgram', []]
  ]);
});

test("mustaches are counted correctly", function() {
  var input = "<a><a>{{foo}}</a><a {{foo}}><a>{{foo}}</a><a>{{foo}}</a></a></a>";
  actionsEqual(input, [
    ['startProgram', [0]],
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
    ['endProgram', []]
  ]);
});

test("empty block", function() {
  var input = "{{#a}}{{/a}}";
  actionsEqual(input, [
    ['startProgram', [0]],
    ['endProgram', []],
    ['startProgram', [1]],
    ['text', [0, 3]],
    ['block', [1, 3]],
    ['text', [2, 3]],
    ['endProgram', []]
  ]);
});

test("block with inverse", function() {
  var input = "{{#a}}b{{^}}{{/a}}";
  actionsEqual(input, [
    ['startProgram', [0]],
    ['endProgram', []],
    ['startProgram', [0]],
    ['text', [0, 1]],
    ['endProgram', []],
    ['startProgram', [2]],
    ['text', [0, 3]],
    ['block', [1, 3]],
    ['text', [2, 3]],
    ['endProgram', []]
  ]);
});

test("nested blocks", function() {
  var input = "{{#a}}{{#a}}<b></b>{{/a}}{{#a}}{{b}}{{/a}}{{/a}}{{#a}}b{{/a}}";
  actionsEqual(input, [
    ['startProgram', [0]],
    ['text', [0, 1]],
    ['endProgram', []],
    ['startProgram', [0]],
    ['text', [0, 3]],
    ['mustache', [1, 3]],
    ['text', [2, 3]],
    ['endProgram', []],
    ['startProgram', [0]],
    ['openElement', [0, 1, 0]],
    ['closeElement', [0, 1]],
    ['endProgram', []],
    ['startProgram', [2]],
    ['text', [0, 5]],
    ['block', [1, 5]],
    ['text', [2, 5]],
    ['block', [3, 5]],
    ['text', [4, 5]],
    ['endProgram', []],
    ['startProgram', [2]],
    ['text', [0, 5]],
    ['block', [1, 5]],
    ['text', [2, 5]],
    ['block', [3, 5]],
    ['text', [4, 5]],
    ['endProgram', []]
  ]);
});

test("web component", function() {
  var input = "<x-foo>bar</x-foo>";
  actionsEqual(input, [
    ['startProgram', [0]],
    ['text', [0, 1]],
    ['endProgram', []],
    ['startProgram', [1]],
    ['text', [0, 3]],
    ['component', [1, 3]],
    ['text', [2, 3]],
    ['endProgram', []]
  ]);
});

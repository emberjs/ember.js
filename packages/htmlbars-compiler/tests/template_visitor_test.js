import { preprocess } from "../htmlbars-compiler/parser";
import TemplateVisitor from "../htmlbars-compiler/compiler/template_visitor";

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
    ['startProgram', [0, []]],
    ['endProgram', [0]]
  ]);
});

test("basic", function() {
  var input = "foo{{bar}}<div></div>";
  actionsEqual(input, [
    ['startProgram', [0, []]],
    ['text', [0, 3, false]],
    ['mustache', [1, 3]],
    ['openElement', [2, 3, false, 0, []]],
    ['closeElement', [2, 3, false]],
    ['endProgram', [0]]
  ]);
});

test("nested HTML", function() {
  var input = "<a></a><a><a><a></a></a></a>";
  actionsEqual(input, [
    ['startProgram', [0, []]],
    ['openElement', [0, 2, false, 0, []]],
    ['closeElement', [0, 2, false]],
    ['openElement', [1, 2, false, 0, []]],
    ['openElement', [0, 1, false, 0, []]],
    ['openElement', [0, 1, false, 0, []]],
    ['closeElement', [0, 1, false]],
    ['closeElement', [0, 1, false]],
    ['closeElement', [1, 2, false]],
    ['endProgram', [0]]
  ]);
});

test("mustaches are counted correctly", function() {
  var input = "<a><a>{{foo}}</a><a {{foo}}><a>{{foo}}</a><a>{{foo}}</a></a></a>";
  actionsEqual(input, [
    ['startProgram', [0, []]],
    ['openElement', [0, 1, true, 2, []]],
    ['openElement', [0, 2, false, 1, []]],
    ['mustache', [0, 1]],
    ['closeElement', [0, 2, false]],
    ['openElement', [1, 2, false, 3, []]],
    ['openElement', [0, 2, false, 1, []]],
    ['mustache', [0, 1]],
    ['closeElement', [0, 2, false]],
    ['openElement', [1, 2, false, 1, []]],
    ['mustache', [0, 1]],
    ['closeElement', [1, 2, false]],
    ['closeElement', [1, 2, false]],
    ['closeElement', [0, 1, true]],
    ['endProgram', [0]]
  ]);
});

test("empty block", function() {
  var input = "{{#a}}{{/a}}";
  actionsEqual(input, [
    ['startProgram', [0, []]],
    ['endProgram', [1]],
    ['startProgram', [1, [0, 1]]],
    ['text', [0, 3, false]],
    ['block', [1, 3]],
    ['text', [2, 3, false]],
    ['endProgram', [0]]
  ]);
});

test("block with inverse", function() {
  var input = "{{#a}}b{{^}}{{/a}}";
  actionsEqual(input, [
    ['startProgram', [0, []]],
    ['endProgram', [1]],
    ['startProgram', [0, []]],
    ['text', [0, 1, true]],
    ['endProgram', [1]],
    ['startProgram', [2, [0, 1]]],
    ['text', [0, 3, false]],
    ['block', [1, 3]],
    ['text', [2, 3, false]],
    ['endProgram', [0]]
  ]);
});

test("nested blocks", function() {
  var input = "{{#a}}{{#a}}<b></b>{{/a}}{{#a}}{{b}}{{/a}}{{/a}}{{#a}}b{{/a}}";
  actionsEqual(input, [
    ['startProgram', [0, []]],
    ['text', [0, 1, true]],
    ['endProgram', [1]],
    ['startProgram', [0, [0, 1]]],
    ['text', [0, 3, false]],
    ['mustache', [1, 3]],
    ['text', [2, 3, false]],
    ['endProgram', [2]],
    ['startProgram', [0, []]],
    ['openElement', [0, 1, true, 0, []]],
    ['closeElement', [0, 1, true]],
    ['endProgram', [2]],
    ['startProgram', [2, [0, 1, 2]]],
    ['text', [0, 5, false]],
    ['block', [1, 5]],
    ['text', [2, 5, false]],
    ['block', [3, 5]],
    ['text', [4, 5, false]],
    ['endProgram', [1]],
    ['startProgram', [2, [0, 1, 2]]],
    ['text', [0, 5, false]],
    ['block', [1, 5]],
    ['text', [2, 5, false]],
    ['block', [3, 5]],
    ['text', [4, 5, false]],
    ['endProgram', [0]]
  ]);
});

test("web component", function() {
  var input = "<x-foo>bar</x-foo>";
  actionsEqual(input, [
    ['startProgram', [0, []]],
    ['text', [0, 1, true]],
    ['endProgram', [1]],
    ['startProgram', [1, [0, 1]]],
    ['text', [0, 3, false]],
    ['component', [1, 3]],
    ['text', [2, 3, false]],
    ['endProgram', [0]]
  ]);
});

import { preprocess } from "htmlbars-syntax";
import { TemplateVisitor } from "htmlbars-compiler";

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

QUnit.module("TemplateVisitor");

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
    ['text', [0, 3]],
    ['mustache', [1, 3]],
    ['openElement', [2, 3, 0, []]],
    ['closeElement', [2, 3]],
    ['endProgram', [0]]
  ]);
});

test("nested HTML", function() {
  var input = "<a></a><a><a><a></a></a></a>";
  actionsEqual(input, [
    ['startProgram', [0, []]],
    ['openElement', [0, 2, 0, []]],
    ['closeElement', [0, 2]],
    ['openElement', [1, 2, 0, []]],
    ['openElement', [0, 1, 0, []]],
    ['openElement', [0, 1, 0, []]],
    ['closeElement', [0, 1]],
    ['closeElement', [0, 1]],
    ['closeElement', [1, 2]],
    ['endProgram', [0]]
  ]);
});

test("mustaches are counted correctly", function() {
  var input = "<a><a>{{foo}}</a><a {{foo}}><a>{{foo}}</a><a>{{foo}}</a></a></a>";
  actionsEqual(input, [
    ['startProgram', [0, []]],
    ['openElement', [0, 1, 2, []]],
    ['openElement', [0, 2, 1, []]],
    ['mustache', [0, 1]],
    ['closeElement', [0, 2]],
    ['openElement', [1, 2, 3, []]],
    ['openElement', [0, 2, 1, []]],
    ['mustache', [0, 1]],
    ['closeElement', [0, 2]],
    ['openElement', [1, 2, 1, []]],
    ['mustache', [0, 1]],
    ['closeElement', [1, 2]],
    ['closeElement', [1, 2]],
    ['closeElement', [0, 1]],
    ['endProgram', [0]]
  ]);
});

test("empty block", function() {
  var input = "{{#a}}{{/a}}";
  actionsEqual(input, [
    ['startProgram', [0, []]],
    ['endProgram', [1]],
    ['startProgram', [1, []]],
    ['block', [0, 1]],
    ['endProgram', [0]]
  ]);
});

test("block with inverse", function() {
  var input = "{{#a}}b{{^}}{{/a}}";
  actionsEqual(input, [
    ['startProgram', [0, []]],
    ['endProgram', [1]],
    ['startProgram', [0, []]],
    ['text', [0, 1]],
    ['endProgram', [1]],
    ['startProgram', [2, []]],
    ['block', [0, 1]],
    ['endProgram', [0]]
  ]);
});

test("nested blocks", function() {
  var input = "{{#a}}{{#a}}<b></b>{{/a}}{{#a}}{{b}}{{/a}}{{/a}}{{#a}}b{{/a}}";
  actionsEqual(input, [
    ['startProgram', [0, []]],
    ['text', [0, 1]],
    ['endProgram', [1]],
    ['startProgram', [0, []]],
    ['mustache', [0, 1]],
    ['endProgram', [2]],
    ['startProgram', [0, []]],
    ['openElement', [0, 1, 0, []]],
    ['closeElement', [0, 1]],
    ['endProgram', [2]],
    ['startProgram', [2, []]],
    ['block', [0, 2]],
    ['block', [1, 2]],
    ['endProgram', [1]],
    ['startProgram', [2, []]],
    ['block', [0, 2]],
    ['block', [1, 2]],
    ['endProgram', [0]]
  ]);
});

test("component", function() {
  var input = "<x-foo>bar</x-foo>";
  actionsEqual(input, [
    ['startProgram', [0, []]],
    ['text', [0, 1]],
    ['endProgram', [1]],
    ['startProgram', [1, []]],
    ['component', [0, 1]],
    ['endProgram', [0]]
  ]);
});

test("comment", function() {
  var input = "<!-- some comment -->";
  actionsEqual(input, [
    ['startProgram', [0, []]],
    ['comment', [0, 1]],
    ['endProgram', [0]]
  ]);
});

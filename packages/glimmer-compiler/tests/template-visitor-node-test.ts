import { preprocess } from "glimmer-syntax";
import { TemplateVisitor } from "glimmer-compiler";

function actionsEqual(input, expectedActions) {
  let ast = preprocess(input);

  let templateVisitor = new TemplateVisitor();
  templateVisitor.visit(ast);
  let actualActions = templateVisitor.actions;

  // Remove the AST node reference from the actions to keep tests leaner
  for (let i = 0; i < actualActions.length; i++) {
    actualActions[i][1].shift();
  }

  deepEqual(actualActions, expectedActions);
}

QUnit.module("TemplateVisitor");

test("empty", function() {
  let input = "";
  actionsEqual(input, [
    ['startProgram', [0, []]],
    ['endProgram', [0]]
  ]);
});

test("basic", function() {
  let input = "foo{{bar}}<div></div>";
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
  let input = "<a></a><a><a><a></a></a></a>";
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
  let input = "<a><a>{{foo}}</a><a {{foo}}><a>{{foo}}</a><a>{{foo}}</a></a></a>";
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
  let input = "{{#a}}{{/a}}";
  actionsEqual(input, [
    ['startBlock', [0, []]],
    ['endBlock', [1]],
    ['startProgram', [1, []]],
    ['block', [0, 1]],
    ['endProgram', [0]]
  ]);
});

test("block with inverse", function() {
  let input = "{{#a}}b{{^}}{{/a}}";
  actionsEqual(input, [
    ['startBlock', [0, []]],
    ['endBlock', [1]],
    ['startBlock', [0, []]],
    ['text', [0, 1]],
    ['endBlock', [1]],
    ['startProgram', [2, []]],
    ['block', [0, 1]],
    ['endProgram', [0]]
  ]);
});

test("nested blocks", function() {
  let input = "{{#a}}{{#a}}<b></b>{{/a}}{{#a}}{{b}}{{/a}}{{/a}}{{#a}}b{{/a}}";
  actionsEqual(input, [
    ['startBlock', [0, []]],
    ['text', [0, 1]],
    ['endBlock', [1]],
    ['startBlock', [0, []]],
    ['mustache', [0, 1]],
    ['endBlock', [2]],
    ['startBlock', [0, []]],
    ['openElement', [0, 1, 0, []]],
    ['closeElement', [0, 1]],
    ['endBlock', [2]],
    ['startBlock', [2, []]],
    ['block', [0, 2]],
    ['block', [1, 2]],
    ['endBlock', [1]],
    ['startProgram', [2, []]],
    ['block', [0, 2]],
    ['block', [1, 2]],
    ['endProgram', [0]]
  ]);
});

test("comment", function() {
  let input = "<!-- some comment -->";
  actionsEqual(input, [
    ['startProgram', [0, []]],
    ['comment', [0, 1]],
    ['endProgram', [0]]
  ]);
});

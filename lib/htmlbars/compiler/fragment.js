/*jshint evil:true*/

import { processOpcodes } from "htmlbars/compiler/utils";
import { prepareHelper } from "htmlbars/compiler/helpers";
import { call, helper } from "htmlbars/compiler/invoke";
import { pushElement, popElement, topElement } from "htmlbars/compiler/elements";
import { pushStack, popStack } from "htmlbars/compiler/stack";
import { string, quotedArray, hash } from "htmlbars/compiler/quoting";

function Fragment2() {}

var compiler2 = Fragment2.prototype;

compiler2.compile = function(opcodeTree) {
  this.output = [];
  this.elementNumber = 0;

  this.output.push("return function template() {");
  this.preamble();
  processOpcodes(this, opcodeTree.opcodes);
  this.postamble();
  this.output.push("};");

  var childCompiler = new Fragment2();
  return {
    fn: new Function('dom', this.output.join("\n")),
    children: opcodeTree.children.map(function (opcodes) {
      return childCompiler.compile(opcodes);
    })
  };
};

compiler2.preamble = function() {
  this.push("var element0, el");
  this.push("var frag = element0 = dom.createDocumentFragment()");
};

compiler2.postamble = function() {
  this.output.push("return frag;");
};

compiler2.program = function(programId, inverseId) {
  pushStack(this.stack, inverseId);
  pushStack(this.stack, programId);
};

compiler2.content = function(str) {
  this.push(helper('appendText', this.el(), string(str)));
};

compiler2.push = function(string) {
  this.output.push(string + ";");
};

compiler2.el = function() {
  return topElement(this);
};

compiler2.openElement = function(tagName) {
  var elRef = pushElement(this);
  this.push("var " + elRef + " = el = " + call('dom.createElement', string(tagName)));
};

compiler2.setAttribute = function(name, value) {
  this.push(call('dom.setAttribute', 'el', string(name), string(value)));
};

compiler2.closeElement = function() {
  var elRef = popElement(this);
  this.push(call([this.el(), 'appendChild'], elRef));
};

export { Fragment2 };

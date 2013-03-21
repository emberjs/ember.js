import { processOpcodes, prepareHelper } from "htmlbars/compiler/utils";
import { invokeMethod, invokeFunction, helper } from "htmlbars/compiler/invoke";
import { pushElement, popElement, topElement } from "htmlbars/compiler/elements";
import { pushStack, popStack } from "htmlbars/compiler/stack";
import { quotedString, quotedArray, hash } from "htmlbars/compiler/quoting";
import { domHelpers } from "htmlbars/runtime";
import { helpers } from "htmlbars/helpers";

function Compiler2() {};

var compiler2 = Compiler2.prototype;

compiler2.compile = function(opcodes, options) {
  this.output = [];
  this.elementNumber = 0;
  this.stackNumber = 0;
  this.stack = [];
  this.children = options.children;

  this.output.push("return function template(context, options) {")
  this.preamble();
  processOpcodes(this, opcodes);
  this.postamble();
  this.output.push("};");

  // console.debug(this.output.join("\n"));

  // have the generated function close over the DOM helpers
  var generator = new Function('dom', this.output.join("\n"));
  return generator(domHelpers);
};

compiler2.preamble = function() {
  this.children.forEach(function(child, i) {
    this.push("var child" + i + " = " + child.toString());
  }, this);

  this.push("var element0, el");
  this.push("var frag = element0 = document.createDocumentFragment()");
};

compiler2.postamble = function() {
  this.output.push("return frag;");
};

compiler2.program = function(programId) {
  pushStack(this.stack, programId);
};

compiler2.content = function(string) {
  this.push(invokeMethod(this.el(), 'appendChild', helper('frag', this.el(), quotedString(string))));
};

compiler2.push = function(string) {
  this.output.push(string + ";");
};

compiler2.el = function() {
  return topElement(this);
};

compiler2.id = function(parts) {
  pushStack(this.stack, quotedString('id'));
  pushStack(this.stack, quotedArray(parts));
};

compiler2.literal = function(literal) {
  pushStack(this.stack, quotedString(typeof literal));
  pushStack(this.stack, literal);
};

compiler2.stackLiteral = function(literal) {
  pushStack(this.stack, literal);
};

compiler2.string = function(string) {
  pushStack(this.stack, quotedString('string'));
  pushStack(this.stack, quotedString(string));
};

compiler2.appendText = function() {
  this.push(helper('appendText', this.el(), popStack(this.stack)));
};

compiler2.appendHTML = function() {
  this.push(helper('appendHTML', this.el(), popStack(this.stack)));
};

compiler2.appendFragment = function() {
  this.push(helper('appendFragment', this.el(), popStack(this.stack)));
}

compiler2.openElement = function(tagName) {
  var elRef = pushElement(this);
  this.push("var " + elRef + " = el = " + invokeMethod('document', 'createElement', quotedString(tagName)));
};

compiler2.attribute = function(name, value) {
  this.push(invokeMethod('el', 'setAttribute', quotedString(name), quotedString(value)));
};

compiler2.blockAttr = function(name, child) {
  var invokeRererender = invokeMethod('el', 'setAttribute', quotedString(name), invokeFunction('child' + child, 'context', hash(['rerender:rerender'])));
  var rerender = 'function rerender() { ' + invokeRererender + '}';
  var options = hash(['rerender:' + rerender, 'element:el', 'attrName:' + quotedString(name)]);
  pushStack(this.stack, invokeFunction('child' + child, 'context', options));

  this.push(invokeMethod('el', 'setAttribute', quotedString(name), popStack(this.stack)));
};

compiler2.closeElement = function() {
  var elRef = popElement(this);
  this.push(invokeMethod(this.el(), 'appendChild', elRef));
};

compiler2.dynamic = function(parts, escaped) {
  pushStack(this.stack, helper('resolveContents', 'context', quotedArray(parts), this.el(), escaped));
};

compiler2.ambiguous = function(string, escaped) {
  pushStack(this.stack, helper('ambiguousContents', this.el(), 'context', quotedString(string), escaped));
};

compiler2.helper = function(name, size, escaped) {
  var prepared = prepareHelper(this, size);
  pushStack(this.stack, helper('helperContents', quotedString(name), this.el(), 'context', prepared.args, hash(prepared.options)));
};

compiler2.nodeHelper = function(name, size) {
  var prepared = prepareHelper(this, size);
  this.push(helper('helperContents', quotedString(name), this.el(), 'context', prepared.args, hash(prepared.options)));
};

compiler2.dynamicAttr = function(attrName, parts) {
  pushStack(this.stack, helper('resolveAttr', 'context', quotedArray(parts), this.el(), quotedString(attrName)));
};

compiler2.ambiguousAttr = function(attrName, string) {
  pushStack(this.stack, helper('ambiguousAttr', this.el(), 'context', quotedString(attrName), quotedString(string)));
};

compiler2.helperAttr = function(attrName, name, size) {
  var prepared = prepareHelper(this, size);
  pushStack(this.stack, helper('helperAttr', quotedString(name), this.el(), quotedString(attrName), 'context', prepared.args, hash(prepared.options)));
};

compiler2.applyAttribute = function(attrName) {
  this.push(helper('applyAttribute', this.el(), quotedString(attrName), popStack(this.stack)));
};

export { Compiler2 };
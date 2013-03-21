import { processOpcodes, prepareHelper, helper } from "htmlbars/compiler-utils";
import { popStack, pushStack } from "htmlbars/compiler/stack";
import { quotedString, quotedArray, hash } from "htmlbars/compiler/quoting";

function AttrCompiler() {};

var attrCompiler = AttrCompiler.prototype;

attrCompiler.compile = function(opcodes, options) {
  this.output = [];
  this.stackNumber = 0;
  this.stack = [];

  this.preamble();
  processOpcodes(this, opcodes);
  this.postamble();

  return new Function('context', 'options', this.output.join("\n"));
};

attrCompiler.preamble = function() {
  this.push("var buffer = ''");
};

attrCompiler.postamble = function() {
  this.push("return buffer");
};

attrCompiler.content = function(string) {
  this.push("buffer += " + quotedString(string));
};

attrCompiler.dynamic = function(parts, escaped) {
  pushStack(this, helper('resolveAttr', 'context', quotedArray(parts), 'null', 'null', escaped))
};

attrCompiler.id = attrCompiler.dynamic;

attrCompiler.ambiguous = function(string, escaped) {
  pushStack(this, helper('resolveInAttr', 'context', quotedArray([string]), 'options'));
};

attrCompiler.helper = function(name, size, escaped) {
  var prepared = prepareHelper(this, size);

  prepared.options.push('rerender:options.rerender');

  pushStack(this, helper('helperAttr', quotedString(name), 'null', 'null', 'context', prepared.args, hash(prepared.options)));
};

attrCompiler.appendText = function() {
  this.push("buffer += " + popStack(this));
}

attrCompiler.program = function() {
  pushStack(this, null);
}

attrCompiler.id = function(parts) {
  pushStack(this, quotedString('id'));
  pushStack(this, quotedString(parts[0]));
}

attrCompiler.literal = function(literal) {
  pushStack(this, quotedString(typeof literal));
  pushStack(this, literal);
};

attrCompiler.string = function(string) {
  pushStack(this, quotedString(typeof literal));
  pushStack(this, quotedString(string));
};

attrCompiler.stackLiteral = function(literal) {
  pushStack(this, literal);
};

attrCompiler.push = function(string) {
  this.output.push(string + ";");
};

export { AttrCompiler };
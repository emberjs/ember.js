import { processOpcodes, prepareHelper, helper } from "htmlbars/compiler-utils";
import { popStack, pushStackLiteral } from "htmlbars/compiler/stack";
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
  pushStackLiteral(this, helper('resolveAttr', 'context', quotedArray(parts), 'null', 'null', escaped))
};

attrCompiler.id = attrCompiler.dynamic;

attrCompiler.ambiguous = function(string, escaped) {
  pushStackLiteral(this, helper('resolveInAttr', 'context', quotedArray([string]), 'options'));
};

attrCompiler.helper = function(name, size, escaped) {
  var prepared = prepareHelper(this, size);

  prepared.options.push('rerender:options.rerender');

  pushStackLiteral(this, helper('helperAttr', quotedString(name), 'null', 'null', 'context', prepared.args, hash(prepared.options)));
};

attrCompiler.appendText = function() {
  this.push("buffer += " + popStack(this));
}

attrCompiler.program = function() {
  pushStackLiteral(this, null);
}

attrCompiler.id = function(parts) {
  pushStackLiteral(this, quotedString('id'));
  pushStackLiteral(this, quotedString(parts[0]));
}

attrCompiler.literal = function(literal) {
  pushStackLiteral(this, quotedString(typeof literal));
  pushStackLiteral(this, literal);
};

attrCompiler.string = function(string) {
  pushStackLiteral(this, quotedString(typeof literal));
  pushStackLiteral(this, quotedString(string));
};

attrCompiler.stackLiteral = function(literal) {
  pushStackLiteral(this, literal);
};

attrCompiler.push = function(string) {
  this.output.push(string + ";");
};

export { AttrCompiler };
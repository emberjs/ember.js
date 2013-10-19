import { processOpcodes } from "htmlbars/compiler/utils";
import { prepareHelper } from "htmlbars/compiler/helpers";
import { helper } from "htmlbars/compiler/invoke";
import { popStack, pushStack } from "htmlbars/compiler/stack";
import { string, hash, quotedArray } from "htmlbars/compiler/quoting";

function AttrCompiler() {}

var attrCompiler = AttrCompiler.prototype;

attrCompiler.compile = function(opcodes, options) {
  this.output = [];
  this.stackNumber = 0;
  this.stack = [];

  this.preamble();
  processOpcodes(this, opcodes);
  this.postamble();

  /*jshint evil:true*/
  return new Function('context', 'options', this.output.join("\n"));
};

attrCompiler.preamble = function() {
  this.push("var buffer = []");
};

attrCompiler.postamble = function() {
  this.push("return buffer.join('')");
};

attrCompiler.content = function(str) {
  this.push("buffer.push(" + string(str) +")");
};

attrCompiler.dynamic = function(parts, escaped) {
  this.push(helper('resolveInAttr', 'context', quotedArray(parts), 'buffer', 'options'));
};

attrCompiler.ambiguous = function(string, escaped) {
  this.push(helper('ambiguousAttr', 'context', quotedArray([string]), 'buffer', 'options'));
};

attrCompiler.helper = function(name, size, escaped) {
  var prepared = prepareHelper(this.stack, size);
  prepared.options.push('setAttribute:options.setAttribute');

  this.push(helper('helperAttr', 'context', string(name), prepared.args, 'buffer', hash(prepared.options)));
};

attrCompiler.appendText = function() {
  // noop
};

attrCompiler.program = function() {
  pushStack(this.stack, null);
};

attrCompiler.id = function(parts) {
  pushStack(this.stack, string('id'));
  pushStack(this.stack, string(parts[0]));
};

attrCompiler.literal = function(literal) {
  pushStack(this.stack, string(typeof literal));
  pushStack(this.stack, literal);
};

attrCompiler.string = function(str) {
  pushStack(this.stack, string('string'));
  pushStack(this.stack, string(str));
};

attrCompiler.stackLiteral = function(literal) {
  pushStack(this.stack, literal);
};

attrCompiler.push = function(string) {
  this.output.push(string + ";");
};

export { AttrCompiler };

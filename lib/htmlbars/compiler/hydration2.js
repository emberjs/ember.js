/*jshint evil:true*/

import { processOpcodes } from "htmlbars/compiler/utils";
import { prepareHelper } from "htmlbars/compiler/helpers";
import { call, helper } from "htmlbars/compiler/invoke";
import { pushStack, popStack } from "htmlbars/compiler/stack";
import { string, quotedArray, hash } from "htmlbars/compiler/quoting";

function Hydration2() {}

var prototype = Hydration2.prototype;

prototype.compile = function(opcodes, options) {
  this.output = [];
  this.stack = [];

  this.output.push("return function hydrate(fragment) {");

  this.mustaches = [];

  processOpcodes(this, opcodes);

  this.output.push("return [\n"+this.mustaches.join(",\n")+"\n];");
  this.output.push("};");

  return new Function("Range", this.output.join("\n"));
};

prototype.push = function(string) {
  this.output.push(string + ";");
};

prototype.program = function(programId, inverseId) {
  this.stack.push(inverseId);
  this.stack.push(programId);
};

prototype.id = function(parts) {
  pushStack(this.stack, string('id'));
  pushStack(this.stack, quotedArray(parts));
};

prototype.stackLiteral = function(literal) {
  pushStack(this.stack, literal);
};

prototype.helper = function(name, size, escaped, parentPath, startIndex, endIndex) {
  var prepared = prepareHelper(this.stack, size);
  prepared.options.push('escaped:'+escaped);
  this.pushMustache(string(name), prepared.args, prepared.options, parentPath, startIndex, endIndex);
};

prototype.ambiguous = function(str, escaped, parentPath, startIndex, endIndex) {
  this.pushMustache(string(str), [], ['escaped:'+escaped], parentPath, startIndex, endIndex);
};

/*
{
  range: range,
  mustache: [path, params, options]
}

{
  range: range,
  mustache: [name, params, options]
}
*/

//'testing', [['unescaped']], {types:['id'],hashTypes:{},hash:{}})
prototype.pushMustache = function(name, args, pairs, parentPath, startIndex, endIndex) {
  var parent = "fragment";
  for (var i=0; i<parentPath.length; i++) {
    parent += ".childNodes["+parentPath[i]+"]";
  }
  var range = "Range.create("+parent+","+
    (startIndex === null ? "null" : startIndex)+","+
    (endIndex === null ? "null" : endIndex)+")";

  pairs.push('range:'+range);

  this.mustaches.push('['+name+','+args+','+hash(pairs)+']');
};

export { Hydration2 };

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

prototype.ambiguous = function(str, escaped, parentPath, startIndex, endIndex) {
  var parent = "fragment";
  for (var i=0; i<parentPath.length; i++) {
    parent += ".childNodes["+parentPath[i]+"]";
  }
  var range = "Range.create("+parent+","+
    (startIndex === null ? "null" : startIndex)+","+
    (endIndex === null ? "null" : endIndex)+")";

  this.mustaches.push("{range:"+range+",type:\"ambiguous\",params:["+string(str)+","+escaped+"]}");
};

export { Hydration2 };

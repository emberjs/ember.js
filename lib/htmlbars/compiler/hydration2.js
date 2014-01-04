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

  this.preamble();
  processOpcodes(this, opcodes);
  this.postamble();

  this.output.push("};");

  return new Function("Range", this.output.join("\n"));
};

prototype.push = function(string) {
  this.output.push(string + ";");
};

prototype.preamble = function() {
  this.push("var mustaches = [], parent");
};

prototype.postamble = function() {
  this.push("return mustaches");
};

prototype.ambiguous = function(str, escaped, parentPath, startIndex, endIndex) {
  var parent = "parent = fragment";
  for (var i=0; i<parentPath.length; i++) {
    parent += ".childNodes["+parentPath[i]+"]";
  }
  this.push(parent);
  var start;
  if (startIndex === null) {
    start = "null";
  } else {
    start = "parent.childNodes["+startIndex+"]";
  }
  var end;
  if (endIndex === null) {
    end = "null";
  } else {
    end = "parent.childNodes["+endIndex+"]";
  }
  var range = "new Range(parent,"+start+","+end+")";

  this.push("mustaches.push({range:"+range+",type:\"ambiguous\",params:["+string(str)+","+escaped+"]})");
};

export { Hydration2 };

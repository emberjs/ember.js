import { processOpcodes } from "./utils";
import { prepareHelper } from "./helpers";
import { string, quotedArray, hash, array } from "./quoting";

function HydrationCompiler() {
  this.stack = [];
  this.source = [];
  this.mustaches = [];
  this.parents = ['fragment'];
  this.parentCount = 0;
  this.declarations = [];
}

var prototype = HydrationCompiler.prototype;

prototype.compile = function(opcodes, options) {
  this.stack.length = 0;
  this.mustaches.length = 0;
  this.source.length = 0;
  this.parents.length = 1;
  this.declarations.length = 0;
  this.parentCount = 0;
  this.indent = (options && options.indent) || "";

  processOpcodes(this, opcodes);

  if (this.declarations.length) {
    var decs = "";
    for (var i = 0, l = this.declarations.length; i < l; ++i) {
      var dec = this.declarations[i];
      decs += this.indent+'  var '+dec[0]+' = '+dec[1]+';\n';
    }
    this.source.unshift(decs);
  }

  return this.source.join('');
};

prototype.program = function(programId, inverseId) {
  this.stack.push(inverseId);
  this.stack.push(programId);
};

prototype.id = function(parts) {
  this.stack.push(string('id'));
  this.stack.push(string(parts.join('.')));
};

prototype.literal = function(literal) {
  this.stack.push(string(typeof literal));
  this.stack.push(literal);
};

prototype.stringLiteral = function(str) {
  this.stack.push(string('string'));
  this.stack.push(string(str));
};

prototype.stackLiteral = function(literal) {
  this.stack.push(literal);
};

prototype.helper = function(name, size, escaped, morphNum) {
  var prepared = prepareHelper(this.stack, size);
  prepared.options.push('escaped:'+escaped);
  prepared.options.push('morph:morph'+morphNum);
  this.pushMustacheInContent(string(name), prepared.args, prepared.options, morphNum);
};

prototype.component = function(tag, morphNum) {
  var prepared = prepareHelper(this.stack, 0);
  this.pushWebComponent(string(tag), prepared.options, morphNum);
};

prototype.ambiguous = function(str, escaped, morphNum) {
  this.pushMustacheInContent(string(str), '[]', ['escaped:'+escaped], morphNum);
};

prototype.ambiguousAttr = function(str, escaped) {
  this.stack.push('['+string(str)+', [], {escaped:'+escaped+'}]');
};

prototype.helperAttr = function(name, size, escaped) {
  var prepared = prepareHelper(this.stack, size);
  prepared.options.push('escaped:'+escaped);
  this.stack.push('['+string(name)+','+prepared.args+','+ hash(prepared.options)+']');
};

prototype.sexpr = function(name, size) {
  var prepared = prepareHelper(this.stack, size);
  this.stack.push('hooks.subexpr(' + string(name) + ', context, ' + prepared.args + ', ' + hash(prepared.options) + ', env)');
};

prototype.string = function(str) {
  this.stack.push(string(str));
};

prototype.nodeHelper = function(name, size, elementNum) {
  var prepared = prepareHelper(this.stack, size);
  prepared.options.push('element:element'+elementNum);
  this.pushMustacheInNode(string(name), prepared.args, prepared.options, elementNum);
};

prototype.morph = function(num, parentPath, startIndex, endIndex) {
  var isRoot = parentPath.length === 0;
  var parentIndex = isRoot ? 0 : parentPath[parentPath.length-1];
  var parent = this.getParent();

  var morph = "dom.createMorphAt("+parent+
    ","+(startIndex === null ? "-1" : startIndex)+
    ","+(endIndex === null ? "-1" : endIndex)+
    (isRoot ? ",contextualElement)" : ")");

  this.declarations.push(['morph' + num, morph]);
};

// Adds our element to cached declaration
prototype.element = function(elementNum){
  var elementNodesName = "element" + elementNum;
  this.declarations.push([elementNodesName, this.getParent() ]);
  this.parents[this.parents.length-1] = elementNodesName;
};

prototype.pushWebComponent = function(name, pairs, morphNum) {
  this.source.push(this.indent+'  hooks.webComponent(morph' + morphNum + ', ' + name + ', context, ' + hash(pairs) + ', env);\n');
};

prototype.pushMustacheInContent = function(name, args, pairs, morphNum) {
  this.source.push(this.indent+'  hooks.content(morph' + morphNum + ', ' + name + ', context, ' + args + ', ' + hash(pairs) + ', env);\n');
};

prototype.pushMustacheInNode = function(name, args, pairs, elementNum) {
  this.source.push(this.indent+'  hooks.element(element' + elementNum + ', ' + name + ', context, ' + args + ', ' + hash(pairs) + ', env);\n');
};

prototype.shareParent = function(i) {
  var parentNodesName = "parent" + this.parentCount++;
  this.declarations.push([parentNodesName, this.getParent() + '.childNodes[' + i + ']']);
  this.parents.push(parentNodesName);
};

prototype.consumeParent = function(i) {
  this.parents.push(this.getParent() + '.childNodes[' + i + ']');
};

prototype.popParent = function() {
  this.parents.pop();
};

prototype.getParent = function() {
  return this.parents[this.parents.length-1];
};

export { HydrationCompiler };

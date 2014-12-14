import { processOpcodes } from "./utils";
import { string, hash as quoteHash, array } from "../htmlbars-util/quoting";

function HydrationJavaScriptCompiler() {
  this.stack = [];
  this.source = [];
  this.mustaches = [];
  this.parents = ['fragment'];
  this.parentCount = 0;
  this.morphs = [];
  this.fragmentProcessing = [];
  this.hooks = undefined;
}

export default HydrationJavaScriptCompiler;

var prototype = HydrationJavaScriptCompiler.prototype;

prototype.compile = function(opcodes, options) {
  this.stack.length = 0;
  this.mustaches.length = 0;
  this.source.length = 0;
  this.parents.length = 1;
  this.parents[0] = 'fragment';
  this.morphs.length = 0;
  this.fragmentProcessing.length = 0;
  this.parentCount = 0;
  this.indent = (options && options.indent) || "";
  this.hooks = {};

  processOpcodes(this, opcodes);

  var i, l;
  if (this.morphs.length) {
    var morphs = "";
    for (i = 0, l = this.morphs.length; i < l; ++i) {
      var morph = this.morphs[i];
      morphs += this.indent+'  var '+morph[0]+' = '+morph[1]+';\n';
    }
    this.source.unshift(morphs);
  }

  if (this.fragmentProcessing.length) {
    var processing = "";
    for (i = 0, l = this.fragmentProcessing.length; i < l; ++i) {
      processing += this.indent+'  '+this.fragmentProcessing[i]+'\n';
    }
    this.source.unshift(processing);
  }

  return this.source.join('');
};

prototype.prepareArray = function(length) {
  var values = [];

  for (var i = 0; i < length; i++) {
    values.push(this.stack.pop());
  }

  this.stack.push('[' + values.join(', ') + ']');
};

prototype.prepareObject = function(size) {
  var pairs = [];

  for (var i = 0; i < size; i++) {
    pairs.push(this.stack.pop() + ': ' + this.stack.pop());
  }

  this.stack.push('{' + pairs.join(', ') + '}');
};

prototype.pushRaw = function(value) {
  this.stack.push(value);
};

prototype.pushLiteral = function(value) {
  if (typeof value === 'string') {
    this.stack.push(string(value));
  } else {
    this.stack.push(value.toString());
  }
};

prototype.pushGetHook = function(path) {
  this.hooks.get = true;
  this.stack.push('get(context, ' + string(path) + ', env)');
};

prototype.pushSexprHook = function() {
  this.hooks.subexpr = true;
  var path = this.stack.pop();
  var params = this.stack.pop();
  var hash = this.stack.pop();
  this.stack.push('subexpr(' + path + ', context, ' + params + ', ' + hash + ', {}, env)');
};

prototype.pushConcatHook = function() {
  this.hooks.concat = true;
  var parts = this.stack.pop();
  this.stack.push('concat(' + parts + ', env)');
};

prototype.printHook = function(name, args) {
  this.hooks[name] = true;
  this.source.push(this.indent + '  ' + name + '(' + args.join(', ') + ');\n');
};

prototype.printSetHook = function(name, index) {
  this.hooks.set = true;
  this.source.push(this.indent + '  set(context, ' + string(name) +', blockArguments[' + index + ']);\n');
};

prototype.printBlockHook = function(morphNum, templateId, inverseId) {
  this.printHook('block', [
    'morph' + morphNum,
    'context',
    this.stack.pop(), // path
    this.stack.pop(), // params
    this.stack.pop(), // hash
    templateId === null ? 'null' : 'child' + templateId,
    inverseId === null ? 'null' : 'child' + inverseId,
    'env'
  ]);
};

prototype.printInlineHook = function(morphNum) {
  this.printHook('inline', [
    'morph' + morphNum,
    'context',
    this.stack.pop(), // path
    this.stack.pop(), // params
    this.stack.pop(), // hash
    'env'
  ]);
};

prototype.printContentHook = function(morphNum) {
  this.printHook('content', [
    'morph' + morphNum,
    'context',
    this.stack.pop(), // path
    'env'
  ]);
};

prototype.printComponentHook = function(morphNum, templateId) {
  this.printHook('component', [
    'morph' + morphNum,
    'context',
    this.stack.pop(), // path
    this.stack.pop(), // attrs
    templateId === null ? 'null' : 'child' + templateId,
    'env'
  ]);
};

prototype.printAttributeHook = function(elementNum) {
  this.printHook('attribute', [
    'element' + elementNum,
    this.stack.pop(), // name
    this.stack.pop(), // value
    'env'
  ]);
};

prototype.printElementHook = function(elementNum) {
  this.hooks.element = true;

  var path = this.stack.pop();
  var params = this.stack.pop();
  var hash = this.stack.pop();

  var options = [];
  options.push('element: element' + elementNum);

  var args = ['element' + elementNum, path, 'context', params, hash, quoteHash(options), 'env'];
  this.source.push(this.indent+'  element(' + args.join(', ') + ');\n');
};

prototype.createMorph = function(morphNum, parentPath, startIndex, endIndex, escaped) {
  var isRoot = parentPath.length === 0;
  var parent = this.getParent();

  var morphMethod = escaped ? 'createMorphAt' : 'createUnsafeMorphAt';
  var morph = "dom."+morphMethod+"("+parent+
    ","+(startIndex === null ? "-1" : startIndex)+
    ","+(endIndex === null ? "-1" : endIndex)+
    (isRoot ? ",contextualElement)" : ")");

  this.morphs.push(['morph' + morphNum, morph]);
};

prototype.repairClonedNode = function(blankChildTextNodes, isElementChecked) {
  var parent = this.getParent(),
      processing = 'dom.repairClonedNode('+parent+','+
                   array(blankChildTextNodes)+
                   ( isElementChecked ? ',true' : '' )+
                   ');';
  this.fragmentProcessing.push(
    processing
  );
};

prototype.shareElement = function(elementNum){
  var elementNodesName = "element" + elementNum;
  this.fragmentProcessing.push('var '+elementNodesName+' = '+this.getParent()+';');
  this.parents[this.parents.length-1] = elementNodesName;
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

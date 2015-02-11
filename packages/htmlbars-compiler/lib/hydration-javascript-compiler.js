import { processOpcodes } from "./utils";
import { string, array } from "../htmlbars-util/quoting";

function HydrationJavaScriptCompiler() {
  this.stack = [];
  this.source = [];
  this.mustaches = [];
  this.parents = [['fragment']];
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
  this.parents[0] = ['fragment'];
  this.morphs.length = 0;
  this.fragmentProcessing.length = 0;
  this.parentCount = 0;
  this.indent = (options && options.indent) || "";
  this.hooks = {};
  this.hasOpenBoundary = false;
  this.hasCloseBoundary = false;

  processOpcodes(this, opcodes);

  if (this.hasOpenBoundary) {
    this.source.unshift(this.indent+"  dom.insertBoundary(fragment, 0);\n");
  }

  if (this.hasCloseBoundary) {
    this.source.unshift(this.indent+"  dom.insertBoundary(fragment, null);\n");
  }

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

prototype.openBoundary = function() {
  this.hasOpenBoundary = true;
};

prototype.closeBoundary = function() {
  this.hasCloseBoundary = true;
};

prototype.pushLiteral = function(value) {
  if (typeof value === 'string') {
    this.stack.push(string(value));
  } else {
    this.stack.push(value.toString());
  }
};

prototype.pushHook = function(name, args) {
  this.hooks[name] = true;
  this.stack.push(name + '(' + args.join(', ') + ')');
};

prototype.pushGetHook = function(path) {
  this.pushHook('get', [
    'env',
    'context',
    string(path)
  ]);
};

prototype.pushSexprHook = function() {
  this.pushHook('subexpr', [
    'env',
    'context',
    this.stack.pop(), // path
    this.stack.pop(), // params
    this.stack.pop() // hash
  ]);
};

prototype.pushConcatHook = function() {
  this.pushHook('concat', [
    'env',
    this.stack.pop() // parts
  ]);
};

prototype.printHook = function(name, args) {
  this.hooks[name] = true;
  this.source.push(this.indent + '  ' + name + '(' + args.join(', ') + ');\n');
};

prototype.printSetHook = function(name, index) {
  this.printHook('set', [
    'env',
    'context',
    string(name),
    'blockArguments[' + index + ']'
  ]);
};

prototype.printBlockHook = function(morphNum, templateId, inverseId) {
  this.printHook('block', [
    'env',
    'morph' + morphNum,
    'context',
    this.stack.pop(), // path
    this.stack.pop(), // params
    this.stack.pop(), // hash
    templateId === null ? 'null' : 'child' + templateId,
    inverseId === null ? 'null' : 'child' + inverseId
  ]);
};

prototype.printInlineHook = function(morphNum) {
  this.printHook('inline', [
    'env',
    'morph' + morphNum,
    'context',
    this.stack.pop(), // path
    this.stack.pop(), // params
    this.stack.pop() // hash
  ]);
};

prototype.printContentHook = function(morphNum) {
  this.printHook('content', [
    'env',
    'morph' + morphNum,
    'context',
    this.stack.pop() // path
  ]);
};

prototype.printComponentHook = function(morphNum, templateId) {
  this.printHook('component', [
    'env',
    'morph' + morphNum,
    'context',
    this.stack.pop(), // path
    this.stack.pop(), // attrs
    templateId === null ? 'null' : 'child' + templateId
  ]);
};

prototype.printAttributeHook = function(attrMorphNum, elementNum) {
  this.printHook('attribute', [
    'env',
    'attrMorph' + attrMorphNum,
    'element' + elementNum,
    this.stack.pop(), // name
    this.stack.pop() // value
  ]);
};

prototype.printElementHook = function(elementNum) {
  this.printHook('element', [
    'env',
    'element' + elementNum,
    'context',
    this.stack.pop(), // path
    this.stack.pop(), // params
    this.stack.pop() // hash
  ]);
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

prototype.createAttrMorph = function(attrMorphNum, elementNum, name, escaped, namespace) {
  var morphMethod = escaped ? 'createAttrMorph' : 'createUnsafeAttrMorph';
  var morph = "dom."+morphMethod+"(element"+elementNum+", '"+name+(namespace ? "', '"+namespace : '')+"')";
  this.morphs.push(['attrMorph' + attrMorphNum, morph]);
};

prototype.repairClonedNode = function(blankChildTextNodes, isElementChecked) {
  var parent = this.getParent(),
      processing = 'if (this.cachedFragment) { dom.repairClonedNode('+parent+','+
                   array(blankChildTextNodes)+
                   ( isElementChecked ? ',true' : '' )+
                   '); }';
  this.fragmentProcessing.push(
    processing
  );
};

prototype.shareElement = function(elementNum){
  var elementNodesName = "element" + elementNum;
  this.fragmentProcessing.push('var '+elementNodesName+' = '+this.getParent()+';');
  this.parents[this.parents.length-1] = [elementNodesName];
};

prototype.consumeParent = function(i) {
  var newParent = this.lastParent().slice();
  newParent.push(i);

  this.parents.push(newParent);
};

prototype.popParent = function() {
  this.parents.pop();
};

prototype.getParent = function() {
  var last = this.lastParent().slice();
  var frag = last.shift();

  if (!last.length) {
    return frag;
  }

  return 'dom.childAt(' + frag + ', [' + last.join(', ') + '])';
};

prototype.lastParent = function() {
  return this.parents[this.parents.length-1];
};

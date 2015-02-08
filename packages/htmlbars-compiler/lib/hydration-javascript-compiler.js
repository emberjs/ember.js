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
  this.statements = [];
  this.expressionStack = [];
  this.augmentContext = [];

  processOpcodes(this, opcodes);

  if (this.hasOpenBoundary) {
    this.source.unshift(this.indent+"  dom.insertBoundary(fragment, 0);\n");
  }

  if (this.hasCloseBoundary) {
    this.source.unshift(this.indent+"  dom.insertBoundary(fragment, null);\n");
  }

  var i, l;

  var indent = this.indent;

  var morphs;

  var result = {
    createMorphsProgram: '',
    hydrateMorphsProgram: '',
    fragmentProcessingProgram: '',
    statements: this.statements,
    augmentContext: this.augmentContext,
    hasMorphs: false
  };

  result.hydrateMorphsProgram = this.source.join('');

  if (this.morphs.length) {
    result.hasMorphs = true;
    morphs =
      indent+'  var morphs = new Array(' + this.morphs.length + ');\n';

      for (i = 0, l = this.morphs.length; i < l; ++i) {
        var morph = this.morphs[i];
        morphs += indent+'  morphs['+i+'] = '+morph+';\n';
      }
  }

  if (this.fragmentProcessing.length) {
    var processing = "";
    for (i = 0, l = this.fragmentProcessing.length; i < l; ++i) {
      processing += this.indent+this.fragmentProcessing[i]+'\n';
    }
    result.fragmentProcessingProgram = processing;
  }

  if (result.hasMorphs) {
    result.createMorphsProgram =
      'function buildRenderNodes(dom, fragment, contextualElement) {\n' +
      result.fragmentProcessingProgram +
      morphs +
      indent + '  return morphs;\n' +
      indent+'}';
  } else {
    result.createMorphsProgram =
      'function buildRenderNodes() { return []; }';
  }

  return result;
};

prototype.prepareArray = function(length) {
  var values = [];
  var expressionValues = [];

  for (var i = 0; i < length; i++) {
    values.push(this.stack.pop());
    expressionValues.push(this.expressionStack.pop());
  }

  this.expressionStack.push(expressionValues);
  this.stack.push('[' + values.join(', ') + ']');
};

prototype.prepareObject = function(size) {
  var pairs = [];
  var expressionPairs = [];

  for (var i = 0; i < size; i++) {
    pairs.push(this.stack.pop() + ': ' + this.stack.pop());
    expressionPairs.push(this.expressionStack.pop(), this.expressionStack.pop());
  }

  this.expressionStack.push(expressionPairs);
  this.stack.push('{' + pairs.join(', ') + '}');
};

prototype.pushRaw = function(value) {
  this.expressionStack.push(value);
  this.stack.push(value);
};

prototype.openBoundary = function() {
  this.hasOpenBoundary = true;
};

prototype.closeBoundary = function() {
  this.hasCloseBoundary = true;
};

prototype.pushLiteral = function(value) {
  this.expressionStack.push(value);

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

prototype.pushGetHook = function(path, morphNum) {
  this.expressionStack.push([ 'get', path ]);

  this.pushHook('get', [
    'env',
    'morphs[' + morphNum + ']',
    'context',
    string(path)
  ]);
};

prototype.pushSexprHook = function(morphNum) {
  this.expressionStack.push([
    'subexpr',
    this.expressionStack.pop(),
    this.expressionStack.pop(),
    this.expressionStack.pop()
  ]);

  this.pushHook('subexpr', [
    'env',
    'morphs[' + morphNum + ']',
    'context',
    this.stack.pop(), // path
    this.stack.pop(), // params
    this.stack.pop() // hash
  ]);
};

prototype.pushConcatHook = function(morphNum) {
  this.expressionStack.push([ 'concat', this.expressionStack.pop() ]);

  this.pushHook('concat', [
    'env',
    'morphs[' + morphNum + ']',
    this.stack.pop() // parts
  ]);
};

prototype.printHook = function(name, args) {
  this.hooks[name] = true;
  this.source.push(this.indent + '  ' + name + '(' + args.join(', ') + ');\n');
};

prototype.printSetHook = function(name, index) {
  this.augmentContext.push(name);

  this.printHook('set', [
    'env',
    'context',
    string(name),
    'blockArguments[' + index + ']'
  ]);
};

prototype.printBlockHook = function(morphNum, templateId, inverseId) {
  this.statements.push([
    'block',
    this.expressionStack.pop(), // path
    this.expressionStack.pop(), // params
    this.expressionStack.pop(), // hash
    templateId,
    inverseId
  ]);

  this.printHook('block', [
    'env',
    'morphs[' + morphNum + ']',
    'context',
    this.stack.pop(), // path
    this.stack.pop(), // params
    this.stack.pop(), // hash
    templateId === null ? 'null' : 'child' + templateId,
    inverseId === null ? 'null' : 'child' + inverseId
  ]);
};

prototype.printInlineHook = function(morphNum) {
  var path = this.stack.pop();
  var params = this.stack.pop();
  var hash = this.stack.pop();

  var exprPath = this.expressionStack.pop();
  var exprParams = this.expressionStack.pop();
  var exprHash = this.expressionStack.pop();

  this.statements.push([ 'inline', exprPath, exprParams, exprHash ]);

  this.printHook('inline', [
    'env',
    'morphs[' + morphNum + ']',
    'context',
    path,
    params,
    hash
  ]);
};

prototype.printContentHook = function(morphNum) {
  this.statements.push([ 'content', this.expressionStack.pop() ]);

  this.printHook('content', [
    'env',
    'morphs[' + morphNum + ']',
    'context',
    this.stack.pop() // path
  ]);
};

prototype.printComponentHook = function(morphNum, templateId) {
  this.statements.push([
    'component',
    this.expressionStack.pop(), // path
    this.expressionStack.pop(), // attrs
    templateId
  ]);

  this.printHook('component', [
    'env',
    'morphs[' + morphNum + ']',
    'context',
    this.stack.pop(), // path
    this.stack.pop(), // attrs
    templateId === null ? 'null' : 'child' + templateId
  ]);
};

prototype.printAttributeHook = function(attrMorphNum) {
  this.statements.push([
    'attribute',
    this.expressionStack.pop(), // name
    this.expressionStack.pop()  // value;
  ]);

  this.printHook('attribute', [
    'env',
    'morphs[' + attrMorphNum + ']',
    this.stack.pop(), // name
    this.stack.pop() // value
  ]);
};

prototype.printElementHook = function(morphNum) {
  this.statements.push([
    'element',
    this.expressionStack.pop(), // path
    this.expressionStack.pop(), // params
    this.expressionStack.pop()  // hash
  ]);

  this.printHook('element', [
    'env',
    'morphs[' + morphNum + ']',
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

  this.morphs[morphNum] = morph;
};

prototype.createAttrMorph = function(attrMorphNum, elementNum, name, escaped, namespace) {
  var morphMethod = escaped ? 'createAttrMorph' : 'createUnsafeAttrMorph';
  var morph = "dom."+morphMethod+"(element"+elementNum+", '"+name+(namespace ? "', '"+namespace : '')+"')";
  this.morphs[attrMorphNum] = morph;
};

prototype.createElementMorph = function(morphNum, elementNum ) {
  var morphMethod = 'createElementMorph';
  var morph = "dom."+morphMethod+"(element"+elementNum+")";
  this.morphs[morphNum] = morph;
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

import { processOpcodes } from "./utils";
import { array } from "../htmlbars-util/quoting";

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
  this.locals = [];
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

  var indent = this.indent;

  var morphs;

  var result = {
    createMorphsProgram: '',
    hydrateMorphsProgram: '',
    fragmentProcessingProgram: '',
    statements: this.statements,
    locals: this.locals,
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
      processing += this.indent+'  '+this.fragmentProcessing[i]+'\n';
    }
    result.fragmentProcessingProgram = processing;
  }

  var createMorphsProgram;
  if (result.hasMorphs) {
    createMorphsProgram =
      'function buildRenderNodes(dom, fragment, contextualElement) {\n' +
      result.fragmentProcessingProgram + morphs;

      if (this.hasOpenBoundary) {
        createMorphsProgram += indent+"  dom.insertBoundary(fragment, 0);\n";
      }

      if (this.hasCloseBoundary) {
        createMorphsProgram += indent+"  dom.insertBoundary(fragment, null);\n";
      }

      createMorphsProgram +=
      indent + '  return morphs;\n' +
      indent+'}';
  } else {
    createMorphsProgram =
      'function buildRenderNodes() { return []; }';
  }

  result.createMorphsProgram = createMorphsProgram;

  return result;
};

prototype.prepareArray = function(length) {
  var values = [];

  for (var i = 0; i < length; i++) {
    values.push(this.expressionStack.pop());
  }

  this.expressionStack.push(values);
};

prototype.prepareObject = function(size) {
  var pairs = [];

  for (var i = 0; i < size; i++) {
    pairs.push(this.expressionStack.pop(), this.expressionStack.pop());
  }

  this.expressionStack.push(pairs);
};

prototype.openBoundary = function() {
  this.hasOpenBoundary = true;
};

prototype.closeBoundary = function() {
  this.hasCloseBoundary = true;
};

prototype.pushLiteral = function(value) {
  this.expressionStack.push(value);
};

prototype.pushGetHook = function(path) {
  this.expressionStack.push([ 'get', path ]);
};

prototype.pushSexprHook = function() {
  this.expressionStack.push([
    'subexpr',
    this.expressionStack.pop(),
    this.expressionStack.pop(),
    this.expressionStack.pop()
  ]);
};

prototype.pushConcatHook = function() {
  this.expressionStack.push([ 'concat', this.expressionStack.pop() ]);
};

prototype.printSetHook = function(name) {
  this.locals.push(name);
};

prototype.printBlockHook = function(templateId, inverseId) {
  this.statements.push([
    'block',
    this.expressionStack.pop(), // path
    this.expressionStack.pop(), // params
    this.expressionStack.pop(), // hash
    templateId,
    inverseId
  ]);
};

prototype.printInlineHook = function() {
  var path = this.expressionStack.pop();
  var params = this.expressionStack.pop();
  var hash = this.expressionStack.pop();

  this.statements.push([ 'inline', path, params, hash ]);
};

prototype.printContentHook = function() {
  this.statements.push([ 'content', this.expressionStack.pop() ]);
};

prototype.printComponentHook = function(templateId) {
  this.statements.push([
    'component',
    this.expressionStack.pop(), // path
    this.expressionStack.pop(), // attrs
    templateId
  ]);
};

prototype.printAttributeHook = function() {
  this.statements.push([
    'attribute',
    this.expressionStack.pop(), // name
    this.expressionStack.pop()  // value;
  ]);
};

prototype.printElementHook = function() {
  this.statements.push([
    'element',
    this.expressionStack.pop(), // path
    this.expressionStack.pop(), // params
    this.expressionStack.pop()  // hash
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

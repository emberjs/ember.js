import TemplateVisitor from "./template-visitor";
import { processOpcodes } from "./utils";
import { getAttrNamespace } from "../htmlbars-util";
import { forEach } from "../htmlbars-util/array-utils";
import { isHelper } from "../htmlbars-syntax/utils";
import { unwrapMustache } from "../htmlbars-syntax/utils";

function detectIsElementChecked(element){
  for (var i=0, len=element.attributes.length;i<len;i++) {
    if (element.attributes[i].name === 'checked') {
      return true;
    }
  }
  return false;
}

function HydrationOpcodeCompiler() {
  this.opcodes = [];
  this.paths = [];
  this.templateId = 0;
  this.currentDOMChildIndex = 0;
  this.morphs = [];
  this.morphNum = 0;
  this.attrMorphNum = 0;
  this.element = null;
  this.elementNum = -1;
}

export default HydrationOpcodeCompiler;

HydrationOpcodeCompiler.prototype.compile = function(ast) {
  var templateVisitor = new TemplateVisitor();
  templateVisitor.visit(ast);

  processOpcodes(this, templateVisitor.actions);

  return this.opcodes;
};

HydrationOpcodeCompiler.prototype.accept = function(node) {
  this[node.type](node);
};

HydrationOpcodeCompiler.prototype.opcode = function(type) {
  var params = [].slice.call(arguments, 1);
  this.opcodes.push([type, params]);
};

HydrationOpcodeCompiler.prototype.startProgram = function(program, c, blankChildTextNodes) {
  this.opcodes.length = 0;
  this.paths.length = 0;
  this.morphs.length = 0;
  this.templateId = 0;
  this.currentDOMChildIndex = -1;
  this.morphNum = 0;
  this.attrMorphNum = 0;

  var blockParams = program.blockParams || [];

  for (var i = 0; i < blockParams.length; i++) {
    this.opcode('printSetHook', blockParams[i], i);
  }

  if (blankChildTextNodes.length > 0) {
    this.opcode('repairClonedNode', blankChildTextNodes);
  }
};

HydrationOpcodeCompiler.prototype.endProgram = function() {
  distributeMorphs(this.morphs, this.opcodes);
};

HydrationOpcodeCompiler.prototype.text = function() {
  ++this.currentDOMChildIndex;
};

HydrationOpcodeCompiler.prototype.comment = function() {
  ++this.currentDOMChildIndex;
};

HydrationOpcodeCompiler.prototype.openElement = function(element, pos, len, mustacheCount, blankChildTextNodes) {
  distributeMorphs(this.morphs, this.opcodes);
  ++this.currentDOMChildIndex;

  this.element = this.currentDOMChildIndex;

  this.opcode('consumeParent', this.currentDOMChildIndex);

  // If our parent reference will be used more than once, cache its reference.
  if (mustacheCount > 1) {
    this.opcode('shareElement', ++this.elementNum);
    this.element = null; // Set element to null so we don't cache it twice
  }

  var isElementChecked = detectIsElementChecked(element);
  if (blankChildTextNodes.length > 0 || isElementChecked) {
    this.opcode( 'repairClonedNode',
                 blankChildTextNodes,
                 isElementChecked );
  }

  this.paths.push(this.currentDOMChildIndex);
  this.currentDOMChildIndex = -1;

  forEach(element.attributes, this.attribute, this);
  forEach(element.helpers, this.elementHelper, this);
};

HydrationOpcodeCompiler.prototype.closeElement = function() {
  distributeMorphs(this.morphs, this.opcodes);
  this.opcode('popParent');
  this.currentDOMChildIndex = this.paths.pop();
};

HydrationOpcodeCompiler.prototype.mustache = function(mustache, childIndex, childCount) {
  this.pushMorphPlaceholderNode(childIndex, childCount);

  var morphNum = this.morphNum++;
  var start = this.currentDOMChildIndex;
  var end = this.currentDOMChildIndex;
  this.morphs.push([morphNum, this.paths.slice(), start, end, mustache.escaped]);

  if (isHelper(mustache)) {
    prepareHash(this, mustache.hash);
    prepareParams(this, mustache.params);
    preparePath(this, mustache.path);
    this.opcode('printInlineHook', morphNum);
  } else {
    preparePath(this, mustache.path);
    this.opcode('printContentHook', morphNum);
  }
};

HydrationOpcodeCompiler.prototype.block = function(block, childIndex, childCount) {
  this.pushMorphPlaceholderNode(childIndex, childCount);

  var morphNum = this.morphNum++;
  var start = this.currentDOMChildIndex;
  var end = this.currentDOMChildIndex;
  this.morphs.push([morphNum, this.paths.slice(), start, end, true]);

  var templateId = this.templateId++;
  var inverseId = block.inverse === null ? null : this.templateId++;

  prepareHash(this, block.hash);
  prepareParams(this, block.params);
  preparePath(this, block.path);
  this.opcode('printBlockHook', morphNum, templateId, inverseId);
};

HydrationOpcodeCompiler.prototype.component = function(component, childIndex, childCount) {
  this.pushMorphPlaceholderNode(childIndex, childCount);

  var program = component.program || {};
  var blockParams = program.blockParams || [];

  var morphNum = this.morphNum++;
  var start = this.currentDOMChildIndex;
  var end = this.currentDOMChildIndex;
  this.morphs.push([morphNum, this.paths.slice(), start, end, true]);

  var attrs = component.attributes;
  for (var i = attrs.length - 1; i >= 0; i--) {
    var name = attrs[i].name;
    var value = attrs[i].value;

    // TODO: Introduce context specific AST nodes to avoid switching here.
    if (value.type === 'TextNode') {
      this.opcode('pushLiteral', value.chars);
    } else if (value.type === 'MustacheStatement') {
      this.accept(unwrapMustache(value));
    } else if (value.type === 'ConcatStatement') {
      prepareParams(this, value.parts);
      this.opcode('pushConcatHook');
    }

    this.opcode('pushLiteral', name);
  }

  this.opcode('prepareObject', attrs.length);
  this.opcode('pushLiteral', component.tag);
  this.opcode('printComponentHook', morphNum, this.templateId++, blockParams.length);
};

HydrationOpcodeCompiler.prototype.attribute = function(attr) {
  var value = attr.value;
  var escaped = true;
  var namespace = getAttrNamespace(attr.name);

  // TODO: Introduce context specific AST nodes to avoid switching here.
  if (value.type === 'TextNode') {
    return;
  } else if (value.type === 'MustacheStatement') {
    escaped = value.escaped;
    this.accept(unwrapMustache(value));
  } else if (value.type === 'ConcatStatement') {
    prepareParams(this, value.parts);
    this.opcode('pushConcatHook');
  }

  this.opcode('pushLiteral', attr.name);

  if (this.element !== null) {
    this.opcode('shareElement', ++this.elementNum);
    this.element = null;
  }

  var attrMorphNum = this.attrMorphNum++;
  this.opcode('createAttrMorph', attrMorphNum, this.elementNum, attr.name, escaped, namespace);
  this.opcode('printAttributeHook', attrMorphNum, this.elementNum);
};

HydrationOpcodeCompiler.prototype.elementHelper = function(sexpr) {
  prepareHash(this, sexpr.hash);
  prepareParams(this, sexpr.params);
  preparePath(this, sexpr.path);

  // If we have a helper in a node, and this element has not been cached, cache it
  if (this.element !== null) {
    this.opcode('shareElement', ++this.elementNum);
    this.element = null; // Reset element so we don't cache it more than once
  }

  this.opcode('printElementHook', this.elementNum);
};

HydrationOpcodeCompiler.prototype.pushMorphPlaceholderNode = function(childIndex, childCount) {
  if (this.paths.length === 0) {
    if (childIndex === 0) {
      this.opcode('openBoundary');
    }
    if (childIndex === childCount - 1) {
      this.opcode('closeBoundary');
    }
  }
  this.comment();
};

HydrationOpcodeCompiler.prototype.MustacheStatement = function(mustache) {
  prepareHash(this, mustache.hash);
  prepareParams(this, mustache.params);
  preparePath(this, mustache.path);
  this.opcode('pushSexprHook');
};

HydrationOpcodeCompiler.prototype.SubExpression = function(sexpr) {
  prepareHash(this, sexpr.hash);
  prepareParams(this, sexpr.params);
  preparePath(this, sexpr.path);
  this.opcode('pushSexprHook');
};

HydrationOpcodeCompiler.prototype.PathExpression = function(path) {
  this.opcode('pushGetHook', path.original);
};

HydrationOpcodeCompiler.prototype.StringLiteral = function(node) {
  this.opcode('pushLiteral', node.value);
};

HydrationOpcodeCompiler.prototype.BooleanLiteral = function(node) {
  this.opcode('pushLiteral', node.value);
};

HydrationOpcodeCompiler.prototype.NumberLiteral = function(node) {
  this.opcode('pushLiteral', node.value);
};

function preparePath(compiler, path) {
  compiler.opcode('pushLiteral', path.original);
}

function prepareParams(compiler, params) {
  for (var i = params.length - 1; i >= 0; i--) {
    var param = params[i];
    compiler[param.type](param);
  }

  compiler.opcode('prepareArray', params.length);
}

function prepareHash(compiler, hash) {
  var pairs = hash.pairs;

  for (var i = pairs.length - 1; i >= 0; i--) {
    var key = pairs[i].key;
    var value = pairs[i].value;

    compiler[value.type](value);
    compiler.opcode('pushLiteral', key);
  }

  compiler.opcode('prepareObject', pairs.length);
}

function distributeMorphs(morphs, opcodes) {
  if (morphs.length === 0) {
    return;
  }

  // Splice morphs after the most recent shareParent/consumeParent.
  var o;
  for (o = opcodes.length - 1; o >= 0; --o) {
    var opcode = opcodes[o][0];
    if (opcode === 'shareElement' || opcode === 'consumeParent'  || opcode === 'popParent') {
      break;
    }
  }

  var spliceArgs = [o + 1, 0];
  for (var i = 0; i < morphs.length; ++i) {
    spliceArgs.push(['createMorph', morphs[i].slice()]);
  }
  opcodes.splice.apply(opcodes, spliceArgs);
  morphs.length = 0;
}

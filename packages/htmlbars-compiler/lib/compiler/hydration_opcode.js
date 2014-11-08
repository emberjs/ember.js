import TemplateVisitor from "./template_visitor";
import { processOpcodes } from "./utils";
import { forEach } from "../utils";
import { buildHashFromAttributes } from "../html-parser/helpers";

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
  this.element = null;
  this.elementNum = -1;
}

HydrationOpcodeCompiler.prototype.compile = function(ast) {
  var templateVisitor = new TemplateVisitor();
  templateVisitor.visit(ast);

  processOpcodes(this, templateVisitor.actions);

  return this.opcodes;
};

HydrationOpcodeCompiler.prototype.startProgram = function(p, c, blankChildTextNodes) {
  this.opcodes.length = 0;
  this.paths.length = 0;
  this.morphs.length = 0;
  this.templateId = 0;
  this.currentDOMChildIndex = -1;
  this.morphNum = 0;

  if (blankChildTextNodes.length > 0){
    this.opcode( 'repairClonedNode',
                 blankChildTextNodes );
  }
};

HydrationOpcodeCompiler.prototype.endProgram = function(/* program */) {
  distributeMorphs(this.morphs, this.opcodes);
};

HydrationOpcodeCompiler.prototype.text = function(/* string, pos, len */) {
  ++this.currentDOMChildIndex;
};

HydrationOpcodeCompiler.prototype.openElement = function(element, pos, len, isSingleRoot, mustacheCount, blankChildTextNodes) {
  distributeMorphs(this.morphs, this.opcodes);
  ++this.currentDOMChildIndex;

  this.element = this.currentDOMChildIndex;

  if (!isSingleRoot) {
    this.opcode('consumeParent', this.currentDOMChildIndex);

    // If our parent referance will be used more than once, cache its referance.
    if (mustacheCount > 1) {
      this.opcode('element', ++this.elementNum);
      this.element = null; // Set element to null so we don't cache it twice
    }
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
  forEach(element.helpers, this.nodeHelper, this);
};

HydrationOpcodeCompiler.prototype.closeElement = function(element, pos, len, isSingleRoot) {
  distributeMorphs(this.morphs, this.opcodes);
  if (!isSingleRoot) { this.opcode('popParent'); }
  this.currentDOMChildIndex = this.paths.pop();
};

HydrationOpcodeCompiler.prototype.block = function(block, childIndex, childrenLength) {
  var currentDOMChildIndex = this.currentDOMChildIndex,
      mustache = block.mustache;

  var start = (currentDOMChildIndex < 0 ? null : currentDOMChildIndex),
      end = (childIndex === childrenLength - 1 ? null : currentDOMChildIndex + 1);

  var morphNum = this.morphNum++;
  this.morphs.push([morphNum, this.paths.slice(), start, end]);

  this.opcode('program', this.templateId++, block.inverse === null ? null : this.templateId++);
  processParams(this, mustache.params);
  processHash(this, mustache.hash);
  this.opcode('helper', mustache.id.string, mustache.params.length, mustache.escaped, morphNum);
};

HydrationOpcodeCompiler.prototype.component = function(component, childIndex, childrenLength) {
  var currentDOMChildIndex = this.currentDOMChildIndex;

  var start = (currentDOMChildIndex < 0 ? null : currentDOMChildIndex),
      end = (childIndex === childrenLength - 1 ? null : currentDOMChildIndex + 1);

  var morphNum = this.morphNum++;
  this.morphs.push([morphNum, this.paths.slice(), start, end]);

  this.opcode('program', this.templateId++, null);
  processHash(this, buildHashFromAttributes(component.attributes));
  this.opcode('component', component.tag, morphNum);
};

HydrationOpcodeCompiler.prototype.opcode = function(type) {
  var params = [].slice.call(arguments, 1);
  this.opcodes.push([type, params]);
};

HydrationOpcodeCompiler.prototype.attribute = function(attr) {
  if (attr.value.type === 'text') {
    return;
  }

  // We treat attribute like a attribute helper evaluated by the element hook.
  // <p {{attribute 'class' 'foo ' (bar)}}></p>
  // Unwrapped any mustaches to just be their internal sexprs.
  this.nodeHelper({
    params: [attr.name, attr.value.sexpr],
    hash: null,
    id: {
      string: 'attribute'
    }
  });
};

HydrationOpcodeCompiler.prototype.nodeHelper = function(mustache) {
  this.opcode('program', null, null);
  processParams(this, mustache.params);
  processHash(this, mustache.hash);
  // If we have a helper in a node, and this element has not been cached, cache it
  if(this.element !== null){
    this.opcode('element', ++this.elementNum);
    this.element = null; // Reset element so we don't cache it more than once
  }
  this.opcode('nodeHelper', mustache.id.string, mustache.params.length, this.elementNum);
};

HydrationOpcodeCompiler.prototype.mustache = function(mustache, childIndex, childrenLength) {
  var currentDOMChildIndex = this.currentDOMChildIndex;

  var start = currentDOMChildIndex,
      end = (childIndex === childrenLength - 1 ? -1 : currentDOMChildIndex + 1);

  var morphNum = this.morphNum++;
  this.morphs.push([morphNum, this.paths.slice(), start, end]);

  if (mustache.isHelper) {
    this.opcode('program', null, null);
    processParams(this, mustache.params);
    processHash(this, mustache.hash);
    this.opcode('helper', mustache.id.string, mustache.params.length, mustache.escaped, morphNum);
  } else {
    this.opcode('ambiguous', mustache.id.string, mustache.escaped, morphNum);
  }
};

HydrationOpcodeCompiler.prototype.sexpr = function(sexpr) {
  this.string('sexpr');
  this.opcode('program', null, null);
  processParams(this, sexpr.params);
  processHash(this, sexpr.hash);
  this.opcode('sexpr', sexpr.id.string, sexpr.params.length);
};

HydrationOpcodeCompiler.prototype.string = function(str) {
  this.opcode('string', str);
};

HydrationOpcodeCompiler.prototype.mustacheInAttr = function(mustache) {
  if (mustache.isHelper) {
    this.opcode('program', null, null);
    processParams(this, mustache.params);
    processHash(this, mustache.hash);
    this.opcode('helperAttr', mustache.id.string, mustache.params.length, mustache.escaped);
  } else {
    this.opcode('ambiguousAttr', mustache.id.string, mustache.escaped);
  }
};

HydrationOpcodeCompiler.prototype.ID = function(id) {
  this.opcode('id', id.parts);
};

HydrationOpcodeCompiler.prototype.STRING = function(string) {
  this.opcode('stringLiteral', string.stringModeValue);
};

HydrationOpcodeCompiler.prototype.BOOLEAN = function(boolean) {
  this.opcode('literal', boolean.stringModeValue);
};

HydrationOpcodeCompiler.prototype.INTEGER = function(integer) {
  this.opcode('literal', integer.stringModeValue);
};

function processParams(compiler, params) {
  forEach(params, function(param) {
    if (param.type === 'text') {
      compiler.STRING({ stringModeValue: param.chars });
    } else if (param.type) {
      compiler[param.type](param);
    } else {
      compiler.STRING({ stringModeValue: param });
    }
  });
}

function processHash(compiler, hash) {
  if (hash) {
    forEach(hash.pairs, function(pair) {
      var name = pair[0], param = pair[1];
      compiler[param.type](param);
      compiler.opcode('stackLiteral', name);
    });
    compiler.opcode('stackLiteral', hash.pairs.length);
  } else {
    compiler.opcode('stackLiteral', 0);
  }
}

function distributeMorphs(morphs, opcodes) {
  if (morphs.length === 0) {
    return;
  }

  // Splice morphs after the most recent shareParent/consumeParent.
  var o;
  for (o = opcodes.length - 1; o >= 0; --o) {
    var opcode = opcodes[o][0];
    if (opcode === 'element' || opcode === 'consumeParent'  || opcode === 'popParent') {
      break;
    }
  }

  var spliceArgs = [o + 1, 0];
  for (var i = 0; i < morphs.length; ++i) {
    var p = morphs[i];
    spliceArgs.push(['morph', [p[0], p[1], p[2], p[3]]]);
  }
  opcodes.splice.apply(opcodes, spliceArgs);
  morphs.length = 0;
}

export { HydrationOpcodeCompiler };

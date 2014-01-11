import { ASTWalker } from "./ast_walker";

function HydrationOpcodeCompiler() {
  this.opcodes = [];
  this.paths = [];
  this.templateId = 0;
  this.currentDOMChildIndex = 0;
}

HydrationOpcodeCompiler.prototype.compile = function(ast) {
  var astWalker = new ASTWalker(this);
  astWalker.visit(ast);
  return this.opcodes;
};

HydrationOpcodeCompiler.prototype.startTemplate = function() {
  this.opcodes.length = 0;
  this.paths.length = 0;
  this.templateId = 0;
  this.currentDOMChildIndex = -1;
};

HydrationOpcodeCompiler.prototype.endTemplate = function() {};

HydrationOpcodeCompiler.prototype.text = function(string) {
  ++this.currentDOMChildIndex;
};

HydrationOpcodeCompiler.prototype.openElement = function(element) {
  this.paths.push(++this.currentDOMChildIndex);
  this.currentDOMChildIndex = -1;

  element.attributes.forEach(function(attribute) {
    this.attribute(attribute);
  }, this);

  element.helpers.forEach(function(helper) {
    this.nodeHelper(helper);
  }, this);
};

HydrationOpcodeCompiler.prototype.closeElement = function(element) {
  this.currentDOMChildIndex = this.paths.pop();
};

HydrationOpcodeCompiler.prototype.node = function (node, childIndex, childrenLength) {
  this[node.type](node, childIndex, childrenLength);
};

HydrationOpcodeCompiler.prototype.block = function(block, childIndex, childrenLength) {
  var currentDOMChildIndex = this.currentDOMChildIndex,
      mustache = block.helper;

  var start = (currentDOMChildIndex < 0 ? null : currentDOMChildIndex),
      end = (childIndex === childrenLength - 1 ? null : currentDOMChildIndex + 1);

  this.opcode('program', this.templateId++, this.templateId++);
  processParams(this, mustache.params);
  processHash(this, mustache.hash);
  this.opcode('helper', mustache.id.string, mustache.params.length, mustache.escaped, this.paths.slice(), start, end);
};

HydrationOpcodeCompiler.prototype.opcode = function(type) {
  var params = [].slice.call(arguments, 1);
  this.opcodes.push([type, params]);
};

HydrationOpcodeCompiler.prototype.attribute = function(attribute) {
  var name = attribute[0], value = attribute[1];

  if (value.length === 0 || (value.length === 1 && typeof value[0] === 'string')) {
    return;
  }

  var node;
  for (var i = value.length - 1; i >= 0; i--) {
    node = value[i];

    if (typeof node === 'string') {
      this.string(node);
    } else {
      this[node.type + 'InAttr'](node);
    }
  }

  this.opcode('attribute', name, value.length, this.paths.slice());
};

HydrationOpcodeCompiler.prototype.nodeHelper = function(mustache) {
  this.opcode('program', null, null);
  processParams(this, mustache.params);
  processHash(this, mustache.hash);
  this.opcode('nodeHelper', mustache.id.string, mustache.params.length, this.paths.slice());
};

HydrationOpcodeCompiler.prototype.mustache = function(mustache, childIndex, childrenLength) {
  var currentDOMChildIndex = this.currentDOMChildIndex;

  var start = (currentDOMChildIndex < 0 ? null : currentDOMChildIndex),
      end = (childIndex === childrenLength - 1 ? null : currentDOMChildIndex + 1);

  if (mustache.isHelper) {
    this.opcode('program', null, null);
    processParams(this, mustache.params);
    processHash(this, mustache.hash);
    this.opcode('helper', mustache.id.string, mustache.params.length, mustache.escaped, this.paths.slice(), start, end);
  } else {
    this.opcode('ambiguous', mustache.id.string, mustache.escaped, this.paths.slice(), start, end);
  }
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
  params.forEach(function(param) {
    compiler[param.type](param);
  });
}

function processHash(compiler, hash) {
  if (hash) {
    hash.pairs.forEach(function(pair) {
      var name = pair[0], param = pair[1];
      compiler[param.type](param);
      compiler.opcode('stackLiteral', name);
    });
    compiler.opcode('stackLiteral', hash.pairs.length);
  } else {
    compiler.opcode('stackLiteral', 0);
  }
}

export { HydrationOpcodeCompiler };

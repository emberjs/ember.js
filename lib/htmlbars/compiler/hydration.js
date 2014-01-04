import { merge } from "htmlbars/utils";
import { HTMLElement, BlockElement } from "htmlbars/ast";

function HydrationCompiler(compileAST, options) {
  this.compileAST = compileAST;
  this.options = options || {};

  var knownHelpers = {
    'helperMissing': true,
    'blockHelperMissing': true,
    'each': true,
    'if': true,
    'unless': true,
    'with': true,
    'log': true
  };

  this.options.knownHelpers = this.options.knownHelpers || {};
  merge(knownHelpers, this.options.knownHelpers);
}

var compiler1 = HydrationCompiler.prototype;

compiler1.compile = function(ast) {
  this.opcodes = [];
  this.paths = [];
  this.children = [];
  processChildren(this, ast);
  return this.opcodes;
};

function processChildren(compiler, children) {
  var node, lastNode, currentDOMChildIndex = -1;

  for (var i=0, l=children.length; i<l; i++) {
    node = children[i];

    if (typeof node === 'string') {
      ++currentDOMChildIndex;
      // compiler.string(node);
    } else if (node instanceof HTMLElement) {
      compiler.paths.push(++currentDOMChildIndex);
      compiler.element(node, i, l, currentDOMChildIndex);
      compiler.paths.pop();
    } else if (node instanceof BlockElement) {
      compiler.block(node);
    } else {
      compiler[node.type](node, i, l, currentDOMChildIndex);
    }

    lastNode = node;
  }
}

compiler1.block = function(block) {
  var program = this.compileAST(block.children, this.options),
      inverse = this.compileAST(block.inverse, this.options),
      mustache = block.helper;

  this.children.push(program);
  var programId = this.children.length - 1;

  this.children.push(inverse);
  var inverseId = this.children.length - 1;

  this.opcode('program', programId, inverseId);
  processParams(this, mustache.params);
  processHash(this, mustache.hash);
  this.opcode('helper', mustache.id.string, mustache.params.length, mustache.escaped);
  this.opcode('appendFragment');
};

compiler1.opcode = function(type) {
  var params = [].slice.call(arguments, 1);
  this.opcodes.push({ type: type, params: params });
};

compiler1.string = function(string) {
  this.opcode('content', string);
};

compiler1.element = function(element, childIndex, childrenLength, currentDOMChildIndex) {
  // this.opcode('openElement', element.tag);

  element.attributes.forEach(function(attribute) {
    this.attribute(attribute);
  }, this);

  element.helpers.forEach(function(helper) {
    this.nodeHelper(helper);
  }, this);

  processChildren(this, element.children);

  // this.opcode('closeElement');
};

compiler1.attribute = function(attribute) {
  var name = attribute[0],
      value = attribute[1];

  value.forEach(function(node) {
    if (typeof node === 'string') {
      this.string(node);
    } else {
      this[node.type + 'InAttr'](node);
    }
  }, this);

  this.opcode('attribute', name, value.length, this.paths.slice());
};

compiler1.nodeHelper = function(mustache) {
  this.opcode('program', null);
  processParams(this, mustache.params);
  processHash(this, mustache.hash);

  this.opcode('nodeHelper', mustache.id.string, mustache.params.length, this.paths.slice());
};

compiler1.mustache = function(mustache, childIndex, childrenLength, currentDOMChildIndex) {
  var type = classifyMustache(mustache, this.options);

  var start = (currentDOMChildIndex < 0 ? null : currentDOMChildIndex),
      end = (childIndex === childrenLength - 1 ? null : currentDOMChildIndex + 1);

  if (type === 'simple' || type === 'ambiguous') {
    this.opcode('ambiguous', mustache.id.string, mustache.escaped, this.paths.slice(), start, end);
  } else {
    this.opcode('program', null);
    processParams(this, mustache.params);
    processHash(this, mustache.hash);
    this.opcode('helper', mustache.id.string, mustache.params.length, mustache.escaped, this.paths.slice(), start, end);
  }

  // appendMustache(this, mustache);
};

compiler1.mustacheInAttr = function(mustache) {
  var type = classifyMustache(mustache, this.options);

  if (type === 'simple' || type === 'ambiguous') {
    this.opcode('ambiguous', mustache.id.string, mustache.escaped);
  } else {
    this.opcode('program', null);
    processParams(this, mustache.params);
    processHash(this, mustache.hash);
    this.opcode('helper', mustache.id.string, mustache.params.length, mustache.escaped);
  }

  // appendMustache(this, mustache);
};

compiler1.ID = function(id) {
  this.opcode('id', id.parts);
};

compiler1.STRING = function(string) {
  this.opcode('string', string.stringModeValue);
};

compiler1.BOOLEAN = function(boolean) {
  this.opcode('literal', boolean.stringModeValue);
};

compiler1.INTEGER = function(integer) {
  this.opcode('literal', integer.stringModeValue);
};

function classifyMustache(mustache, options) {
  var isHelper   = mustache.isHelper;
  var isEligible = mustache.eligibleHelper;

  // if ambiguous, we can possibly resolve the ambiguity now
  if (isEligible && !isHelper) {
    var name = mustache.id.parts[0];

    if (options.knownHelpers[name]) {
      isHelper = true;
    } else if (options.knownHelpersOnly) {
      isEligible = false;
    }
  }

  if (isHelper) { return "helper"; }
  else if (isEligible) { return "ambiguous"; }
  else { return "simple"; }
}

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

function appendMustache(compiler, mustache) {
  if (mustache.escaped) {
    compiler.opcode('appendText');
  } else {
    compiler.opcode('appendHTML');
  }
}

export { HydrationCompiler };

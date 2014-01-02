import { merge } from "htmlbars/utils";
import { HTMLElement, BlockElement } from "htmlbars/ast";
import { AttrCompiler } from "htmlbars/compiler/attr";
import { compileAST } from "htmlbars/compiler/utils";

function compileAttr(ast, options) {
  var compiler1 = new Compiler1(options),
      attrCompiler = new AttrCompiler(options);

  var opcodes = compiler1.compile(ast);
  return attrCompiler.compile(opcodes);
}

function Compiler1(options) {
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
};

var compiler1 = Compiler1.prototype;

compiler1.compile = function(ast) {
  this.opcodes = [];
  this.children = [];
  processChildren(this, ast);
  return this.opcodes;
};

function processChildren(compiler, children) {
  var node;

  for (var i=0, l=children.length; i<l; i++) {
    node = children[i];

    if (typeof node === 'string') {
      compiler.string(node);
    } else if (node instanceof HTMLElement) {
      compiler.element(node);
    } else if (node instanceof BlockElement) {
      compiler.block(node);
    } else {
      compiler[node.type](node);
    }
  }
}

compiler1.block = function(block) {
  var program = compileAST(block.children, this.options),
      inverse = compileAST(block.inverse, this.options),
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

compiler1.element = function(element) {
  this.opcode('openElement', element.tag);

  element.attributes.forEach(function(attribute) {
    this.attribute(attribute);
  }, this);

  element.helpers.forEach(function(helper) {
    this.nodeHelper(helper);
  }, this);

  processChildren(this, element.children);

  this.opcode('closeElement');
};

compiler1.attribute = function(attribute) {
  var name = attribute[0],
      value = attribute[1];

  var program = compileAttr(value);
  this.children.push(program);

  this.opcode('attribute', name, this.children.length - 1);
  return;
};

compiler1.nodeHelper = function(mustache) {
  this.opcode('program', null);
  processParams(this, mustache.params);
  processHash(this, mustache.hash);
  this.opcode('nodeHelper', mustache.id.string, mustache.params.length);
};

compiler1.mustache = function(mustache) {
  var type = classifyMustache(mustache, this.options);

  if (type === 'simple') {
    this.opcode('dynamic', mustache.id.parts, mustache.escaped);
  } else if (type === 'ambiguous') {
    this.opcode('ambiguous', mustache.id.string, mustache.escaped);
  } else {
    this.opcode('program', null);
    processParams(this, mustache.params);
    processHash(this, mustache.hash);
    this.opcode('helper', mustache.id.string, mustache.params.length, mustache.escaped);
  }

  appendMustache(this, mustache);
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
}

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

export { Compiler1 };

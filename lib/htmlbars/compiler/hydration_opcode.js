import { merge } from "htmlbars/utils";
import { HTMLElement, BlockElement } from "htmlbars/ast";

function HydrationOpcodeCompiler(options) {
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

var compiler1 = HydrationOpcodeCompiler.prototype;

compiler1.compile = function(ast) {
  this.opcodes = [];
  this.paths = [];
  this.children = [];
  processChildren(this, ast);
  return {
    opcodes: this.opcodes,
    children: this.children
  };
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
      compiler.block(node, i, l, currentDOMChildIndex);
    } else {
      compiler[node.type](node, i, l, currentDOMChildIndex);
    }

    lastNode = node;
  }
}

compiler1.block = function(block, childIndex, childrenLength, currentDOMChildIndex) {
  var compiler = new HydrationOpcodeCompiler();

  var program = compiler.compile(block.children, this.options),
      inverse = compiler.compile(block.inverse, this.options),
      mustache = block.helper;


  var start = (currentDOMChildIndex < 0 ? null : currentDOMChildIndex),
      end = (childIndex === childrenLength - 1 ? null : currentDOMChildIndex + 1);

  this.children.push(program);
  var programId = this.children.length - 1;

  this.children.push(inverse);
  var inverseId = this.children.length - 1;

  this.opcode('program', programId, inverseId);
  processParams(this, mustache.params);
  processHash(this, mustache.hash);
  this.opcode('helper', mustache.id.string, mustache.params.length, mustache.escaped, this.paths.slice(), start, end);
};

compiler1.opcode = function(type) {
  var params = [].slice.call(arguments, 1);
  this.opcodes.push({ type: type, params: params });
};

compiler1.element = function(element, childIndex, childrenLength, currentDOMChildIndex) {
  element.attributes.forEach(function(attribute) {
    this.attribute(attribute);
  }, this);

  element.helpers.forEach(function(helper) {
    this.nodeHelper(helper);
  }, this);

  processChildren(this, element.children);
};

compiler1.attribute = function(attribute) {
  var name = attribute[0],
      value = attribute[1],
      hasMustache = false;

  // TODO: improve this
  value.forEach(function(node) {
    if (typeof node !== 'string') {
      hasMustache = true;
    }
  });

  if (hasMustache) {
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
  }
};

compiler1.nodeHelper = function(mustache) {
  this.opcode('program', null, null);
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
    this.opcode('program', null, null);
    processParams(this, mustache.params);
    processHash(this, mustache.hash);
    this.opcode('helper', mustache.id.string, mustache.params.length, mustache.escaped, this.paths.slice(), start, end);
  }
};

compiler1.string = function(str) {
  this.opcode('string', str);
};

compiler1.mustacheInAttr = function(mustache) {
  var type = classifyMustache(mustache, this.options);

  if (type === 'simple' || type === 'ambiguous') {
    this.opcode('ambiguousAttr', mustache.id.string, mustache.escaped);
  } else {
    this.opcode('program', null, null);
    processParams(this, mustache.params);
    processHash(this, mustache.hash);
    this.opcode('helperAttr', mustache.id.string, mustache.params.length, mustache.escaped);
  }
};

compiler1.ID = function(id) {
  this.opcode('id', id.parts);
};

compiler1.STRING = function(string) {
  this.opcode('stringLiteral', string.stringModeValue);
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

export { HydrationOpcodeCompiler };

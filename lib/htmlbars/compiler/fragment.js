import { HTMLElement, BlockElement } from "htmlbars/ast";
import { AttrCompiler } from "htmlbars/compiler/attr";

function compileAttr(ast, options) {
  var compiler1 = new Compiler1(options),
      attrCompiler = new AttrCompiler(options);

  var opcodes = compiler1.compile(ast);
  return attrCompiler.compile(opcodes);
}

function Fragment(options) {
  this.options = options || {};
}

var prototype = Fragment.prototype;

prototype.compile = function(ast) {
  this.opcodes = [];
  this.opcodes2 = [];
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
      compiler.string(node);
    } else if (node instanceof HTMLElement) {
      compiler.paths.push(++currentDOMChildIndex);
      compiler.element(node);
      compiler.paths.pop();
    } else if (node instanceof BlockElement) {
      compiler.block(node);
    } else {
      if (lastNode && lastNode.type === node.type) {
        ++currentDOMChildIndex;
        compiler.string();
      }
      compiler[node.type](node, i, l, currentDOMChildIndex);
    }

    lastNode = node;
  }
}

prototype.block = function(block) {
  var mustache = block.helper;
  console.log(JSON.stringify(mustache));
};

prototype.opcode = function(type) {
  var params = [].slice.call(arguments, 1);
  this.opcodes.push({ type: type, params: params });
};

prototype.opcode2 = function() {
  var params = [].slice.call(arguments);
  this.opcodes2.push(params);
};

prototype.string = function(string) {
  this.opcode('content', string);
};

prototype.element = function(element) {
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

prototype.attribute = function(attribute) {
  var name = attribute[0],
      value = attribute[1];

  var program = compileAttr(value);
  this.children.push(program);

  this.opcode('attribute', name, this.children.length - 1);
  return;
};

prototype.nodeHelper = function(mustache) {
  console.log(JSON.stringify(mustache));
};

prototype.mustache = function(mustache, childIndex, childrenLength, currentDOMChildIndex) {
  console.log(JSON.stringify(mustache));
};

prototype.ID = function(id) {
  this.opcode('id', id.parts);
};

prototype.STRING = function(string) {
  this.opcode('string', string.stringModeValue);
};

prototype.BOOLEAN = function(boolean) {
  this.opcode('literal', boolean.stringModeValue);
};

prototype.INTEGER = function(integer) {
  this.opcode('literal', integer.stringModeValue);
};

export { Fragment };

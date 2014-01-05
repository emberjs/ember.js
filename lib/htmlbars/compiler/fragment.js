import { HTMLElement, BlockElement } from "htmlbars/ast";

function Fragment() {}

var prototype = Fragment.prototype;

prototype.compile = function(ast) {
  this.opcodes = [];
  this.children = [];
  processChildren(this, ast);
  return {
    opcodes: this.opcodes,
    children: this.children
  };
};

function processChildren(compiler, children) {
  var node, lastNode;

  for (var i=0, l=children.length; i<l; i++) {
    node = children[i];

    if (typeof node === 'string') {
      compiler.string(node);
    } else if (node instanceof HTMLElement) {
      compiler.element(node);
    } else if (node instanceof BlockElement) {
      compiler.block(node);
    }

    lastNode = node;
  }
}

prototype.opcode = function(type) {
  var params = [].slice.call(arguments, 1);
  this.opcodes.push({ type: type, params: params });
};

prototype.string = function(string) {
  this.opcode('content', string);
};

prototype.element = function(element) {
  this.opcode('openElement', element.tag);

  element.attributes.forEach(function(attribute) {
    this.attribute(attribute);
  }, this);

  processChildren(this, element.children);

  this.opcode('closeElement');
};

prototype.attribute = function(attribute) {
  var name = attribute[0],
      value = attribute[1],
      hasMustache = false;

  if (value.length === 1 && typeof value[0] === 'string') {
    this.opcode('setAttribute', name, value[0]);
  }
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

prototype.block = function(block) {
  var compiler = new Fragment(),
      program = compiler.compile(block.children, this.options),
      inverse = compiler.compile(block.inverse, this.options);

  this.children.push(program);
  this.children.push(inverse);
};

export { Fragment };

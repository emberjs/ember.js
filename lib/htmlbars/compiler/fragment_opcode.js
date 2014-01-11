import { ASTWalker } from "./ast_walker";

function FragmentOpcodeCompiler() {
  this.opcodes = [];
}

FragmentOpcodeCompiler.prototype.compile = function(ast) {
  var astWalker = new ASTWalker(this);
  astWalker.visit(ast);
  return this.opcodes;
};

FragmentOpcodeCompiler.prototype.opcode = function(type, params) {
  this.opcodes.push([type, params]);
};

FragmentOpcodeCompiler.prototype.text = function(string) {
  this.opcode('text', [string]);
};

FragmentOpcodeCompiler.prototype.openElement = function(element) {
  this.opcode('openElement', [element.tag]);

  element.attributes.forEach(function(attribute) {
    this.attribute(attribute);
  }, this);
};

FragmentOpcodeCompiler.prototype.closeElement = function(element) {
  this.opcode('closeElement', [element.tag]);
};

FragmentOpcodeCompiler.prototype.startTemplate = function() {
  this.opcodes.length = 0;
};

FragmentOpcodeCompiler.prototype.endTemplate = function() {};

FragmentOpcodeCompiler.prototype.node = function () {};

FragmentOpcodeCompiler.prototype.block = function () {};

FragmentOpcodeCompiler.prototype.attribute = function(attribute) {
  var name = attribute[0], value = attribute[1];
  if (value.length === 1 && typeof value[0] === 'string') {
    this.opcode('setAttribute', [name, value[0]]);
  }
};

export { FragmentOpcodeCompiler };

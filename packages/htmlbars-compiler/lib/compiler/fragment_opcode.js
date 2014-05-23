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

FragmentOpcodeCompiler.prototype.text = function(text) {
  this.opcode('text', [text.chars]);
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

FragmentOpcodeCompiler.prototype.startTemplate = function(program) {
  this.opcodes.length = 0;
  if (program.statements.length > 1) {
    this.opcode('startFragment');
  }
};

FragmentOpcodeCompiler.prototype.endTemplate = function(program) {
  var statements = program.statements;

  if (statements.length === 0) {
    this.opcode('empty');
  } else if (statements.length === 1) {
    var statement = statements[0];
    if (statement.type === 'text') {
      this.opcodes[0][0] = 'rootText';
    } else if (statement.type === 'element') {
      var opcodes = this.opcodes;
      opcodes[0][0] = 'openRootElement';
      opcodes[opcodes.length-1][0] = 'closeRootElement';
    }
  } else {
    this.opcode('endFragment');
  }
};

FragmentOpcodeCompiler.prototype.node = function () {};

FragmentOpcodeCompiler.prototype.component = function () {};

FragmentOpcodeCompiler.prototype.block = function () {};

FragmentOpcodeCompiler.prototype.attribute = function(attr) {
  if (attr.value.type === 'text') {
    this.opcode('setAttribute', [attr.name, attr.value.chars]);
  }
};

export { FragmentOpcodeCompiler };

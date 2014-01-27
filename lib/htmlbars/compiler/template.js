import { FragmentOpcodeCompiler } from './fragment_opcode';
import { FragmentCompiler } from './fragment';
import { HydrationOpcodeCompiler } from './hydration_opcode';
import { HydrationCompiler } from './hydration';
import { ASTWalker } from './ast_walker';

export function TemplateCompiler() {
  this.fragmentOpcodeCompiler = new FragmentOpcodeCompiler();
  this.fragmentCompiler = new FragmentCompiler();
  this.hydrationOpcodeCompiler = new HydrationOpcodeCompiler();
  this.hydrationCompiler = new HydrationCompiler();
  this.templates = [];
  this.childTemplates = [];
}

TemplateCompiler.prototype.compile = function(ast) {
  var astWalker = new ASTWalker(this);
  astWalker.visit(ast);
  return this.templates.pop();
};

TemplateCompiler.prototype.startTemplate = function(childCount) {
  this.fragmentOpcodeCompiler.startTemplate();
  this.hydrationOpcodeCompiler.startTemplate();

  this.childTemplates.length = 0;
  while(childCount--) {
    this.childTemplates.push(this.templates.pop());
  }
};

TemplateCompiler.prototype.endTemplate = function() {
  this.fragmentOpcodeCompiler.endTemplate();
  this.hydrationOpcodeCompiler.endTemplate();

  // function build(dom) { return fragment; }
  var fragmentProgram = this.fragmentCompiler.compile(
    this.fragmentOpcodeCompiler.opcodes
  );

  // function hydrate(fragment) { return mustaches; }
  var hydrationProgram = this.hydrationCompiler.compile(
    this.hydrationOpcodeCompiler.opcodes
  );

  var childTemplateVars = "";
  for (var i=0, l=this.childTemplates.length; i<l; i++) {
    childTemplateVars +=   '  var child' + i + '=' + this.childTemplates[i] + ';\n';
  }

  var template =
    '(function (){\n' +
      childTemplateVars +
      fragmentProgram +
    'var cachedFragment = null;\n' +
    'return function template(context, options) {\n' +
    '  if (cachedFragment === null) {\n' +
    '    cachedFragment = build(dom);\n' +
    '  }\n' +
    '  var fragment = cachedFragment.cloneNode(true);\n' +
    '  var helpers = options && options.helpers || {};\n' +
       hydrationProgram +
    '  return fragment;\n' +
    '};\n' +
    '}())';

  this.templates.push(template);
};

TemplateCompiler.prototype.openElement = function(element, i, l, c) {
  this.fragmentOpcodeCompiler.openElement(element, i, l, c);
  this.hydrationOpcodeCompiler.openElement(element, i, l, c);
};

TemplateCompiler.prototype.closeElement = function(element, i, l) {
  this.fragmentOpcodeCompiler.closeElement(element, i, l);
  this.hydrationOpcodeCompiler.closeElement(element, i, l);
};

TemplateCompiler.prototype.block = function(block, i, l) {
  this.fragmentOpcodeCompiler.block(block, i, l);
  this.hydrationOpcodeCompiler.block(block, i, l);
};

TemplateCompiler.prototype.text = function(string, i, l) {
  this.fragmentOpcodeCompiler.text(string, i, l);
  this.hydrationOpcodeCompiler.text(string, i, l);
};

TemplateCompiler.prototype.node = function (node, i, l) {
  this.fragmentOpcodeCompiler.node(node, i, l);
  this.hydrationOpcodeCompiler.node(node, i, l);
};

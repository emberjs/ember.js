import { FragmentOpcodeCompiler } from './fragment_opcode';
import { FragmentCompiler } from './fragment';
import { HydrationOpcodeCompiler } from './hydration_opcode';
import { HydrationCompiler } from './hydration';
import TemplateVisitor from "./template_visitor";
import { processOpcodes } from "./utils";

export function TemplateCompiler() {
  this.fragmentOpcodeCompiler = new FragmentOpcodeCompiler();
  this.fragmentCompiler = new FragmentCompiler();
  this.hydrationOpcodeCompiler = new HydrationOpcodeCompiler();
  this.hydrationCompiler = new HydrationCompiler();
  this.templates = [];
  this.childTemplates = [];
}

TemplateCompiler.prototype.compile = function(ast) {
  var templateVisitor = new TemplateVisitor();
  templateVisitor.visit(ast);

  processOpcodes(this, templateVisitor.actions);

  return this.templates.pop();
};

TemplateCompiler.prototype.startProgram = function(program, childTemplateCount) {
  this.fragmentOpcodeCompiler.startProgram(program, childTemplateCount);
  this.hydrationOpcodeCompiler.startProgram(program, childTemplateCount);

  this.childTemplates.length = 0;
  while(childTemplateCount--) {
    this.childTemplates.push(this.templates.pop());
  }
};

TemplateCompiler.prototype.endProgram = function(program) {
  this.fragmentOpcodeCompiler.endProgram(program);
  this.hydrationOpcodeCompiler.endProgram(program);

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
    'return function template(context, env) {\n' +
    '  if (cachedFragment === null) {\n' +
    '    cachedFragment = build(dom);\n' +
    '  }\n' +
    '  var fragment = dom.cloneNode(cachedFragment);\n' +
    '  var hooks = env.hooks;\n' +
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

TemplateCompiler.prototype.component = function(component, i, l) {
  this.fragmentOpcodeCompiler.component(component, i, l);
  this.hydrationOpcodeCompiler.component(component, i, l);
};

TemplateCompiler.prototype.block = function(block, i, l) {
  this.fragmentOpcodeCompiler.block(block, i, l);
  this.hydrationOpcodeCompiler.block(block, i, l);
};

TemplateCompiler.prototype.text = function(string, i, l) {
  this.fragmentOpcodeCompiler.text(string, i, l);
  this.hydrationOpcodeCompiler.text(string, i, l);
};

TemplateCompiler.prototype.mustache = function (mustache, i, l) {
  this.fragmentOpcodeCompiler.mustache(mustache, i, l);
  this.hydrationOpcodeCompiler.mustache(mustache, i, l);
};

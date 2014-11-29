import { FragmentOpcodeCompiler } from './fragment_opcode';
import { FragmentCompiler } from './fragment';
import { HydrationOpcodeCompiler } from './hydration_opcode';
import { HydrationCompiler } from './hydration';
import TemplateVisitor from "./template_visitor";
import { processOpcodes } from "./utils";
import { repeat } from "./quoting";

export function TemplateCompiler(options) {
  this.options = options || {};
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

TemplateCompiler.prototype.startProgram = function(program, childTemplateCount, blankChildTextNodes) {
  this.fragmentOpcodeCompiler.startProgram(program, childTemplateCount, blankChildTextNodes);
  this.hydrationOpcodeCompiler.startProgram(program, childTemplateCount, blankChildTextNodes);

  this.childTemplates.length = 0;
  while(childTemplateCount--) {
    this.childTemplates.push(this.templates.pop());
  }
};

TemplateCompiler.prototype.getChildTemplateVars = function(indent) {
  var vars = '';
  if (this.childTemplates) {
    for (var i = 0; i < this.childTemplates.length; i++) {
      vars += indent + 'var child' + i + ' = ' + this.childTemplates[i] + '\n';
    }
  }
  return vars;
};

TemplateCompiler.prototype.getHydrationHooks = function(indent, hooks) {
  var hookVars = [];
  for (var hook in hooks) {
    hookVars.push(hook + ' = hooks.' + hook);
  }

  if (hookVars.length > 0) {
    return indent + 'var hooks = env.hooks, ' + hookVars.join(', ') + ';\n';
  } else {
    return '';
  }
};

TemplateCompiler.prototype.endProgram = function(program, programDepth) {
  this.fragmentOpcodeCompiler.endProgram(program);
  this.hydrationOpcodeCompiler.endProgram(program);

  var indent = repeat("  ", programDepth);
  var options = {
    indent: indent + "  "
  };

  // function build(dom) { return fragment; }
  var fragmentProgram = this.fragmentCompiler.compile(
    this.fragmentOpcodeCompiler.opcodes,
    options
  );

  // function hydrate(fragment) { return mustaches; }
  var hydrationProgram = this.hydrationCompiler.compile(
    this.hydrationOpcodeCompiler.opcodes,
    options
  );

  var blockParams = program.blockParams || [];

  var templateSignature = 'context, env, contextualElement';
  if (blockParams.length > 0) {
    templateSignature += ', blockArguments';
  }

  var template =
    '(function() {\n' +
    this.getChildTemplateVars(indent + '  ') +
    fragmentProgram +
    indent+'  var cachedFragment;\n' +
    indent+'  return function template(' + templateSignature + ') {\n' +
    indent+'    var dom = env.dom;\n' +
    this.getHydrationHooks(indent + '    ', this.hydrationCompiler.hooks) +
    indent+'    dom.detectNamespace(contextualElement);\n' +
    indent+'    if (cachedFragment === undefined) {\n' +
    indent+'      cachedFragment = build(dom);\n' +
    indent+'    }\n' +
    indent+'    var fragment = dom.cloneNode(cachedFragment, true);\n' +
    hydrationProgram +
    indent+'    return fragment;\n' +
    indent+'  };\n' +
    indent+'}())';

  this.templates.push(template);
};

TemplateCompiler.prototype.openElement = function(element, i, l, r, c, b) {
  this.fragmentOpcodeCompiler.openElement(element, i, l, r, c, b);
  this.hydrationOpcodeCompiler.openElement(element, i, l, r, c, b);
};

TemplateCompiler.prototype.closeElement = function(element, i, l, r) {
  this.fragmentOpcodeCompiler.closeElement(element, i, l, r);
  this.hydrationOpcodeCompiler.closeElement(element, i, l, r);
};

TemplateCompiler.prototype.component = function(component, i, l) {
  this.fragmentOpcodeCompiler.component(component, i, l);
  this.hydrationOpcodeCompiler.component(component, i, l);
};

TemplateCompiler.prototype.block = function(block, i, l) {
  this.fragmentOpcodeCompiler.block(block, i, l);
  this.hydrationOpcodeCompiler.block(block, i, l);
};

TemplateCompiler.prototype.text = function(string, i, l, r) {
  this.fragmentOpcodeCompiler.text(string, i, l, r);
  this.hydrationOpcodeCompiler.text(string, i, l, r);
};

TemplateCompiler.prototype.comment = function(string, i, l, r) {
  this.fragmentOpcodeCompiler.comment(string, i, l, r);
  this.hydrationOpcodeCompiler.comment(string, i, l, r);
};

TemplateCompiler.prototype.mustache = function (mustache, i, l) {
  this.fragmentOpcodeCompiler.mustache(mustache, i, l);
  this.hydrationOpcodeCompiler.mustache(mustache, i, l);
};

TemplateCompiler.prototype.setNamespace = function(namespace) {
  this.fragmentOpcodeCompiler.setNamespace(namespace);
};

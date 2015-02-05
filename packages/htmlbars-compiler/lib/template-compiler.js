import FragmentOpcodeCompiler from './fragment-opcode-compiler';
import FragmentJavaScriptCompiler from './fragment-javascript-compiler';
import HydrationOpcodeCompiler from './hydration-opcode-compiler';
import HydrationJavaScriptCompiler from './hydration-javascript-compiler';
import TemplateVisitor from "./template-visitor";
import { processOpcodes } from "./utils";
import { repeat } from "../htmlbars-util/quoting";

function TemplateCompiler(options) {
  this.options = options || {};
  this.revision = this.options.revision || "HTMLBars@VERSION_STRING_PLACEHOLDER";
  this.fragmentOpcodeCompiler = new FragmentOpcodeCompiler();
  this.fragmentCompiler = new FragmentJavaScriptCompiler();
  this.hydrationOpcodeCompiler = new HydrationOpcodeCompiler();
  this.hydrationCompiler = new HydrationJavaScriptCompiler();
  this.templates = [];
  this.childTemplates = [];
}

export default TemplateCompiler;

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
      vars += indent + 'var child' + i + ' = ' + this.childTemplates[i] + ';\n';
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
    indent: indent + "    "
  };

  // function build(dom) { return fragment; }
  var fragmentProgram = this.fragmentCompiler.compile(
    this.fragmentOpcodeCompiler.opcodes,
    options
  );

  // function hydrate(fragment) { return mustaches; }
  var hydrationPrograms = this.hydrationCompiler.compile(
    this.hydrationOpcodeCompiler.opcodes,
    options
  );

  var blockParams = program.blockParams || [];

  var templateSignature = 'context, env, options';
  if (blockParams.length > 0) {
    templateSignature += ', blockArguments';
  }

  var renderNodes = hydrationPrograms.hasMorphs ?
    indent+'      var morphs = renderNodes(dom, fragment, contextualElement);\n' :
    indent+'      var morphs = null;';

  var template =
    '(function() {\n' +
    this.getChildTemplateVars(indent + '  ') +
    indent+'  return {\n' +
    indent+'    isHTMLBars: true,\n' +
    indent+'    revision: "' + this.revision + '",\n' +
    indent+'    blockParams: ' + blockParams.length + ',\n' +
    indent+'    cachedFragment: null,\n' +
    indent+'    hasRendered: false,\n' +
    indent+'    build: ' + fragmentProgram + ',\n' +
    indent+'    render: function render(' + templateSignature + ') {\n' +
    indent+'      var dom = env.dom;\n' +
    this.getHydrationHooks(indent + '      ', this.hydrationCompiler.hooks) +
    indent+'      var contextualElement = options && options.contextualElement;\n' +
    indent+'      dom.detectNamespace(contextualElement);\n' +
    indent+'      var fragment = env.hooks.getCachedFragment(this, fragment, env);\n' +
    renderNodes +
    hydrationPrograms.hydrateMorphsProgram +
    indent+'      return { fragment: fragment, morphs: morphs };\n' +
    indent+'    }\n' +
    indent+'  };\n' +
    hydrationPrograms.createMorphsProgram +
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

TemplateCompiler.prototype.component = function(component, i, l, s) {
  this.fragmentOpcodeCompiler.component(component, i, l, s);
  this.hydrationOpcodeCompiler.component(component, i, l, s);
};

TemplateCompiler.prototype.block = function(block, i, l, s) {
  this.fragmentOpcodeCompiler.block(block, i, l, s);
  this.hydrationOpcodeCompiler.block(block, i, l, s);
};

TemplateCompiler.prototype.text = function(string, i, l, r) {
  this.fragmentOpcodeCompiler.text(string, i, l, r);
  this.hydrationOpcodeCompiler.text(string, i, l, r);
};

TemplateCompiler.prototype.comment = function(string, i, l, r) {
  this.fragmentOpcodeCompiler.comment(string, i, l, r);
  this.hydrationOpcodeCompiler.comment(string, i, l, r);
};

TemplateCompiler.prototype.mustache = function (mustache, i, l, s) {
  this.fragmentOpcodeCompiler.mustache(mustache, i, l, s);
  this.hydrationOpcodeCompiler.mustache(mustache, i, l, s);
};

TemplateCompiler.prototype.setNamespace = function(namespace) {
  this.fragmentOpcodeCompiler.setNamespace(namespace);
};

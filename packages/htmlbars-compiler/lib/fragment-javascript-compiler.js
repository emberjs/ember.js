import { processOpcodes } from "./utils";
import { string } from "../htmlbars-util/quoting";

var svgNamespace = "http://www.w3.org/2000/svg",
// http://www.w3.org/html/wg/drafts/html/master/syntax.html#html-integration-point
    svgHTMLIntegrationPoints = {'foreignObject':true, 'desc':true, 'title':true};


function FragmentJavaScriptCompiler() {
  this.source = [];
  this.depth = -1;
}

export default FragmentJavaScriptCompiler;

FragmentJavaScriptCompiler.prototype.compile = function(opcodes, options) {
  this.source.length = 0;
  this.depth = -1;
  this.indent = (options && options.indent) || "";
  this.namespaceFrameStack = [{namespace: null, depth: null}];
  this.domNamespace = null;

  this.source.push('function buildFragment(env) {\n');
  this.source.push('  var dom = env.dom;\n');
  processOpcodes(this, opcodes);
  this.source.push(this.indent+'}');

  return this.source.join('');
};

FragmentJavaScriptCompiler.prototype.createFragment = function() {
  var el = 'el'+(++this.depth);
  this.source.push(this.indent+'  var '+el+' = dom.createDocumentFragment();\n');
};

FragmentJavaScriptCompiler.prototype.createElement = function(tagName) {
  var el = 'el'+(++this.depth);
  if (tagName === 'svg') {
    this.pushNamespaceFrame({namespace: svgNamespace, depth: this.depth});
  }
  this.ensureNamespace();
  this.source.push(this.indent+'  var '+el+' = dom.createElement('+string(tagName)+');\n');
  if (svgHTMLIntegrationPoints[tagName]) {
    this.pushNamespaceFrame({namespace: null, depth: this.depth});
  }
};

FragmentJavaScriptCompiler.prototype.createText = function(str) {
  var el = 'el'+(++this.depth);
  this.source.push(this.indent+'  var '+el+' = dom.createTextNode('+string(str)+');\n');
};

FragmentJavaScriptCompiler.prototype.createComment = function(str) {
  var el = 'el'+(++this.depth);
  this.source.push(this.indent+'  var '+el+' = dom.createComment('+string(str)+');\n');
};

FragmentJavaScriptCompiler.prototype.returnNode = function() {
  var el = 'el'+this.depth;
  this.source.push(this.indent+'  return '+el+';\n');
};

FragmentJavaScriptCompiler.prototype.setAttribute = function(name, value, namespace) {
  var el = 'el'+this.depth;
  if (namespace) {
    this.source.push(this.indent+'  dom.setAttributeNS('+el+','+string(namespace)+','+string(name)+','+string(value)+');\n');
  } else {
    this.source.push(this.indent+'  dom.setAttribute('+el+','+string(name)+','+string(value)+');\n');
  }
};

FragmentJavaScriptCompiler.prototype.appendChild = function() {
  if (this.depth === this.getCurrentNamespaceFrame().depth) {
    this.popNamespaceFrame();
  }
  var child = 'el'+(this.depth--);
  var el = 'el'+this.depth;
  this.source.push(this.indent+'  dom.appendChild('+el+', '+child+');\n');
};

FragmentJavaScriptCompiler.prototype.getCurrentNamespaceFrame = function() {
  return this.namespaceFrameStack[this.namespaceFrameStack.length-1];
};

FragmentJavaScriptCompiler.prototype.pushNamespaceFrame = function(frame) {
  this.namespaceFrameStack.push(frame);
};

FragmentJavaScriptCompiler.prototype.popNamespaceFrame = function() {
  return this.namespaceFrameStack.pop();
};

FragmentJavaScriptCompiler.prototype.ensureNamespace = function() {
  var correctNamespace = this.getCurrentNamespaceFrame().namespace;
  if (this.domNamespace !== correctNamespace) {
    this.source.push(this.indent+'  dom.setNamespace('+(correctNamespace ? string(correctNamespace) : 'null')+');\n');
    this.domNamespace = correctNamespace;
  }
};

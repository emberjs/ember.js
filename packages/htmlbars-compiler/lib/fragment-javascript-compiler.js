import { processOpcodes } from "./utils";
import { string } from "../htmlbars-util/quoting";

function FragmentJavaScriptCompiler() {
  this.source = [];
  this.depth = -1;
}

export default FragmentJavaScriptCompiler;

FragmentJavaScriptCompiler.prototype.compile = function(opcodes, options) {
  this.source.length = 0;
  this.depth = -1;
  this.indent = (options && options.indent) || "";

  this.source.push('function build(dom) {\n');
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
  this.source.push(this.indent+'  var '+el+' = dom.createElement('+string(tagName)+');\n');
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

FragmentJavaScriptCompiler.prototype.setAttribute = function(name, value) {
  var el = 'el'+this.depth;
  this.source.push(this.indent+'  dom.setAttribute('+el+','+string(name)+','+string(value)+');\n');
};

FragmentJavaScriptCompiler.prototype.appendChild = function() {
  var child = 'el'+(this.depth--);
  var el = 'el'+this.depth;
  this.source.push(this.indent+'  dom.appendChild('+el+', '+child+');\n');
};

FragmentJavaScriptCompiler.prototype.setNamespace = function(namespace) {
  this.source.push(this.indent+'  dom.setNamespace('+(namespace ? string(namespace) : 'null')+');\n');
};

import { processOpcodes } from "./utils";
import { string } from "./quoting";

export function FragmentCompiler() {
  this.source = [];
  this.depth = -1;
}

FragmentCompiler.prototype.compile = function(opcodes, options) {
  this.source.length = 0;
  this.depth = -1;
  this.indent = (options && options.indent) || "";

  this.source.push(this.indent+'function build(dom) {\n');
  processOpcodes(this, opcodes);
  this.source.push(this.indent+'}\n');

  return this.source.join('');
};

FragmentCompiler.prototype.createFragment = function() {
  var el = 'el'+(++this.depth);
  this.source.push(this.indent+'  var '+el+' = dom.createDocumentFragment();\n');
};

FragmentCompiler.prototype.createElement = function(tagName) {
  var el = 'el'+(++this.depth);
  this.source.push(this.indent+'  var '+el+' = dom.createElement('+string(tagName)+');\n');
};

FragmentCompiler.prototype.createText = function(str) {
  var el = 'el'+(++this.depth);
  this.source.push(this.indent+'  var '+el+' = dom.createTextNode('+string(str)+');\n');
};

FragmentCompiler.prototype.createComment = function(str) {
  var el = 'el'+(++this.depth);
  this.source.push(this.indent+'  var '+el+' = dom.createComment('+string(str)+');\n');
};

FragmentCompiler.prototype.returnNode = function() {
  var el = 'el'+this.depth;
  this.source.push(this.indent+'  return '+el+';\n');
};

FragmentCompiler.prototype.setAttribute = function(name, value) {
  var el = 'el'+this.depth;
  this.source.push(this.indent+'  dom.setAttribute('+el+','+string(name)+','+string(value)+');\n');
};

FragmentCompiler.prototype.appendChild = function() {
  var child = 'el'+(this.depth--);
  var el = 'el'+this.depth;
  this.source.push(this.indent+'  dom.appendChild('+el+', '+child+');\n');
};

FragmentCompiler.prototype.setNamespace = function(namespace) {
  this.source.push(this.indent+'  dom.setNamespace('+(namespace ? string(namespace) : 'null')+');\n');
};

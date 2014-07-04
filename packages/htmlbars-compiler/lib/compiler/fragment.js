import { processOpcodes } from "./utils";
import { string } from "./quoting";

export function FragmentCompiler() {
  this.source = [];
  this.depth = -1;
}

FragmentCompiler.prototype.compile = function(opcodes) {
  this.source.length = 0;
  this.depth = -1;

  this.source.push('function build(dom) {\n');
  processOpcodes(this, opcodes);
  this.source.push('}\n');

  return this.source.join('');
};

FragmentCompiler.prototype.createFragment = function() {
  var el = 'el'+(++this.depth);
  this.source.push('  var '+el+' = dom.createDocumentFragment();\n');
};

FragmentCompiler.prototype.createElement = function(tagName) {
  var el = 'el'+(++this.depth);
  this.source.push('  var '+el+' = dom.createElement('+string(tagName)+');\n');
};

FragmentCompiler.prototype.createText = function(str) {
  var el = 'el'+(++this.depth);
  this.source.push('  var '+el+' = dom.createTextNode('+string(str)+');\n');
};

FragmentCompiler.prototype.returnNode = function() {
  var el = 'el'+this.depth;
  this.source.push('  return '+el+';\n');
};

FragmentCompiler.prototype.setAttribute = function(name, value) {
  var el = 'el'+this.depth;
  this.source.push('  dom.setAttribute('+el+','+string(name)+','+string(value)+');\n');
};

FragmentCompiler.prototype.appendChild = function() {
  var child = 'el'+(this.depth--);
  var el = 'el'+this.depth;
  this.source.push('  dom.appendChild('+el+', '+child+');\n');
};

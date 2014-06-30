import { processOpcodes } from "./utils";
import { string } from "./quoting";

export function FragmentCompiler() {
  this.source = [];
  this.depth = -1;
  this.domHelper = 'dom0';
}

FragmentCompiler.prototype.compile = function(opcodes) {
  this.source.length = 0;
  this.depth = 0;

  this.source.push('function build() {\n');
  processOpcodes(this, opcodes);
  this.source.push('}\n');

  return this.source.join('');
};

FragmentCompiler.prototype.createFragment = function() {
  var el = 'el'+(++this.depth);
  this.source.push('  var '+el+' = '+this.domHelper+'.createDocumentFragment();\n');
};

FragmentCompiler.prototype.createElement = function(tagName) {
  var el = 'el'+(++this.depth);
  this.source.push('  var '+el+' = '+this.domHelper+'.createElement('+string(tagName)+');\n');
};

FragmentCompiler.prototype.createText = function(str) {
  var el = 'el'+(++this.depth);
  this.source.push('  var '+el+' = '+this.domHelper+'.createTextNode('+string(str)+');\n');
};

FragmentCompiler.prototype.returnNode = function() {
  var el = 'el'+this.depth;
  this.source.push('  return '+el+';\n');
};

FragmentCompiler.prototype.setAttribute = function(name, value) {
  var el = 'el'+this.depth;
  this.source.push('  '+this.domHelper+'.setAttribute('+el+','+string(name)+','+string(value)+');\n');
};

FragmentCompiler.prototype.createDOMHelper = function(domHelper) {
  var el = 'el'+this.depth;
  this.source.push('  '+domHelper+' = new '+this.domHelper+'.constructor('+el+');\n');
};

FragmentCompiler.prototype.selectDOMHelper = function(domHelper) {
  this.domHelper = domHelper;
};

FragmentCompiler.prototype.appendChild = function() {
  var child = 'el'+(this.depth--);
  var el = 'el'+this.depth;
  this.source.push('  '+this.domHelper+'.appendChild('+el+', '+child+');\n');
};

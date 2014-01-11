import { processOpcodes } from "htmlbars/compiler/utils";
import { string } from "htmlbars/compiler/quoting";

export function FragmentCompiler() {
  this.fn = null;
  this.depth = 0;
}

FragmentCompiler.prototype.compile = function(opcodes) {
  this.depth = 0;
  this.fn =
    'function build() {\n' +
    '  var frag = el0 = dom.createDocumentFragment();\n';

  processOpcodes(this, opcodes);

  this.fn +=
    '  return frag;\n'+
    '}\n';

  return this.fn;
};

FragmentCompiler.prototype.openElement = function(tagName) {
  var el = 'el'+(++this.depth);
  this.fn += '  var '+el+' = dom.createElement('+string(tagName)+');\n';
};

FragmentCompiler.prototype.setAttribute = function(name, value) {
  var el = 'el'+this.depth;
  this.fn += '  dom.setAttribute('+el+','+string(name)+','+string(value)+');\n';
};

FragmentCompiler.prototype.text = function(str) {
  var el = 'el'+this.depth;
  this.fn += '  dom.appendText('+el+','+string(str)+');\n';
};

FragmentCompiler.prototype.closeElement = function() {
  var child = 'el'+(this.depth--);
  var el = 'el'+this.depth;
  this.fn += '  '+el+'.appendChild('+child+');\n';
};


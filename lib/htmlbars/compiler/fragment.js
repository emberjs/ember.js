import { processOpcodes } from "htmlbars/compiler/utils";
import { entityTextToString } from "htmlbars/compiler/entities";
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

function replaceTextEntity(match, capture) {
  return entityTextToString(capture);
}

function replaceNumericEntity(match, capture) {
  var num = parseInt(capture, 10);
  if (isNaN(num)) {
    return '&' + capture + ';';
  }
  return String.fromCharCode(num);
}

function replaceHexEntity(match, capture) {
  var num = parseInt(capture.toLowerCase(), 16);
  if (isNaN(num)) {
    return '&x' + capture + ';';
  }
  return String.fromCharCode(num);
}

FragmentCompiler.prototype.text = function(str) {
  str = str.replace(/&([A-Za-z]+);/g, replaceTextEntity);
  str = str.replace(/&#([0-9]+);/g, replaceNumericEntity);
  str = str.replace(/&#x([0-9A-Za-z]+);/g, replaceHexEntity);

  var el = 'el'+this.depth;
  this.fn += '  dom.appendText('+el+','+string(str)+');\n';
};

FragmentCompiler.prototype.closeElement = function() {
  var child = 'el'+(this.depth--);
  var el = 'el'+this.depth;
  this.fn += '  '+el+'.appendChild('+child+');\n';
};


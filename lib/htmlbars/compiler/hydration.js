import { processOpcodes } from "htmlbars/compiler/utils";
import { prepareHelper } from "htmlbars/compiler/helpers";
import { string, quotedArray, hash, array } from "htmlbars/compiler/quoting";

function HydrationCompiler() {
  this.stack = [];
  this.mustaches = [];
}

var prototype = HydrationCompiler.prototype;

prototype.compile = function(opcodes, childTemplates) {
  this.stack.length = 0;
  this.mustaches.length = 0;

  processOpcodes(this, opcodes);

  var fn =  'function hydrate(fragment) {\n';
  for (var i=0, l=childTemplates.length; i<l; i++) {
    fn +=   '  var child' + i + '=' + childTemplates[i] + ';\n';
  }
  fn +=     '  return [\n' +
            '  ' + this.mustaches.join(',\n  ') + '\n' +
            '  ];\n' +
            '}\n';

  return fn;
};

prototype.program = function(programId, inverseId) {
  this.stack.push(inverseId);
  this.stack.push(programId);
};

prototype.id = function(parts) {
  this.stack.push(string('id'));
  this.stack.push(string(parts.join('.')));
};

prototype.literal = function(literal) {
  this.stack.push(string(typeof literal));
  this.stack.push(literal);
};

prototype.stringLiteral = function(str) {
  this.stack.push(string('string'));
  this.stack.push(string(str));
};

prototype.stackLiteral = function(literal) {
  this.stack.push(literal);
};

prototype.helper = function(name, size, escaped, parentPath, startIndex, endIndex) {
  var prepared = prepareHelper(this.stack, size);
  prepared.options.push('escaped:'+escaped);
  this.pushMustachePlaceholder(string(name), prepared.args, prepared.options, parentPath, startIndex, endIndex);
};

prototype.ambiguous = function(str, escaped, parentPath, startIndex, endIndex) {
  this.pushMustachePlaceholder(string(str), '[]', ['escaped:'+escaped], parentPath, startIndex, endIndex);
};

prototype.ambiguousAttr = function(str, escaped) {
  this.stack.push('['+string(str)+', [], {escaped:'+escaped+'}]');
};

prototype.helperAttr = function(name, size, escaped) {
  var prepared = prepareHelper(this.stack, size);
  prepared.options.push('escaped:'+escaped);

  this.stack.push('['+string(name)+','+prepared.args+','+ hash(prepared.options)+']');
};

prototype.sexpr = function(name, size) {
  var prepared = prepareHelper(this.stack, size);
  this.stack.push('['+string(name)+','+prepared.args+','+ hash(prepared.options)+']');
};

prototype.string = function(str) {
  this.stack.push(string(str));
};

prototype.attribute = function(name, size, elementPath) {
  var args = [];
  for (var i = 0; i < size; i++) {
    args.push(this.stack.pop());
  }

  var element = "fragment";
  for (i=0; i<elementPath.length; i++) {
    element += ".childNodes["+elementPath[i]+"]";
  }
  var pairs = ['element:'+element, 'name:'+string(name)];
  this.mustaches.push('["ATTRIBUTE", ['+ args +'],'+hash(pairs)+']');
};

prototype.nodeHelper = function(name, size, elementPath) {
  var prepared = prepareHelper(this.stack, size);
  this.pushMustacheInNode(string(name), prepared.args, prepared.options, elementPath);
};

prototype.pushMustachePlaceholder = function(name, args, pairs, parentPath, startIndex, endIndex) {
  var parent = "fragment";
  for (var i=0; i<parentPath.length; i++) {
    parent += ".childNodes["+parentPath[i]+"]";
  }
  var placeholder = "Placeholder.create("+parent+","+
    (startIndex === null ? "null" : startIndex)+","+
    (endIndex === null ? "null" : endIndex)+")";

  pairs.push('placeholder:'+placeholder);

  this.mustaches.push('['+name+','+args+','+hash(pairs)+']');
};

prototype.pushMustacheInNode = function(name, args, pairs, elementPath) {
  var element = "fragment";
  for (var i=0; i<elementPath.length; i++) {
    element += ".childNodes["+elementPath[i]+"]";
  }
  pairs.push('element:'+element);
  this.mustaches.push('['+name+','+args+','+hash(pairs)+']');
};

export { HydrationCompiler };

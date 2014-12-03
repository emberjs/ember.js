import { processOpcodes } from "./utils";
import { string, hash as quoteHash, array } from "./quoting";

function HydrationCompiler() {
  this.stack = [];
  this.source = [];
  this.mustaches = [];
  this.parents = ['fragment'];
  this.parentCount = 0;
  this.morphs = [];
  this.fragmentProcessing = [];
  this.hooks = undefined;
}

var prototype = HydrationCompiler.prototype;

prototype.compile = function(opcodes, options) {
  this.stack.length = 0;
  this.mustaches.length = 0;
  this.source.length = 0;
  this.parents.length = 1;
  this.parents[0] = 'fragment';
  this.morphs.length = 0;
  this.fragmentProcessing.length = 0;
  this.parentCount = 0;
  this.indent = (options && options.indent) || "";
  this.hooks = {};

  processOpcodes(this, opcodes);

  var i, l;
  if (this.morphs.length) {
    var morphs = "";
    for (i = 0, l = this.morphs.length; i < l; ++i) {
      var morph = this.morphs[i];
      morphs += this.indent+'  var '+morph[0]+' = '+morph[1]+';\n';
    }
    this.source.unshift(morphs);
  }

  if (this.fragmentProcessing.length) {
    var processing = "";
    for (i = 0, l = this.fragmentProcessing.length; i < l; ++i) {
      processing += this.indent+'  '+this.fragmentProcessing[i]+'\n';
    }
    this.source.unshift(processing);
  }

  return this.source.join('');
};

prototype.prepareArray = function(length) {
  var values = [];

  for (var i = 0; i < length; i++) {
    values.push(this.stack.pop());
  }

  this.stack.push('[' + values.join(', ') + ']');
};

prototype.prepareObject = function(size) {
  var pairs = [];

  for (var i = 0; i < size; i++) {
    pairs.push(this.stack.pop() + ': ' + this.stack.pop());
  }

  this.stack.push('{' + pairs.join(', ') + '}');
};

prototype.pushRaw = function(value) {
  this.stack.push(value);
};

prototype.pushLiteral = function(value) {
  if (typeof value === 'string') {
    this.stack.push(string(value));
  } else {
    this.stack.push(value.toString());
  }
};

prototype.pushGetHook = function(path) {
  this.hooks.get = true;
  this.stack.push('get(context, ' + string(path) + ', env)');
};

prototype.pushSexprHook = function() {
  this.hooks.subexpr = true;

  var path = this.stack.pop();
  var params = this.stack.pop();
  var hash = this.stack.pop();
  
  this.stack.push('subexpr(' + path + ', context, ' + params + ', ' + hash + ', {}, env)');
};

prototype.printSetHook = function(name, index) {
  this.hooks.set = true;
  this.source.push(this.indent + '  set(context, ' + string(name) +', blockArguments[' + index + ']);\n');
};

prototype.printContentHookForBlockHelper = function(morphNum, templateId, inverseId, blockParamsLength) {
  var path = this.stack.pop();
  var params = this.stack.pop();
  var hash = this.stack.pop();

  var options = [];

  options.push('morph: morph' + morphNum);

  if (templateId !== null) {
    options.push('template: child' + templateId);
  }

  if (inverseId !== null) {
    options.push('inverse: child' + inverseId);
  }

  if (blockParamsLength) {
    options.push('blockParams: ' + blockParamsLength);
  }

  this.printContentHook(morphNum, path, params, hash, options);
};

prototype.printContentHookForInlineHelper = function(morphNum) {
  var path = this.stack.pop();
  var params = this.stack.pop();
  var hash = this.stack.pop();

  var options = [];
  options.push('morph: morph' + morphNum);

  this.printContentHook(morphNum, path, params, hash, options);
};

prototype.printContentHookForAmbiguous = function(morphNum) {
  var path = this.stack.pop();

  var options = [];
  options.push('morph: morph' + morphNum);

  this.printContentHook(morphNum, path, '[]', '{}', options);
};

prototype.printContentHook = function(morphNum, path, params, hash, pairs) {
  this.hooks.content = true;

  var args = ['morph' + morphNum, path, 'context', params, hash, quoteHash(pairs), 'env'];
  this.source.push(this.indent+'  content(' + args.join(', ') + ');\n');
};

prototype.printComponentHook = function(morphNum, templateId, blockParamsLength) {
  this.hooks.component = true;
  
  var path = this.stack.pop();
  var hash = this.stack.pop();

  var options = [];

  options.push('morph: morph' + morphNum);

  if (templateId !== null) {
    options.push('template: child' + templateId);
  }

  if (blockParamsLength) {
    options.push('blockParams: ' + blockParamsLength);
  }

  var args = ['morph' + morphNum, path, 'context', hash, quoteHash(options), 'env'];
  this.source.push(this.indent+'  component(' + args.join(', ') + ');\n');
};

prototype.printAttributeHook = function(elementNum, quoted) {
  var name = this.stack.pop();
  var value = this.stack.pop();

  this.hooks.attribute = true;
  this.source.push(this.indent + '  attribute(element' + elementNum + ', ' + name + ', ' + quoted + ', context, ' + value + ', {}, env);\n');
};

prototype.printElementHook = function(elementNum) {
  this.hooks.element = true;

  var path = this.stack.pop();
  var params = this.stack.pop();
  var hash = this.stack.pop();

  var options = [];
  options.push('element: element' + elementNum);

  var args = ['element' + elementNum, path, 'context', params, hash, quoteHash(options), 'env'];
  this.source.push(this.indent+'  element(' + args.join(', ') + ');\n');
};

prototype.printMorphCreation = function(morphNum, parentPath, startIndex, endIndex, escaped) {
  var isRoot = parentPath.length === 0;
  var parent = this.getParent();

  var morphMethod = escaped ? 'createMorphAt' : 'createUnsafeMorphAt';
  var morph = "dom."+morphMethod+"("+parent+
    ","+(startIndex === null ? "-1" : startIndex)+
    ","+(endIndex === null ? "-1" : endIndex)+
    (isRoot ? ",contextualElement)" : ")");

  this.morphs.push(['morph' + morphNum, morph]);
};

prototype.repairClonedNode = function(blankChildTextNodes, isElementChecked) {
  var parent = this.getParent(),
      processing = 'dom.repairClonedNode('+parent+','+
                   array(blankChildTextNodes)+
                   ( isElementChecked ? ',true' : '' )+
                   ');';
  this.fragmentProcessing.push(
    processing
  );
};

prototype.shareElement = function(elementNum){
  var elementNodesName = "element" + elementNum;
  this.fragmentProcessing.push('var '+elementNodesName+' = '+this.getParent()+';');
  this.parents[this.parents.length-1] = elementNodesName;
};

prototype.consumeParent = function(i) {
  this.parents.push(this.getParent() + '.childNodes[' + i + ']');
};

prototype.popParent = function() {
  this.parents.pop();
};

prototype.getParent = function() {
  return this.parents[this.parents.length-1];
};

export { HydrationCompiler };

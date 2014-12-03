import { processOpcodes } from "./utils";
import { prepareHelper } from "./helpers";
import { string, hash, array } from "./quoting";

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

prototype.pushSexprHook = function(size) {
  this.hooks.subexpr = true;
  var prepared = prepareHelper(this.stack, size);
  this.stack.push('subexpr(' + prepared.name + ', context, ' + prepared.params + ', ' + prepared.hash + ', ' + hash(prepared.options) + ', env)');
};

prototype.printSetHook = function(name, index) {
  this.hooks.set = true;
  this.source.push(this.indent + '  set(context, ' + string(name) +', blockArguments[' + index + ']);\n');
};

prototype.pushProgramIds = function(programId, inverseId) {
  this.stack.push(inverseId);
  this.stack.push(programId);
};

prototype.printHelperInContent = function(size, morphNum, blockParamsLength) {
  var prepared = prepareHelper(this.stack, size);
  prepared.options.push('morph:morph'+morphNum);
  if (blockParamsLength) {
    prepared.options.push('blockParams:'+blockParamsLength);
  }
  this.printContentHook(prepared.name, prepared.params, prepared.hash, prepared.options, morphNum);
};

prototype.printAmbiguousMustacheInBody = function(morphNum) {
  var name = this.stack.pop();
  this.stack.pop();
  var options = [];
  options.push('morph:morph'+morphNum);
  this.printContentHook(name, '[]', '{}', options, morphNum);
};

prototype.printContentHook = function(name, args, hashArgs, pairs, morphNum) {
  this.hooks.content = true;
  this.source.push(this.indent+'  content(morph' + morphNum + ', ' + name + ', context, ' + args + ', ' + hashArgs + ', ' + hash(pairs) + ', env);\n');
};

prototype.printComponentHook = function(morphNum, blockParamsLength) {
  this.hooks.component = true;
  var prepared = prepareHelper(this.stack, 0);
  prepared.options.push('morph:morph'+morphNum);
  if (blockParamsLength) {
    prepared.options.push('blockParams:'+blockParamsLength);
  }

  var args = ['morph' + morphNum, prepared.name, 'context', prepared.hash, hash(prepared.options), 'env'];
  this.source.push(this.indent+'  component(' + args.join(', ') + ');\n');
};

prototype.printAttributeHook = function(quoted, name, size, elementNum) {
  var prepared = prepareHelper(this.stack, size);
  this.hooks.attribute = true;
  this.source.push(this.indent + '  attribute(element' + elementNum + ', ' + string(name) + ', ' + quoted + ', context, ' + prepared.params + ', ' + hash(prepared.options) + ', env);\n');
};

prototype.printElementHook = function(size, elementNum) {
  this.hooks.element = true;
  var prepared = prepareHelper(this.stack, size);
  prepared.options.push('element:element'+elementNum);

  var args = ['element' + elementNum, prepared.name, 'context', prepared.params, prepared.hash, hash(prepared.options), 'env'];
  this.source.push(this.indent+'  element(' + args.join(', ') + ');\n');
};

prototype.printMorphCreation = function(num, parentPath, startIndex, endIndex, escaped) {
  var isRoot = parentPath.length === 0;
  var parent = this.getParent();

  var morphMethod = escaped ? 'createMorphAt' : 'createUnsafeMorphAt';
  var morph = "dom."+morphMethod+"("+parent+
    ","+(startIndex === null ? "-1" : startIndex)+
    ","+(endIndex === null ? "-1" : endIndex)+
    (isRoot ? ",contextualElement)" : ")");

  this.morphs.push(['morph' + num, morph]);
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

prototype.shareParent = function(i) {
  var parentNodesName = "parent" + this.parentCount++;
  this.fragmentProcessing.push('var '+parentNodesName+' = '+this.getParent()+'.childNodes['+i+']');
  this.parents.push(parentNodesName);
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

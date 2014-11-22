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

prototype.program = function(programId, inverseId) {
  this.stack.push(inverseId);
  this.stack.push(programId);
};

prototype.id = function(parts) {
  this.stack.push(string('id'));
  if (parts) {
    this.stack.push(string(parts.join('.')));
  } else {
    this.stack.push(null);
  }
};

prototype.scopeId = function(parts) {
  this.stack.push(string('value'));
  var id = '$' + parts[0];
  var path = parts.slice(1).join('.');
  if (parts.length === 1) {
    this.stack.push(id);
  } else {
    this.stack.push('get(' + id + ', ' + string(path) + ')');
  }
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

prototype.helper = function(size, morphNum, blockParamsLength) {
  var prepared = prepareHelper(this.stack, size);
  prepared.options.push('morph:morph'+morphNum);
  if (blockParamsLength) {
    prepared.options.push('blockParams:'+blockParamsLength);
  }
  this.pushMustacheInContent(prepared.name, prepared.params, prepared.hash, prepared.options, morphNum);
};

prototype.component = function(morphNum) {
  var prepared = prepareHelper(this.stack, 0);
  prepared.options.push('morph:morph'+morphNum);
  this.pushComponent(prepared.name, prepared.hash, prepared.options, morphNum);
};

prototype.ambiguous = function(morphNum) {
  var name = this.stack.pop();
  var type = this.stack.pop();
  var options = [];
  options.push('type:'+type);
  options.push('morph:morph'+morphNum);
  this.pushMustacheInContent(name, '[]', '{}', options, morphNum);
};

prototype.attribute = function(quoted, name, size, elementNum) {
  var prepared = prepareHelper(this.stack, size);
  this.source.push(this.indent + '  hooks.attribute(element' + elementNum + ', ' + string(name) + ', ' + quoted + ', context, ' + prepared.params + ', ' + hash(prepared.options) + ', env);\n');
};

prototype.sexpr = function(size) {
  var prepared = prepareHelper(this.stack, size);
  this.stack.push('hooks.subexpr(' + prepared.name + ', context, ' + prepared.params + ', ' + prepared.hash + ',' + hash(prepared.options) + ', env)');
};

prototype.string = function(str) {
  this.stack.push(string(str));
};

prototype.nodeHelper = function(size, elementNum) {
  var prepared = prepareHelper(this.stack, size);
  prepared.options.push('element:element'+elementNum);
  this.pushMustacheInNode(prepared.name, prepared.params, prepared.hash, prepared.options, elementNum);
};

prototype.morph = function(num, parentPath, startIndex, endIndex, escaped) {
  var isRoot = parentPath.length === 0;
  var parent = this.getParent();

  var morphMethod = escaped ? 'createMorphAt' : 'createUnsafeMorphAt';
  var morph = "dom."+morphMethod+"("+parent+
    ","+(startIndex === null ? "-1" : startIndex)+
    ","+(endIndex === null ? "-1" : endIndex)+
    (isRoot ? ",contextualElement)" : ")");

  this.morphs.push(['morph' + num, morph]);
};

// Adds our element to cached declaration
prototype.element = function(elementNum){
  var elementNodesName = "element" + elementNum;
  this.fragmentProcessing.push('var '+elementNodesName+' = '+this.getParent()+';');
  this.parents[this.parents.length-1] = elementNodesName;
};

prototype.pushComponent = function(name, hashArgs, pairs, morphNum) {
  this.source.push(this.indent+'  hooks.component(morph' + morphNum + ', ' + name + ', context, ' + hashArgs + ', ' + hash(pairs) + ', env);\n');
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

prototype.pushMustacheInContent = function(name, args, hashArgs, pairs, morphNum) {
  this.source.push(this.indent+'  hooks.content(morph' + morphNum + ', ' + name + ', context, ' + args + ', ' + hashArgs + ', ' + hash(pairs) + ', env);\n');
};

prototype.pushMustacheInNode = function(name, args, hashArgs, optionPairs, elementNum) {
  this.source.push(this.indent+'  hooks.element(element' + elementNum + ', ' + name + ', context, ' + args + ', ' + hashArgs + ', ' + hash(optionPairs) + ', env);\n');
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

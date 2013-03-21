define(
  ["htmlbars/compiler/utils","htmlbars/compiler/helpers","htmlbars/compiler/invoke","htmlbars/compiler/stack","htmlbars/compiler/quoting","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    var processOpcodes = __dependency1__.processOpcodes;
    var prepareHelper = __dependency2__.prepareHelper;
    var helper = __dependency3__.helper;
    var popStack = __dependency4__.popStack;
    var pushStack = __dependency4__.pushStack;
    var string = __dependency5__.string;
    var hash = __dependency5__.hash;
    var quotedArray = __dependency5__.quotedArray;

    function AttrCompiler() {};

    var attrCompiler = AttrCompiler.prototype;

    attrCompiler.compile = function(opcodes, options) {
      this.output = [];
      this.stackNumber = 0;
      this.stack = [];

      this.preamble();
      processOpcodes(this, opcodes);
      this.postamble();

      return new Function('context', 'options', this.output.join("\n"));
    };

    attrCompiler.preamble = function() {
      this.push("var buffer = ''");
    };

    attrCompiler.postamble = function() {
      this.push("return buffer");
    };

    attrCompiler.content = function(str) {
      this.push("buffer += " + string(str));
    };

    attrCompiler.dynamic = function(parts, escaped) {
      pushStack(this.stack, helper('resolveInAttr', 'context', quotedArray(parts), 'options'))
    };

    attrCompiler.ambiguous = function(string, escaped) {
      pushStack(this.stack, helper('ambiguousAttr', 'context', quotedArray([string]), 'options'));
    };

    attrCompiler.helper = function(name, size, escaped) {
      var prepared = prepareHelper(this.stack, size);

      prepared.options.push('rerender:options.rerender');

      pushStack(this.stack, helper('helperAttr', 'context', string(name), prepared.args, hash(prepared.options)));
    };

    attrCompiler.appendText = function() {
      this.push("buffer += " + popStack(this.stack));
    }

    attrCompiler.program = function() {
      pushStack(this.stack, null);
    }

    attrCompiler.id = function(parts) {
      pushStack(this.stack, string('id'));
      pushStack(this.stack, string(parts[0]));
    }

    attrCompiler.literal = function(literal) {
      pushStack(this.stack, string(typeof literal));
      pushStack(this.stack, literal);
    };

    attrCompiler.string = function(str) {
      pushStack(this.stack, string(typeof literal));
      pushStack(this.stack, string(str));
    };

    attrCompiler.stackLiteral = function(literal) {
      pushStack(this.stack, literal);
    };

    attrCompiler.push = function(string) {
      this.output.push(string + ";");
    };

    __exports__.AttrCompiler = AttrCompiler;
  });

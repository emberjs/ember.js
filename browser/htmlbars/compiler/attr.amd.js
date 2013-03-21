define(
  ["htmlbars/compiler-utils","htmlbars/compiler/stack","htmlbars/compiler/quoting","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var processOpcodes = __dependency1__.processOpcodes;
    var prepareHelper = __dependency1__.prepareHelper;
    var helper = __dependency1__.helper;
    var popStack = __dependency2__.popStack;
    var pushStack = __dependency2__.pushStack;
    var quotedString = __dependency3__.quotedString;
    var quotedArray = __dependency3__.quotedArray;
    var hash = __dependency3__.hash;

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

    attrCompiler.content = function(string) {
      this.push("buffer += " + quotedString(string));
    };

    attrCompiler.dynamic = function(parts, escaped) {
      pushStack(this.stack, helper('resolveAttr', 'context', quotedArray(parts), 'null', 'null', escaped))
    };

    attrCompiler.id = attrCompiler.dynamic;

    attrCompiler.ambiguous = function(string, escaped) {
      pushStack(this.stack, helper('resolveInAttr', 'context', quotedArray([string]), 'options'));
    };

    attrCompiler.helper = function(name, size, escaped) {
      var prepared = prepareHelper(this, size);

      prepared.options.push('rerender:options.rerender');

      pushStack(this.stack, helper('helperAttr', quotedString(name), 'null', 'null', 'context', prepared.args, hash(prepared.options)));
    };

    attrCompiler.appendText = function() {
      this.push("buffer += " + popStack(this.stack));
    }

    attrCompiler.program = function() {
      pushStack(this.stack, null);
    }

    attrCompiler.id = function(parts) {
      pushStack(this.stack, quotedString('id'));
      pushStack(this.stack, quotedString(parts[0]));
    }

    attrCompiler.literal = function(literal) {
      pushStack(this.stack, quotedString(typeof literal));
      pushStack(this.stack, literal);
    };

    attrCompiler.string = function(string) {
      pushStack(this.stack, quotedString(typeof literal));
      pushStack(this.stack, quotedString(string));
    };

    attrCompiler.stackLiteral = function(literal) {
      pushStack(this.stack, literal);
    };

    attrCompiler.push = function(string) {
      this.output.push(string + ";");
    };

    __exports__.AttrCompiler = AttrCompiler;
  });

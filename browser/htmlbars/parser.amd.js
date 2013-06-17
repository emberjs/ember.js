define(
  ["simple-html-tokenizer","htmlbars/ast","htmlbars/html-parser/process-token","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var Tokenizer = __dependency1__.Tokenizer;
    var Chars = __dependency1__.Chars;
    var StartTag = __dependency1__.StartTag;
    var EndTag = __dependency1__.EndTag;
    var HTMLElement = __dependency2__.HTMLElement;
    var BlockElement = __dependency2__.BlockElement;
    var processToken = __dependency3__.processToken;

    function preprocess(html) {
      var ast = Handlebars.parse(html);
      return new HTMLProcessor().accept(ast);
    };

    function HTMLProcessor() {
      // document fragment
      this.elementStack = [new HTMLElement()];
      this.tokenizer = new Tokenizer('');
    };

    // TODO: ES3 polyfill
    var processor = HTMLProcessor.prototype = Object.create(Handlebars.Visitor.prototype);

    processor.program = function(program) {
      var statements = program.statements;

      for (var i=0, l=statements.length; i<l; i++) {
        this.accept(statements[i]);
      }

      process(this, this.tokenizer.tokenizeEOF());

      // return the children of the top-level document fragment
      return this.elementStack[0].children;
    };

    processor.block = function(block) {
      switchToHandlebars(this);

      process(this, block);

      if (block.program) {
        this.accept(block.program);
      }

      var blockNode = this.elementStack.pop();
      currentElement(this).children.push(blockNode);
    };

    processor.content = function(content) {
      var tokens = this.tokenizer.tokenizePart(content.string);

      return tokens.forEach(function(token) {
        process(this, token);
      }, this);
    };

    processor.mustache = function(mustache) {
      switchToHandlebars(this);

      process(this, mustache);
    };

    function switchToHandlebars(compiler) {
      var token = compiler.tokenizer.token;

      // TODO: Monkey patch Chars.addChar like attributes
      if (token instanceof Chars) {
        process(compiler, token);
        compiler.tokenizer.token = null;
      }
    }

    function process(compiler, token) {
      var tokenizer = compiler.tokenizer;
      processToken(tokenizer.state, compiler.elementStack, tokenizer.token, token);
    }

    function currentElement(processor) {
      var elementStack = processor.elementStack;
      return elementStack[elementStack.length - 1];
    }

    StartTag.prototype.addToAttributeValue = function(char) {
      var value = this.currentAttribute[1] = this.currentAttribute[1] || [];

      if (value.length && typeof value[value.length - 1] === 'string' && typeof char === 'string') {
        value[value.length - 1] += char;
      } else {
        value.push(char);
      }
    };

    StartTag.prototype.addTagHelper = function(helper) {
      var helpers = this.helpers = this.helpers || [];

      helpers.push(helper);
    }

    __exports__.preprocess = preprocess;
  });

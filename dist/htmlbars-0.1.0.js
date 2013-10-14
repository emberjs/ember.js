(function(globals) {
var define, requireModule;

(function() {
  var registry = {}, seen = {};

  define = function(name, deps, callback) {
    registry[name] = { deps: deps, callback: callback };
  };

  requireModule = function(name) {
    if (seen[name]) { return seen[name]; }
    seen[name] = {};

    if (!registry[name]) {
      throw new Error("Could not find module " + name);
    }

    var mod = registry[name],
        deps = mod.deps,
        callback = mod.callback,
        reified = [],
        exports;

    for (var i=0, l=deps.length; i<l; i++) {
      if (deps[i] === 'exports') {
        reified.push(exports = {});
      } else {
        reified.push(requireModule(resolve(deps[i])));
      }
    }

    var value = callback.apply(this, reified);
    return seen[name] = exports || value;

    function resolve(child) {
      if (child.charAt(0) !== '.') { return child; }
      var parts = child.split("/");
      var parentBase = name.split("/").slice(0, -1);

      for (var i=0, l=parts.length; i<l; i++) {
        var part = parts[i];

        if (part === '..') { parentBase.pop(); }
        else if (part === '.') { continue; }
        else { parentBase.push(part); }
      }

      return parentBase.join("/");
    }
  };
})();

define("htmlbars", 
  ["htmlbars/parser","htmlbars/ast","htmlbars/compiler","htmlbars/helpers","htmlbars/macros","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    var preprocess = __dependency1__.preprocess;
    var HTMLElement = __dependency2__.HTMLElement;
    var BlockElement = __dependency2__.BlockElement;
    var compile = __dependency3__.compile;
    var registerHelper = __dependency4__.registerHelper;
    var removeHelper = __dependency4__.removeHelper;
    var registerMacro = __dependency5__.registerMacro;
    var removeMacro = __dependency5__.removeMacro;

    __exports__.preprocess = preprocess;
    __exports__.compile = compile;
    __exports__.HTMLElement = HTMLElement;
    __exports__.BlockElement = BlockElement;
    __exports__.removeHelper = removeHelper;
    __exports__.registerHelper = registerHelper;
    __exports__.removeMacro = removeMacro;
    __exports__.registerMacro = registerMacro;
  });

define("htmlbars/ast", 
  ["handlebars/compiler/ast","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var AST = __dependency1__;

    function HTMLElement(tag, attributes, children, helpers) {
      this.tag = tag;
      this.attributes = attributes || [];
      this.children = children || [];
      this.helpers = helpers || [];

      if (!attributes) { return; }

      for (var i=0, l=attributes.length; i<l; i++) {
        var attribute = attributes[i];
        attributes[attribute[0]] = attribute[1];
      }
    }

    function appendChild(node) {
      this.children.push(node);
    }

    HTMLElement.prototype = {
      appendChild: appendChild,

      removeAttr: function(name) {
        var attributes = this.attributes, attribute;
        delete attributes[name];
        for (var i=0, l=attributes.length; i<l; i++) {
          attribute = attributes[i];
          if (attribute[0] === name) {
            attributes.splice(i, 1);
            break;
          }
        }
      },

      getAttr: function(name) {
        var attributes = this.attributes;
        if (attributes.length !== 1 || attributes[0] instanceof AST.MustacheNode) { return; }
        return attributes[name][0];
      }
    };

    function BlockElement(helper, children) {
      this.helper = helper;
      this.children = children || [];
    }

    BlockElement.prototype.appendChild = appendChild;

    __exports__.HTMLElement = HTMLElement;
    __exports__.BlockElement = BlockElement;
  });

define("htmlbars/compiler", 
  ["htmlbars/parser","htmlbars/compiler/utils","htmlbars/runtime","htmlbars/helpers","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var preprocess = __dependency1__.preprocess;
    var compileAST = __dependency2__.compileAST;
    var domHelpers = __dependency3__.domHelpers;
    var helpers = __dependency4__.helpers;

    function compile(string, options) {
      return compileSpec(string, options)(domHelpers(helpers));
    }

    __exports__.compile = compile;function compileSpec(string, options) {
      var ast = preprocess(string);
      return compileAST(ast, options);
    }

    __exports__.compileSpec = compileSpec;
  });

define("htmlbars/compiler/attr", 
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

define("htmlbars/compiler/elements", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function pushElement(compiler) {
      return "element" + (++compiler.elementNumber);
    }

    __exports__.pushElement = pushElement;function popElement(compiler) {
      return "element" + (compiler.elementNumber--);
    }

    __exports__.popElement = popElement;function topElement(compiler) {
      return "element" + compiler.elementNumber;
    }
    __exports__.topElement = topElement;
  });

define("htmlbars/compiler/helpers", 
  ["htmlbars/compiler/quoting","htmlbars/compiler/stack","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var array = __dependency1__.array;
    var hash = __dependency1__.hash;
    var string = __dependency1__.string;
    var popStack = __dependency2__.popStack;

    function prepareHelper(stack, size) {
      var args = [],
          types = [],
          hashPairs = [],
          hashTypes = [],
          keyName,
          i;

      var hashSize = popStack(stack);

      for (i=0; i<hashSize; i++) {
        keyName = popStack(stack);
        hashPairs.push(keyName + ':' + popStack(stack));
        hashTypes.push(keyName + ':' + popStack(stack));
      }

      for (var i=0; i<size; i++) {
        args.push(popStack(stack));
        types.push(popStack(stack));
      }

      var programId = popStack(stack);

      var options = ['types:' + array(types), 'hashTypes:' + hash(hashTypes), 'hash:' + hash(hashPairs)];

      if (programId !== null) {
        options.push('render:child' + programId + '(dom)');
      }

      return {
        options: options,
        args: array(args),
      };
    }

    __exports__.prepareHelper = prepareHelper;
  });

define("htmlbars/compiler/invoke", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function call(func) {
      if (typeof func.join === 'function') {
        func = func.join('.');
      }

      var params = [].slice.call(arguments, 1);
      return func + "(" + params.join(", ") + ")";
    }

    __exports__.call = call;

    function helper() {
      var args = [].slice.call(arguments, 0);
      args[0] = 'dom.' + args[0];
      return call.apply(this, args);
    }
    __exports__.helper = helper;
  });

define("htmlbars/compiler/pass1", 
  ["htmlbars/utils","htmlbars/ast","htmlbars/compiler/attr","htmlbars/compiler/utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var merge = __dependency1__.merge;
    var HTMLElement = __dependency2__.HTMLElement;
    var BlockElement = __dependency2__.BlockElement;
    var AttrCompiler = __dependency3__.AttrCompiler;
    var compileAST = __dependency4__.compileAST;

    function compileAttr(ast, options) {
      var compiler1 = new Compiler1(options),
          attrCompiler = new AttrCompiler(options);

      var opcodes = compiler1.compile(ast);
      return attrCompiler.compile(opcodes)
    }

    function Compiler1(options) {
      this.options = options || {};

      var knownHelpers = {
        'helperMissing': true,
        'blockHelperMissing': true,
        'each': true,
        'if': true,
        'unless': true,
        'with': true,
        'log': true
      };

      this.options.knownHelpers = this.options.knownHelpers || {};
      merge(knownHelpers, this.options.knownHelpers);
    };

    var compiler1 = Compiler1.prototype;

    compiler1.compile = function(ast) {
      this.opcodes = [];
      this.children = [];
      processChildren(this, ast);
      return this.opcodes;
    };

    function processChildren(compiler, children) {
      var node;

      for (var i=0, l=children.length; i<l; i++) {
        node = children[i];

        if (typeof node === 'string') {
          compiler.string(node);
        } else if (node instanceof HTMLElement) {
          compiler.element(node);
        } else if (node instanceof BlockElement) {
          compiler.block(node);
        } else {
          compiler[node.type](node);
        }
      }
    }

    compiler1.block = function(block) {
      var program = compileAST(block.children, this.options),
          mustache = block.helper;

      this.children.push(program);

      this.opcode('program', this.children.length - 1);
      processParams(this, mustache.params);
      processHash(this, mustache.hash);
      this.opcode('helper', mustache.id.string, mustache.params.length, mustache.escaped);
      this.opcode('appendFragment');
    }

    compiler1.opcode = function(type) {
      var params = [].slice.call(arguments, 1);
      this.opcodes.push({ type: type, params: params });
    };

    compiler1.string = function(string) {
      this.opcode('content', string);
    };

    compiler1.element = function(element) {
      this.opcode('openElement', element.tag);

      element.attributes.forEach(function(attribute) {
        this.attribute(attribute);
      }, this);

      element.helpers.forEach(function(helper) {
        this.nodeHelper(helper);
      }, this);

      processChildren(this, element.children);

      this.opcode('closeElement');
    };

    compiler1.attribute = function(attribute) {
      var name = attribute[0],
          value = attribute[1];

      var program = compileAttr(value);
      this.children.push(program);

      this.opcode('attribute', name, this.children.length - 1);
      return;
    };

    compiler1.nodeHelper = function(mustache) {
      this.opcode('program', null);
      processParams(this, mustache.params);
      processHash(this, mustache.hash);
      this.opcode('nodeHelper', mustache.id.string, mustache.params.length);
    };

    compiler1.mustache = function(mustache) {
      var type = classifyMustache(mustache, this.options);

      if (type === 'simple') {
        this.opcode('dynamic', mustache.id.parts, mustache.escaped);
      } else if (type === 'ambiguous') {
        this.opcode('ambiguous', mustache.id.string, mustache.escaped);
      } else {
        this.opcode('program', null);
        processParams(this, mustache.params);
        processHash(this, mustache.hash);
        this.opcode('helper', mustache.id.string, mustache.params.length, mustache.escaped);
      }

      appendMustache(this, mustache);
    };

    compiler1.ID = function(id) {
      this.opcode('id', id.parts);
    };

    compiler1.STRING = function(string) {
      this.opcode('string', string.stringModeValue);
    };

    compiler1.BOOLEAN = function(boolean) {
      this.opcode('literal', boolean.stringModeValue);
    };

    compiler1.INTEGER = function(integer) {
      this.opcode('literal', integer.stringModeValue);
    }

    function classifyMustache(mustache, options) {
      var isHelper   = mustache.isHelper;
      var isEligible = mustache.eligibleHelper;

      // if ambiguous, we can possibly resolve the ambiguity now
      if (isEligible && !isHelper) {
        var name = mustache.id.parts[0];

        if (options.knownHelpers[name]) {
          isHelper = true;
        } else if (options.knownHelpersOnly) {
          isEligible = false;
        }
      }

      if (isHelper) { return "helper"; }
      else if (isEligible) { return "ambiguous"; }
      else { return "simple"; }
    }

    function processParams(compiler, params) {
      params.forEach(function(param) {
        compiler[param.type](param);
      });
    }

    function processHash(compiler, hash) {
      if (hash) {
        hash.pairs.forEach(function(pair) {
          var name = pair[0], param = pair[1];
          compiler[param.type](param);
          compiler.opcode('stackLiteral', name);
        });
        compiler.opcode('stackLiteral', hash.pairs.length);
      } else {
        compiler.opcode('stackLiteral', 0);
      }
    }

    function appendMustache(compiler, mustache) {
      if (mustache.escaped) {
        compiler.opcode('appendText');
      } else {
        compiler.opcode('appendHTML');
      }
    }

    __exports__.Compiler1 = Compiler1;
  });

define("htmlbars/compiler/pass2", 
  ["htmlbars/compiler/utils","htmlbars/compiler/helpers","htmlbars/compiler/invoke","htmlbars/compiler/elements","htmlbars/compiler/stack","htmlbars/compiler/quoting","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __exports__) {
    "use strict";
    /*jshint evil:true*/

    var processOpcodes = __dependency1__.processOpcodes;
    var prepareHelper = __dependency2__.prepareHelper;
    var call = __dependency3__.call;
    var helper = __dependency3__.helper;
    var pushElement = __dependency4__.pushElement;
    var popElement = __dependency4__.popElement;
    var topElement = __dependency4__.topElement;
    var pushStack = __dependency5__.pushStack;
    var popStack = __dependency5__.popStack;
    var string = __dependency6__.string;
    var quotedArray = __dependency6__.quotedArray;
    var hash = __dependency6__.hash;

    function Compiler2() {}

    var compiler2 = Compiler2.prototype;

    compiler2.compile = function(opcodes, options) {
      this.output = [];
      this.elementNumber = 0;
      this.stackNumber = 0;
      this.stack = [];
      this.children = options.children;

      this.output.push("return function template(context, options) {");
      this.preamble();
      processOpcodes(this, opcodes);
      this.postamble();
      this.output.push("};");

      // console.debug(this.output.join("\n"));

      // have the generated function close over the DOM helpers
      return new Function('dom', this.output.join("\n"));
    };

    compiler2.preamble = function() {
      this.children.forEach(function(child, i) {
        this.push("var child" + i + " = " + child.toString());
      }, this);

      this.push("var element0, el");
      this.push("var frag = element0 = document.createDocumentFragment()");
    };

    compiler2.postamble = function() {
      this.output.push("return frag;");
    };

    compiler2.program = function(programId) {
      pushStack(this.stack, programId);
    };

    compiler2.content = function(str) {
      this.push(call([this.el(), 'appendChild'], helper('frag', this.el(), string(str))));
    };

    compiler2.push = function(string) {
      this.output.push(string + ";");
    };

    compiler2.el = function() {
      return topElement(this);
    };

    compiler2.id = function(parts) {
      pushStack(this.stack, string('id'));
      pushStack(this.stack, quotedArray(parts));
    };

    compiler2.literal = function(literal) {
      pushStack(this.stack, string(typeof literal));
      pushStack(this.stack, literal);
    };

    compiler2.stackLiteral = function(literal) {
      pushStack(this.stack, literal);
    };

    compiler2.string = function(str) {
      pushStack(this.stack, string('string'));
      pushStack(this.stack, string(str));
    };

    compiler2.appendText = function() {
      this.push(helper('appendText', this.el(), popStack(this.stack)));
    };

    compiler2.appendHTML = function() {
      this.push(helper('appendHTML', this.el(), popStack(this.stack)));
    };

    compiler2.appendFragment = function() {
      this.push(helper('appendFragment', this.el(), popStack(this.stack)));
    };

    compiler2.openElement = function(tagName) {
      var elRef = pushElement(this);
      this.push("var " + elRef + " = el = " + call('document.createElement', string(tagName)));
    };

    compiler2.attribute = function(name, child) {
      var invokeRererender = call('el.setAttribute', string(name), call('child' + child, 'context', hash(['rerender:rerender'])));
      var rerender = 'function rerender() { ' + invokeRererender + '}';
      var options = hash(['rerender:' + rerender, 'element:el', 'attrName:' + string(name)]);
      pushStack(this.stack, call('child' + child, 'context', options));

      this.push(call('el.setAttribute', string(name), popStack(this.stack)));
    };

    compiler2.closeElement = function() {
      var elRef = popElement(this);
      this.push(call([this.el(), 'appendChild'], elRef));
    };

    compiler2.dynamic = function(parts, escaped) {
      pushStack(this.stack, helper('resolveContents', 'context', quotedArray(parts), this.el(), escaped));
    };

    compiler2.ambiguous = function(str, escaped) {
      pushStack(this.stack, helper('ambiguousContents', this.el(), 'context', string(str), escaped));
    };

    compiler2.helper = function(name, size, escaped) {
      var prepared = prepareHelper(this.stack, size);
      pushStack(this.stack, helper('helperContents', string(name), this.el(), 'context', prepared.args, hash(prepared.options)));
    };

    compiler2.nodeHelper = function(name, size) {
      var prepared = prepareHelper(this.stack, size);
      this.push(helper('helperContents', string(name), this.el(), 'context', prepared.args, hash(prepared.options)));
    };

    __exports__.Compiler2 = Compiler2;
  });

define("htmlbars/compiler/quoting", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function escapeString(str) {
      return str.replace(/'/g, "\\'");
    }

    __exports__.escapeString = escapeString;

    function string(str) {
      return "'" + escapeString(str) + "'";
    }

    __exports__.string = string;

    function array(array) {
      return "[" + array + "]";
    }

    __exports__.array = array;

    function quotedArray(list) {
      return array(list.map(string).join(", "));
    }

    __exports__.quotedArray = quotedArray;function hash(pairs) {
      return "{" + pairs.join(",") + "}";
    }
    __exports__.hash = hash;
  });

define("htmlbars/compiler/stack", 
  ["exports"],
  function(__exports__) {
    "use strict";
    // this file exists in anticipation of a more involved
    // stack implementation involving temporary variables

    function pushStack(stack, literal) {
      stack.push({ literal: true, value: literal });
    }

    __exports__.pushStack = pushStack;function popStack(stack) {
      var poppedValue = stack.pop();
      return poppedValue.value;
    }
    __exports__.popStack = popStack;
  });

define("htmlbars/compiler/utils", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function processOpcodes(compiler, opcodes) {
      opcodes.forEach(function(opcode) {
        compiler[opcode.type].apply(compiler, opcode.params);
      });
    }

    __exports__.processOpcodes = processOpcodes;function compileAST(ast, options) {
      // circular dependency hack
      var Compiler1 = requireModule('htmlbars/compiler/pass1').Compiler1;
      var Compiler2 = requireModule('htmlbars/compiler/pass2').Compiler2;

      var compiler1 = new Compiler1(options),
          compiler2 = new Compiler2(options);

      var opcodes = compiler1.compile(ast);
      return compiler2.compile(opcodes, {
        children: compiler1.children
      });
    }

    __exports__.compileAST = compileAST;
  });

define("htmlbars/helpers", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var helpers = {};

    function registerHelper(name, callback) {
      helpers[name] = callback;
    }

    __exports__.registerHelper = registerHelper;function removeHelper(name) {
      delete helpers[name];
    }

    __exports__.removeHelper = removeHelper;__exports__.helpers = helpers;
  });

define("htmlbars/html-parser/process-token", 
  ["htmlbars/ast","simple-html-tokenizer","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var HTMLElement = __dependency1__.HTMLElement;
    var BlockElement = __dependency1__.BlockElement;
    var Chars = __dependency2__.Chars;
    var StartTag = __dependency2__.StartTag;
    var EndTag = __dependency2__.EndTag;

    /**
      @param {String} state the current state of the tokenizer
      @param {Array} stack the element stack
      @token {Token} token the current token being built
      @child {Token|Mustache|Block} child the new token to insert into the AST
    */
    function processToken(state, stack, token, child) {
      // EOF
      if (child === undefined) { return; }
      return handlers[child.type](child, currentElement(stack), stack, token, state);
    }

    __exports__.processToken = processToken;function currentElement(stack) {
      return stack[stack.length - 1];
    }

    // This table maps from the state names in the tokenizer to a smaller
    // number of states that control how mustaches are handled
    var states = {
      "attributeValueDoubleQuoted": "attr",
      "attributeValueSingleQuoted": "attr",
      "attributeValueUnquoted": "attr",
      "beforeAttributeName": "in-tag"
    }

    var voidTagNames = "area base br col command embed hr img input keygen link meta param source track wbr";
    var voidMap = {};

    voidTagNames.split(" ").forEach(function(tagName) {
      voidMap[tagName] = true;
    });

    // Except for `mustache`, all tokens are only allowed outside of
    // a start or end tag.
    var handlers = {
      Chars: function(token, current) {
        current.appendChild(token.chars);
      },

      StartTag: function(tag, current, stack) {
        var element = new HTMLElement(tag.tagName, tag.attributes, [], tag.helpers);
        stack.push(element);

        if (voidMap.hasOwnProperty(tag.tagName)) {
          this.EndTag(tag, element, stack);
        }
      },

      block: function(block, current, stack) {
        stack.push(new BlockElement(block.mustache));
      },

      mustache: function(mustache, current, stack, token, state) {
        switch(states[state]) {
          case "attr":
            token.addToAttributeValue(mustache);
            return;
          case "in-tag":
            token.addTagHelper(mustache);
            return;
          default:
            current.appendChild(mustache);
        }
      },

      EndTag: function(tag, current, stack) {
        if (current.tag !== tag.tagName) {
          throw new Error("Closing tag " + tag.tagName + " did not match last open tag " + current.tag);
        }

        var value = config.processHTMLMacros(current);
        stack.pop();

        if (value === 'veto') { return; }

        var parent = currentElement(stack);
        parent.appendChild(value || current);
      }
    };

    var config = {
      processHTMLMacros: function() {}
    };

    __exports__.config = config;
  });

define("htmlbars/macros", 
  ["htmlbars/html-parser/process-token","htmlbars/ast","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var config = __dependency1__.config;
    var HTMLElement = __dependency2__.HTMLElement;

    var htmlMacros = {};

    function registerMacro(name, test, mutate) {
      htmlMacros[name] = { test: test, mutate: mutate };
    }

    __exports__.registerMacro = registerMacro;function removeMacro(name) {
      delete htmlMacros[name];
    }

    __exports__.removeMacro = removeMacro;function processHTMLMacros(element) {
      var mutated, newElement;

      for (var prop in htmlMacros) {
        var macro = htmlMacros[prop];
        if (macro.test(element)) {
          newElement = macro.mutate(element);
          if (newElement === undefined) { newElement = element; }
          mutated = true;
          break;
        }
      }

      if (!mutated) {
        return element;
      } else if (newElement instanceof HTMLElement) {
        return processHTMLMacros(newElement);
      } else {
        return newElement;
      }
    }

    // configure the HTML Parser
    config.processHTMLMacros = processHTMLMacros;
  });

define("htmlbars/parser", 
  ["simple-html-tokenizer","htmlbars/ast","htmlbars/html-parser/process-token","handlebars","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var Tokenizer = __dependency1__.Tokenizer;
    var Chars = __dependency1__.Chars;
    var StartTag = __dependency1__.StartTag;
    var EndTag = __dependency1__.EndTag;
    var HTMLElement = __dependency2__.HTMLElement;
    var BlockElement = __dependency2__.BlockElement;
    var processToken = __dependency3__.processToken;
    var Handlebars = __dependency4__['default'];

    function Visitor() {}

    Visitor.prototype = {
      constructor: Visitor,

      accept: function(node) {
        return this[node.type](node);
      }
    };

    function preprocess(html) {
      var ast = Handlebars.parse(html);
      return new HTMLProcessor().accept(ast);
    }

    __exports__.preprocess = preprocess;function HTMLProcessor() {
      // document fragment
      this.elementStack = [new HTMLElement()];
      this.tokenizer = new Tokenizer('');
    }

    // TODO: ES3 polyfill
    var processor = HTMLProcessor.prototype = Object.create(Visitor.prototype);

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
    };
  });

define("htmlbars/runtime", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function domHelpers(helpers) {
      return {
        // These methods are runtime for now. If they are too expensive,
        // I may inline them at compile-time.
        appendText: function(element, value) {
          if (value === undefined) { return; }
          element.appendChild(document.createTextNode(value));
        },

        appendHTML: function(element, value) {
          if (value === undefined) { return; }
          element.appendChild(this.frag(element, value));
        },

        appendFragment: function(element, fragment) {
          if (fragment === undefined) { return; }
          element.appendChild(fragment);
        },

        ambiguousContents: function(element, context, string, escaped) {
          var helper, value, args;

          if (helper = helpers[string]) {
            return this.helperContents(string, element, context, [], { element: element, escaped: escaped });
          } else {
            return this.resolveContents(context, [string], element, escaped);
          }
        },

        helperContents: function(name, element, context, args, options) {
          var helper = helpers[name];
          options.element = element;
          args.push(options);
          return helper.apply(context, args);
        },

        resolveContents: function(context, parts, element, escaped) {
          var helper = helpers.RESOLVE;
          if (helper) {
            return helper.apply(context, [parts, { element: element, escaped: escaped }]);
          }

          return parts.reduce(function(current, part) {
            return current[part];
          }, context);
        },

        ambiguousAttr: function(context, string, options) {
          var helper;

          if (helper = helpers[string]) {
            throw new Error("helperAttr is not implemented yet");
          } else {
            return this.resolveInAttr(context, [string], options);
          }
        },

        helperAttr: function(context, name, args, options) {
          var helper = helpers[name];
          args.push(options);
          return helper.apply(context, args);
        },

        resolveInAttr: function(context, parts, options) {
          var helper = helpers.RESOLVE_IN_ATTR;

          if (helper) {
            return helper.apply(context, [parts, options]);
          }

          return parts.reduce(function(current, part) {
            return current[part];
          }, context);
        },

        frag: function(element, string) {
          /*global DocumentFragment*/
          if (element instanceof DocumentFragment) {
            element = document.createElement('div');
          }

          var range = document.createRange();
          range.setStart(element, 0);
          range.collapse(false);
          return range.createContextualFragment(string);
        }
      };
    }

    __exports__.domHelpers = domHelpers;function hydrate(spec, options) {
      return spec(domHelpers(options.helpers || {}));
    }

    __exports__.hydrate = hydrate;
  });

define("htmlbars/utils", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function merge(options, defaults) {
      for (var prop in defaults) {
        if (options.hasOwnProperty(prop)) { continue; }
        options[prop] = defaults[prop];
      }
    }

    __exports__.merge = merge;
  });

define("loader", 
  [],
  function() {
    "use strict";
    var define, require;

    (function() {
      var registry = {}, seen = {};

      define = function(name, deps, callback) {
        registry[name] = { deps: deps, callback: callback };
      };

      require = function require(name) {
        if (seen[name]) { return seen[name]; }
        seen[name] = {};

        var mod = registry[name],
            deps = mod.deps,
            callback = mod.callback,
            reified = [],
            exports;

        for (var i=0, l=deps.length; i<l; i++) {
          if (deps[i] === 'exports') {
            reified.push(exports = {});
          } else {
            reified.push(require(deps[i]));
          }
        }

        var value = callback.apply(this, reified);
        return seen[name] = exports || value;
      };
    })();
  });

define("simple-html-tokenizer", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /*jshint boss:true*/

    var objectCreate = Object.create || function(obj) {
      function F() {}
      F.prototype = obj;
      return new F();
    };

    function isSpace(char) {
      return (/[\n\r\t ]/).test(char);
    }

    function isAlpha(char) {
      return (/[A-Za-z]/).test(char);
    }

    function Tokenizer(input) {
      this.input = input;
      this.char = 0;
      this.state = 'data';
      this.token = null;
    }

    Tokenizer.prototype = {
      tokenize: function() {
        var tokens = [], token;

        while (true) {
          token = this.lex();
          if (token === 'EOF') { break; }
          if (token) { tokens.push(token); }
        }

        if (this.token) {
          tokens.push(this.token);
        }

        return tokens;
      },

      tokenizePart: function(string) {
        this.input += string;
        var tokens = [], token;

        while (this.char < this.input.length) {
          token = this.lex();
          if (token) { tokens.push(token); }
        }

        this.tokens = (this.tokens || []).concat(tokens);
        return tokens;
      },

      tokenizeEOF: function() {
        if (this.token) {
          return this.token;
        }
      },

      tag: function(Type, char) {
        char = char.toLowerCase();

        var lastToken = this.token;
        this.token = new Type(char);
        this.state = 'tagName';
        return lastToken;
      },

      selfClosing: function() {
        this.token.selfClosing = true;
      },

      attribute: function(char) {
        this.token.startAttribute(char);
        this.state = 'attributeName';
      },

      addToAttributeName: function(char) {
        this.token.addToAttributeName(char.toLowerCase());
      },

      addToAttributeValue: function(char) {
        this.token.addToAttributeValue(char);
      },

      commentStart: function() {
        var lastToken = this.token;
        this.token = new CommentToken();
        this.state = 'commentStart';
        return lastToken;
      },

      addToComment: function(char) {
        this.token.addChar(char);
      },

      emitData: function() {
        var lastToken = this.token;
        this.token = null;
        this.state = 'tagOpen';
        return lastToken;
      },

      emitToken: function() {
        var lastToken = this.token.finalize();
        this.token = null;
        this.state = 'data';
        return lastToken;
      },

      addData: function(char) {
        if (this.token === null) {
          this.token = new Chars();
        }

        this.token.addChar(char);
      },

      lex: function() {
        var char = this.input.charAt(this.char++);

        if (char) {
          // console.log(this.state, char);
          return this.states[this.state].call(this, char);
        } else {
          return 'EOF';
        }
      },

      states: {
        data: function(char) {
          if (char === "<") {
            return this.emitData();
          } else {
            this.addData(char);
          }
        },

        tagOpen: function(char) {
          if (char === "!") {
            this.state = 'markupDeclaration';
          } else if (char === "/") {
            this.state = 'endTagOpen';
          } else if (!isSpace(char)) {
            return this.tag(StartTag, char);
          }
        },

        markupDeclaration: function(char) {
          if (char === "-" && this.input[this.char] === "-") {
            this.char++;
            this.commentStart();
          }
        },

        commentStart: function(char) {
          if (char === "-") {
            this.state = 'commentStartDash';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.addToComment(char);
            this.state = 'comment';
          }
        },

        commentStartDash: function(char) {
          if (char === "-") {
            this.state = 'commentEnd';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.addToComment("-");
            this.state = 'comment';
          }
        },

        comment: function(char) {
          if (char === "-") {
            this.state = 'commentEndDash';
          } else {
            this.addToComment(char);
          }
        },

        commentEndDash: function(char) {
          if (char === "-") {
            this.state = 'commentEnd';
          } else {
            this.addToComment('-' + char);
            this.state = 'comment';
          }
        },

        commentEnd: function(char) {
          if (char === ">") {
            return this.emitToken();
          }
        },

        tagName: function(char) {
          if (isSpace(char)) {
            this.state = 'beforeAttributeName';
          } else if(/[A-Za-z]/.test(char)) {
            this.token.addToTagName(char);
          } else if (char === ">") {
            return this.emitToken();
          }
        },

        beforeAttributeName: function(char) {
          if (isSpace(char)) {
            return;
          } else if (char === "/") {
            this.state = 'selfClosingStartTag';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.attribute(char);
          }
        },

        attributeName: function(char) {
          if (isSpace(char)) {
            this.state = 'afterAttributeName';
          } else if (char === "/") {
            this.state = 'selfClosingStartTag';
          } else if (char === "=") {
            this.state = 'beforeAttributeValue';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.addToAttributeName(char);
          }
        },

        beforeAttributeValue: function(char) {
          if (isSpace(char)) {
            return;
          } else if (char === '"') {
            this.state = 'attributeValueDoubleQuoted';
          } else if (char === "'") {
            this.state = 'attributeValueSingleQuoted';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.state = 'attributeValueUnquoted';
            this.addToAttributeValue(char);
          }
        },

        attributeValueDoubleQuoted: function(char) {
          if (char === '"') {
            this.state = 'afterAttributeValueQuoted';
          } else {
            this.addToAttributeValue(char);
          }
        },

        attributeValueSingleQuoted: function(char) {
          if (char === "'") {
            this.state = 'afterAttributeValueQuoted';
          } else {
            this.addToAttributeValue(char);
          }
        },

        attributeValueUnquoted: function(char) {
          if (isSpace(char)) {
            this.state = 'beforeAttributeName';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.addToAttributeValue(char);
          }
        },

        afterAttributeValueQuoted: function(char) {
          if (isSpace(char)) {
            this.state = 'beforeAttributeName';
          } else if (char === "/") {
            this.state = 'selfClosingStartTag';
          } else if (char === ">") {
            return this.emitToken();
          } else {
            this.char--;
            this.state = 'beforeAttributeName';
          }
        },

        selfClosingStartTag: function(char) {
          if (char === ">") {
            this.selfClosing();
            return this.emitToken();
          } else {
            this.char--;
            this.state = 'beforeAttributeName';
          }
        },

        endTagOpen: function(char) {
          if (isAlpha(char)) {
            this.tag(EndTag, char);
          }
        }
      }
    };

    function Tag(tagName, attributes, options) {
      this.tagName = tagName || "";
      this.attributes = attributes || [];
      this.selfClosing = options ? options.selfClosing : false;
    }

    Tag.prototype = {
      constructor: Tag,

      addToTagName: function(char) {
        this.tagName += char;
      },

      startAttribute: function(char) {
        this.currentAttribute = [char.toLowerCase(), null];
        this.attributes.push(this.currentAttribute);
      },

      addToAttributeName: function(char) {
        this.currentAttribute[0] += char;
      },

      addToAttributeValue: function(char) {
        this.currentAttribute[1] = this.currentAttribute[1] || "";
        this.currentAttribute[1] += char;
      },

      finalize: function() {
        delete this.currentAttribute;
        return this;
      }
    };

    function StartTag() {
      Tag.apply(this, arguments);
    }

    StartTag.prototype = objectCreate(Tag.prototype);
    StartTag.prototype.type = 'StartTag';
    StartTag.prototype.constructor = StartTag;

    StartTag.prototype.toHTML = function() {
      return config.generateTag(this);
    };

    function generateTag(tag) {
      var out = "<";
      out += tag.tagName;

      if (tag.attributes.length) {
        out += " " + config.generateAttributes(tag.attributes);
      }

      out += ">";

      return out;
    }

    function generateAttributes(attributes) {
      var out = [], attribute, attrString, value;

      for (var i=0, l=attributes.length; i<l; i++) {
        attribute = attributes[i];

        out.push(config.generateAttribute.apply(this, attribute));
      }

      return out.join(" ");
    }

    function generateAttribute(name, value) {
      var attrString = name;

      if (value) {
        value = value.replace(/"/, '\\"');
        attrString += "=\"" + value + "\"";
      }

      return attrString;
    }

    function EndTag() {
      Tag.apply(this, arguments);
    }

    EndTag.prototype = objectCreate(Tag.prototype);
    EndTag.prototype.type = 'EndTag';
    EndTag.prototype.constructor = EndTag;

    EndTag.prototype.toHTML = function() {
      var out = "</";
      out += this.tagName;
      out += ">";

      return out;
    };

    function Chars(chars) {
      this.chars = chars || "";
    }

    Chars.prototype = {
      type: 'Chars',
      constructor: Chars,

      addChar: function(char) {
        this.chars += char;
      },

      toHTML: function() {
        return this.chars;
      }
    };

    function CommentToken() {
      this.chars = "";
    }

    CommentToken.prototype = {
      type: 'CommentToken',
      constructor: CommentToken,
      
      finalize: function() { return this; },

      addChar: function(char) {
        this.chars += char;
      },

      toHTML: function() {
        return "<!--" + this.chars + "-->";
      }
    };

    function tokenize(input) {
      var tokenizer = new Tokenizer(input);
      return tokenizer.tokenize();
    }

    function generate(tokens) {
      var output = "";

      for (var i=0, l=tokens.length; i<l; i++) {
        output += tokens[i].toHTML();
      }

      return output;
    }

    var config = {
      generateAttributes: generateAttributes,
      generateAttribute: generateAttribute,
      generateTag: generateTag
    };

    var original = {
      generateAttributes: generateAttributes,
      generateAttribute: generateAttribute,
      generateTag: generateTag
    };

    function configure(name, value) {
      config[name] = value;
    }

    __exports__.Tokenizer = Tokenizer;
    __exports__.tokenize = tokenize;
    __exports__.generate = generate;
    __exports__.configure = configure;
    __exports__.original = original;
    __exports__.StartTag = StartTag;
    __exports__.EndTag = EndTag;
    __exports__.Chars = Chars;
    __exports__.CommentToken = CommentToken;
  });
window.htmlbars = requireModule("htmlbars");
})(window);
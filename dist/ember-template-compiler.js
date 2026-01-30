(function() {
/*!
 * @overview  Ember - JavaScript Application Framework
 * @copyright Copyright 2011-2017 Tilde Inc. and contributors
 *            Portions Copyright 2006-2011 Strobe Inc.
 *            Portions Copyright 2008-2011 Apple Inc. All rights reserved.
 * @license   Licensed under MIT license
 *            See https://raw.github.com/emberjs/ember.js/master/LICENSE
 * @version   2.18.3+96faeee4
 */

/*global process */
var enifed, requireModule, Ember;
var mainContext = this; // Used in ember-environment/lib/global.js

(function() {
    function missingModule(name, referrerName) {
      if (referrerName) {
        throw new Error('Could not find module ' + name + ' required by: ' + referrerName);
      } else {
        throw new Error('Could not find module ' + name);
      }
    }

    function internalRequire(_name, referrerName) {
      var name = _name;
      var mod = registry[name];

      if (!mod) {
        name = name + '/index';
        mod = registry[name];
      }

      var exports = seen[name];

      if (exports !== undefined) {
        return exports;
      }

      exports = seen[name] = {};

      if (!mod) {
        missingModule(_name, referrerName);
      }

      var deps = mod.deps;
      var callback = mod.callback;
      var reified = new Array(deps.length);

      for (var i = 0; i < deps.length; i++) {
        if (deps[i] === 'exports') {
          reified[i] = exports;
        } else if (deps[i] === 'require') {
          reified[i] = requireModule;
        } else {
          reified[i] = internalRequire(deps[i], name);
        }
      }

      callback.apply(this, reified);

      return exports;
    }

  var isNode = typeof window === 'undefined' &&
    typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

  if (!isNode) {
    Ember = this.Ember = this.Ember || {};
  }

  if (typeof Ember === 'undefined') { Ember = {}; }

  if (typeof Ember.__loader === 'undefined') {
    var registry = {};
    var seen = {};

    enifed = function(name, deps, callback) {
      var value = { };

      if (!callback) {
        value.deps = [];
        value.callback = deps;
      } else {
        value.deps = deps;
        value.callback = callback;
      }

      registry[name] = value;
    };

    requireModule = function(name) {
      return internalRequire(name, null);
    };

    // setup `require` module
    requireModule['default'] = requireModule;

    requireModule.has = function registryHas(moduleName) {
      return !!registry[moduleName] || !!registry[moduleName + '/index'];
    };

    requireModule._eak_seen = registry;

    Ember.__loader = {
      define: enifed,
      require: requireModule,
      registry: registry
    };
  } else {
    enifed = Ember.__loader.define;
    requireModule = Ember.__loader.require;
  }
})();

enifed('@glimmer/compiler', ['exports', 'node-module', '@glimmer/syntax', '@glimmer/util', '@glimmer/wire-format'], function (exports, _nodeModule, _syntax, _util, _wireFormat) {
    'use strict';

    exports.TemplateVisitor = exports.precompile = undefined;

    var _createClass$1 = function () {
        function defineProperties(target, props) {
            var i, descriptor;

            for (i = 0; i < props.length; i++) {
                descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
            }
        }return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
        };
    }();

    function _defaults(obj, defaults) {
        var keys = Object.getOwnPropertyNames(defaults),
            i,
            key,
            value;for (i = 0; i < keys.length; i++) {
            key = keys[i];
            value = Object.getOwnPropertyDescriptor(defaults, key);
            if (value && value.configurable && obj[key] === undefined) {
                Object.defineProperty(obj, key, value);
            }
        }return obj;
    }

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults(subClass, superClass);
    }

    function _classCallCheck$1(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var SymbolTable = function () {
        function SymbolTable() {
            _classCallCheck$1(this, SymbolTable);
        }

        SymbolTable.top = function () {
            return new ProgramSymbolTable();
        };

        SymbolTable.prototype.child = function (locals) {
            var _this = this;

            var symbols = locals.map(function (name) {
                return _this.allocate(name);
            });
            return new BlockSymbolTable(this, locals, symbols);
        };

        return SymbolTable;
    }();
    var ProgramSymbolTable = function (_SymbolTable) {
        _inherits(ProgramSymbolTable, _SymbolTable);

        function ProgramSymbolTable() {
            _classCallCheck$1(this, ProgramSymbolTable);

            var _this2 = _possibleConstructorReturn(this, _SymbolTable.apply(this, arguments));

            _this2.symbols = [];
            _this2.size = 1;
            _this2.named = (0, _util.dict)();
            _this2.blocks = (0, _util.dict)();
            return _this2;
        }

        ProgramSymbolTable.prototype.has = function () {
            return false;
        };

        ProgramSymbolTable.prototype.get = function () {
            throw (0, _util.unreachable)();
        };

        ProgramSymbolTable.prototype.getLocalsMap = function () {
            return {};
        };

        ProgramSymbolTable.prototype.getEvalInfo = function () {
            return [];
        };

        ProgramSymbolTable.prototype.allocateNamed = function (name) {
            var named = this.named[name];
            if (!named) {
                named = this.named[name] = this.allocate('@' + name);
            }
            return named;
        };

        ProgramSymbolTable.prototype.allocateBlock = function (name) {
            var block = this.blocks[name];
            if (!block) {
                block = this.blocks[name] = this.allocate('&' + name);
            }
            return block;
        };

        ProgramSymbolTable.prototype.allocate = function (identifier) {
            this.symbols.push(identifier);
            return this.size++;
        };

        return ProgramSymbolTable;
    }(SymbolTable);
    var BlockSymbolTable = function (_SymbolTable2) {
        _inherits(BlockSymbolTable, _SymbolTable2);

        function BlockSymbolTable(parent, symbols, slots) {
            _classCallCheck$1(this, BlockSymbolTable);

            var _this3 = _possibleConstructorReturn(this, _SymbolTable2.call(this));

            _this3.parent = parent;
            _this3.symbols = symbols;
            _this3.slots = slots;
            return _this3;
        }

        BlockSymbolTable.prototype.has = function (name) {
            return this.symbols.indexOf(name) !== -1 || this.parent.has(name);
        };

        BlockSymbolTable.prototype.get = function (name) {
            var slot = this.symbols.indexOf(name);
            return slot === -1 ? this.parent.get(name) : this.slots[slot];
        };

        BlockSymbolTable.prototype.getLocalsMap = function () {
            var _this4 = this;

            var dict$$1 = this.parent.getLocalsMap();
            this.symbols.forEach(function (symbol) {
                return dict$$1[symbol] = _this4.get(symbol);
            });
            return dict$$1;
        };

        BlockSymbolTable.prototype.getEvalInfo = function () {
            var locals = this.getLocalsMap();
            return Object.keys(locals).map(function (symbol) {
                return locals[symbol];
            });
        };

        BlockSymbolTable.prototype.allocateNamed = function (name) {
            return this.parent.allocateNamed(name);
        };

        BlockSymbolTable.prototype.allocateBlock = function (name) {
            return this.parent.allocateBlock(name);
        };

        BlockSymbolTable.prototype.allocate = function (identifier) {
            return this.parent.allocate(identifier);
        };

        return BlockSymbolTable;
    }(SymbolTable);
    /**
     * Takes in an AST and outputs a list of actions to be consumed
     * by a compiler. For example, the template
     *
     *     foo{{bar}}<div>baz</div>
     *
     * produces the actions
     *
     *     [['startProgram', [programNode, 0]],
     *      ['text', [textNode, 0, 3]],
     *      ['mustache', [mustacheNode, 1, 3]],
     *      ['openElement', [elementNode, 2, 3, 0]],
     *      ['text', [textNode, 0, 1]],
     *      ['closeElement', [elementNode, 2, 3],
     *      ['endProgram', [programNode]]]
     *
     * This visitor walks the AST depth first and backwards. As
     * a result the bottom-most child template will appear at the
     * top of the actions list whereas the root template will appear
     * at the bottom of the list. For example,
     *
     *     <div>{{#if}}foo{{else}}bar<b></b>{{/if}}</div>
     *
     * produces the actions
     *
     *     [['startProgram', [programNode, 0]],
     *      ['text', [textNode, 0, 2, 0]],
     *      ['openElement', [elementNode, 1, 2, 0]],
     *      ['closeElement', [elementNode, 1, 2]],
     *      ['endProgram', [programNode]],
     *      ['startProgram', [programNode, 0]],
     *      ['text', [textNode, 0, 1]],
     *      ['endProgram', [programNode]],
     *      ['startProgram', [programNode, 2]],
     *      ['openElement', [elementNode, 0, 1, 1]],
     *      ['block', [blockNode, 0, 1]],
     *      ['closeElement', [elementNode, 0, 1]],
     *      ['endProgram', [programNode]]]
     *
     * The state of the traversal is maintained by a stack of frames.
     * Whenever a node with children is entered (either a ProgramNode
     * or an ElementNode) a frame is pushed onto the stack. The frame
     * contains information about the state of the traversal of that
     * node. For example,
     *
     *   - index of the current child node being visited
     *   - the number of mustaches contained within its child nodes
     *   - the list of actions generated by its child nodes
     */

    var Frame = function Frame() {
        _classCallCheck$1(this, Frame);

        this.parentNode = null;
        this.children = null;
        this.childIndex = null;
        this.childCount = null;
        this.childTemplateCount = 0;
        this.mustacheCount = 0;
        this.actions = [];
        this.blankChildTextNodes = null;
        this.symbols = null;
    };

    var TemplateVisitor = function () {
        function TemplateVisitor() {
            _classCallCheck$1(this, TemplateVisitor);

            this.frameStack = [];
            this.actions = [];
            this.programDepth = -1;
        }

        TemplateVisitor.prototype.visit = function (node) {
            this[node.type](node);
        };
        // Traversal methods


        TemplateVisitor.prototype.Program = function (program) {
            var _actions, i;

            this.programDepth++;
            var parentFrame = this.getCurrentFrame();
            var programFrame = this.pushFrame();
            if (!parentFrame) {
                program['symbols'] = SymbolTable.top();
            } else {
                program['symbols'] = parentFrame.symbols.child(program.blockParams);
            }
            var startType = void 0,
                endType = void 0;
            if (this.programDepth === 0) {
                startType = 'startProgram';
                endType = 'endProgram';
            } else {
                startType = 'startBlock';
                endType = 'endBlock';
            }
            programFrame.parentNode = program;
            programFrame.children = program.body;
            programFrame.childCount = program.body.length;
            programFrame.blankChildTextNodes = [];
            programFrame.actions.push([endType, [program, this.programDepth]]);
            programFrame.symbols = program['symbols'];
            for (i = program.body.length - 1; i >= 0; i--) {
                programFrame.childIndex = i;
                this.visit(program.body[i]);
            }
            programFrame.actions.push([startType, [program, programFrame.childTemplateCount, programFrame.blankChildTextNodes.reverse()]]);
            this.popFrame();
            this.programDepth--;
            // Push the completed template into the global actions list
            if (parentFrame) {
                parentFrame.childTemplateCount++;
            }
            (_actions = this.actions).push.apply(_actions, programFrame.actions.reverse());
        };

        TemplateVisitor.prototype.ElementNode = function (element) {
            var _parentFrame$actions, i, _i;

            var parentFrame = this.currentFrame;
            var elementFrame = this.pushFrame();
            elementFrame.parentNode = element;
            elementFrame.children = element.children;
            elementFrame.childCount = element.children.length;
            elementFrame.mustacheCount += element.modifiers.length;
            elementFrame.blankChildTextNodes = [];
            elementFrame.symbols = element['symbols'] = parentFrame.symbols.child(element.blockParams);
            var actionArgs = [element, parentFrame.childIndex, parentFrame.childCount];
            elementFrame.actions.push(['closeElement', actionArgs]);
            for (i = element.attributes.length - 1; i >= 0; i--) {
                this.visit(element.attributes[i]);
            }
            for (_i = element.children.length - 1; _i >= 0; _i--) {
                elementFrame.childIndex = _i;
                this.visit(element.children[_i]);
            }
            var open = ['openElement', [].concat(actionArgs, [elementFrame.mustacheCount, elementFrame.blankChildTextNodes.reverse()])];
            elementFrame.actions.push(open);
            this.popFrame();
            // Propagate the element's frame state to the parent frame
            if (elementFrame.mustacheCount > 0) {
                parentFrame.mustacheCount++;
            }
            parentFrame.childTemplateCount += elementFrame.childTemplateCount;
            (_parentFrame$actions = parentFrame.actions).push.apply(_parentFrame$actions, elementFrame.actions);
        };

        TemplateVisitor.prototype.AttrNode = function (attr) {
            if (attr.value.type !== 'TextNode') {
                this.currentFrame.mustacheCount++;
            }
        };

        TemplateVisitor.prototype.TextNode = function (text) {
            var frame = this.currentFrame;
            if (text.chars === '') {
                frame.blankChildTextNodes.push(domIndexOf(frame.children, text));
            }
            frame.actions.push(['text', [text, frame.childIndex, frame.childCount]]);
        };

        TemplateVisitor.prototype.BlockStatement = function (node) {
            var frame = this.currentFrame;
            frame.mustacheCount++;
            frame.actions.push(['block', [node, frame.childIndex, frame.childCount]]);
            if (node.inverse) {
                this.visit(node.inverse);
            }
            if (node.program) {
                this.visit(node.program);
            }
        };

        TemplateVisitor.prototype.PartialStatement = function (node) {
            var frame = this.currentFrame;
            frame.mustacheCount++;
            frame.actions.push(['mustache', [node, frame.childIndex, frame.childCount]]);
        };

        TemplateVisitor.prototype.CommentStatement = function (text) {
            var frame = this.currentFrame;
            frame.actions.push(['comment', [text, frame.childIndex, frame.childCount]]);
        };

        TemplateVisitor.prototype.MustacheCommentStatement = function () {
            // Intentional empty: Handlebars comments should not affect output.
        };

        TemplateVisitor.prototype.MustacheStatement = function (mustache) {
            var frame = this.currentFrame;
            frame.mustacheCount++;
            frame.actions.push(['mustache', [mustache, frame.childIndex, frame.childCount]]);
        };

        // Frame helpers


        TemplateVisitor.prototype.getCurrentFrame = function () {
            return this.frameStack[this.frameStack.length - 1];
        };

        TemplateVisitor.prototype.pushFrame = function () {
            var frame = new Frame();
            this.frameStack.push(frame);
            return frame;
        };

        TemplateVisitor.prototype.popFrame = function () {
            return this.frameStack.pop();
        };

        _createClass$1(TemplateVisitor, [{
            key: 'currentFrame',
            get: function () {
                return this.getCurrentFrame();
            }
        }]);

        return TemplateVisitor;
    }();
    function domIndexOf(nodes, domNode) {
        var index = -1,
            i,
            node;
        for (i = 0; i < nodes.length; i++) {
            node = nodes[i];

            if (node.type !== 'TextNode' && node.type !== 'ElementNode') {
                continue;
            } else {
                index++;
            }
            if (node === domNode) {
                return index;
            }
        }
        return -1;
    }

    var _createClass$2 = function () {
        function defineProperties(target, props) {
            var i, descriptor;

            for (i = 0; i < props.length; i++) {
                descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
            }
        }return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
        };
    }();

    function _defaults$1(obj, defaults) {
        var keys = Object.getOwnPropertyNames(defaults),
            i,
            key,
            value;for (i = 0; i < keys.length; i++) {
            key = keys[i];
            value = Object.getOwnPropertyDescriptor(defaults, key);
            if (value && value.configurable && obj[key] === undefined) {
                Object.defineProperty(obj, key, value);
            }
        }return obj;
    }

    function _possibleConstructorReturn$1(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits$1(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults$1(subClass, superClass);
    }

    function _classCallCheck$2(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var Block = function () {
        function Block() {
            _classCallCheck$2(this, Block);

            this.statements = [];
        }

        Block.prototype.push = function (statement) {
            this.statements.push(statement);
        };

        return Block;
    }();
    var InlineBlock = function (_Block) {
        _inherits$1(InlineBlock, _Block);

        function InlineBlock(table) {
            _classCallCheck$2(this, InlineBlock);

            var _this = _possibleConstructorReturn$1(this, _Block.call(this));

            _this.table = table;
            return _this;
        }

        InlineBlock.prototype.toJSON = function () {
            return {
                statements: this.statements,
                parameters: this.table.slots
            };
        };

        return InlineBlock;
    }(Block);
    var TemplateBlock = function (_Block2) {
        _inherits$1(TemplateBlock, _Block2);

        function TemplateBlock(symbolTable) {
            _classCallCheck$2(this, TemplateBlock);

            var _this2 = _possibleConstructorReturn$1(this, _Block2.call(this));

            _this2.symbolTable = symbolTable;
            _this2.type = "template";
            _this2.yields = new _util.DictSet();
            _this2.named = new _util.DictSet();
            _this2.blocks = [];
            _this2.hasEval = false;
            return _this2;
        }

        TemplateBlock.prototype.push = function (statement) {
            this.statements.push(statement);
        };

        TemplateBlock.prototype.toJSON = function () {
            return {
                symbols: this.symbolTable.symbols,
                statements: this.statements,
                hasEval: this.hasEval
            };
        };

        return TemplateBlock;
    }(Block);
    var ComponentBlock = function (_Block3) {
        _inherits$1(ComponentBlock, _Block3);

        function ComponentBlock(table) {
            _classCallCheck$2(this, ComponentBlock);

            var _this3 = _possibleConstructorReturn$1(this, _Block3.call(this));

            _this3.table = table;
            _this3.attributes = [];
            _this3.arguments = [];
            _this3.inParams = true;
            _this3.positionals = [];
            return _this3;
        }

        ComponentBlock.prototype.push = function (statement) {
            if (this.inParams) {
                if (_wireFormat.Statements.isFlushElement(statement)) {
                    this.inParams = false;
                } else if (_wireFormat.Statements.isArgument(statement)) {
                    this.arguments.push(statement);
                } else if (_wireFormat.Statements.isAttribute(statement)) {
                    this.attributes.push(statement);
                } else if (_wireFormat.Statements.isModifier(statement)) {
                    throw new Error('Compile Error: Element modifiers are not allowed in components');
                } else {
                    throw new Error('Compile Error: only parameters allowed before flush-element');
                }
            } else {
                this.statements.push(statement);
            }
        };

        ComponentBlock.prototype.toJSON = function () {
            var args = this.arguments;
            var keys = args.map(function (arg) {
                return arg[1];
            });
            var values = args.map(function (arg) {
                return arg[2];
            });
            return [this.attributes, [keys, values], {
                statements: this.statements,
                parameters: this.table.slots
            }];
        };

        return ComponentBlock;
    }(Block);
    var Template = function () {
        function Template(symbols, meta) {
            _classCallCheck$2(this, Template);

            this.meta = meta;
            this.block = new TemplateBlock(symbols);
        }

        Template.prototype.toJSON = function () {
            return {
                block: this.block.toJSON(),
                meta: this.meta
            };
        };

        return Template;
    }();

    var JavaScriptCompiler = function () {
        function JavaScriptCompiler(opcodes, symbols, meta) {
            _classCallCheck$2(this, JavaScriptCompiler);

            this.blocks = new _util.Stack();
            this.values = [];
            this.opcodes = opcodes;
            this.template = new Template(symbols, meta);
        }

        JavaScriptCompiler.process = function (opcodes, symbols, meta) {
            var compiler = new JavaScriptCompiler(opcodes, symbols, meta);
            return compiler.process();
        };

        JavaScriptCompiler.prototype.process = function () {
            var _this4 = this;

            this.opcodes.forEach(function (_ref) {
                var opcode = _ref[0],
                    args = _ref.slice(1);

                if (!_this4[opcode]) {
                    throw new Error("unimplemented " + opcode + " on JavaScriptCompiler");
                }
                _this4[opcode].apply(_this4, args);
            });
            return this.template;
        };
        /// Nesting


        JavaScriptCompiler.prototype.startBlock = function (_ref2) {
            var program = _ref2[0];

            var block = new InlineBlock(program['symbols']);
            this.blocks.push(block);
        };

        JavaScriptCompiler.prototype.endBlock = function () {
            var template = this.template,
                blocks = this.blocks;

            var block = blocks.pop();
            template.block.blocks.push(block.toJSON());
        };

        JavaScriptCompiler.prototype.startProgram = function () {
            this.blocks.push(this.template.block);
        };

        JavaScriptCompiler.prototype.endProgram = function () {};
        /// Statements


        JavaScriptCompiler.prototype.text = function (content) {
            this.push([_wireFormat.Ops.Text, content]);
        };

        JavaScriptCompiler.prototype.append = function (trusted) {
            this.push([_wireFormat.Ops.Append, this.popValue(), trusted]);
        };

        JavaScriptCompiler.prototype.comment = function (value) {
            this.push([_wireFormat.Ops.Comment, value]);
        };

        JavaScriptCompiler.prototype.modifier = function (name) {
            var params = this.popValue();
            var hash = this.popValue();
            this.push([_wireFormat.Ops.Modifier, name, params, hash]);
        };

        JavaScriptCompiler.prototype.block = function (name, template, inverse) {
            var params = this.popValue();
            var hash = this.popValue();
            var blocks = this.template.block.blocks;
            (0, _util.assert)(typeof template !== 'number' || blocks[template] !== null, 'missing block in the compiler');
            (0, _util.assert)(typeof inverse !== 'number' || blocks[inverse] !== null, 'missing block in the compiler');
            this.push([_wireFormat.Ops.Block, name, params, hash, blocks[template], blocks[inverse]]);
        };

        JavaScriptCompiler.prototype.openElement = function (element) {
            var tag = element.tag;
            if (tag.indexOf('-') !== -1) {
                this.startComponent(element);
            } else if (element.blockParams.length > 0) {
                throw new Error("Compile Error: <" + element.tag + "> is not a component and doesn't support block parameters");
            } else {
                this.push([_wireFormat.Ops.OpenElement, tag]);
            }
        };

        JavaScriptCompiler.prototype.flushElement = function () {
            this.push([_wireFormat.Ops.FlushElement]);
        };

        JavaScriptCompiler.prototype.closeElement = function (element) {
            var tag = element.tag,
                _endComponent,
                attrs,
                args,
                block;
            if (tag.indexOf('-') !== -1) {
                _endComponent = this.endComponent(), attrs = _endComponent[0], args = _endComponent[1], block = _endComponent[2];


                this.push([_wireFormat.Ops.Component, tag, attrs, args, block]);
            } else {
                this.push([_wireFormat.Ops.CloseElement]);
            }
        };

        JavaScriptCompiler.prototype.staticAttr = function (name, namespace) {
            var value = this.popValue();
            this.push([_wireFormat.Ops.StaticAttr, name, value, namespace]);
        };

        JavaScriptCompiler.prototype.dynamicAttr = function (name, namespace) {
            var value = this.popValue();
            this.push([_wireFormat.Ops.DynamicAttr, name, value, namespace]);
        };

        JavaScriptCompiler.prototype.trustingAttr = function (name, namespace) {
            var value = this.popValue();
            this.push([_wireFormat.Ops.TrustingAttr, name, value, namespace]);
        };

        JavaScriptCompiler.prototype.staticArg = function (name) {
            var value = this.popValue();
            this.push([_wireFormat.Ops.StaticArg, name, value]);
        };

        JavaScriptCompiler.prototype.dynamicArg = function (name) {
            var value = this.popValue();
            this.push([_wireFormat.Ops.DynamicArg, name, value]);
        };

        JavaScriptCompiler.prototype.yield = function (to) {
            var params = this.popValue();
            this.push([_wireFormat.Ops.Yield, to, params]);
        };

        JavaScriptCompiler.prototype.debugger = function (evalInfo) {
            this.push([_wireFormat.Ops.Debugger, evalInfo]);
            this.template.block.hasEval = true;
        };

        JavaScriptCompiler.prototype.hasBlock = function (name) {
            this.pushValue([_wireFormat.Ops.HasBlock, name]);
        };

        JavaScriptCompiler.prototype.hasBlockParams = function (name) {
            this.pushValue([_wireFormat.Ops.HasBlockParams, name]);
        };

        JavaScriptCompiler.prototype.partial = function (evalInfo) {
            var params = this.popValue();
            this.push([_wireFormat.Ops.Partial, params[0], evalInfo]);
            this.template.block.hasEval = true;
        };
        /// Expressions


        JavaScriptCompiler.prototype.literal = function (value) {
            if (value === undefined) {
                this.pushValue([_wireFormat.Ops.Undefined]);
            } else {
                this.pushValue(value);
            }
        };

        JavaScriptCompiler.prototype.unknown = function (name) {
            this.pushValue([_wireFormat.Ops.Unknown, name]);
        };

        JavaScriptCompiler.prototype.get = function (head, path) {
            this.pushValue([_wireFormat.Ops.Get, head, path]);
        };

        JavaScriptCompiler.prototype.maybeLocal = function (path) {
            this.pushValue([_wireFormat.Ops.MaybeLocal, path]);
        };

        JavaScriptCompiler.prototype.concat = function () {
            this.pushValue([_wireFormat.Ops.Concat, this.popValue()]);
        };

        JavaScriptCompiler.prototype.helper = function (name) {
            var params = this.popValue();
            var hash = this.popValue();
            this.pushValue([_wireFormat.Ops.Helper, name, params, hash]);
        };
        /// Stack Management Opcodes


        JavaScriptCompiler.prototype.startComponent = function (element) {
            var component = new ComponentBlock(element['symbols']);
            this.blocks.push(component);
        };

        JavaScriptCompiler.prototype.endComponent = function () {
            var component = this.blocks.pop();
            (0, _util.assert)(component instanceof ComponentBlock, "Compiler bug: endComponent() should end a component");
            return component.toJSON();
        };

        JavaScriptCompiler.prototype.prepareArray = function (size) {
            var values = [],
                i;
            for (i = 0; i < size; i++) {
                values.push(this.popValue());
            }
            this.pushValue(values);
        };

        JavaScriptCompiler.prototype.prepareObject = function (size) {
            (0, _util.assert)(this.values.length >= size, "Expected " + size + " values on the stack, found " + this.values.length);
            var keys = new Array(size),
                i;
            var values = new Array(size);
            for (i = 0; i < size; i++) {
                keys[i] = this.popValue();
                values[i] = this.popValue();
            }
            this.pushValue([keys, values]);
        };
        /// Utilities


        JavaScriptCompiler.prototype.push = function (args) {
            while (args[args.length - 1] === null) {
                args.pop();
            }
            this.currentBlock.push(args);
        };

        JavaScriptCompiler.prototype.pushValue = function (val) {
            this.values.push(val);
        };

        JavaScriptCompiler.prototype.popValue = function () {
            (0, _util.assert)(this.values.length, "No expression found on stack");
            return this.values.pop();
        };

        _createClass$2(JavaScriptCompiler, [{
            key: "currentBlock",
            get: function () {
                return this.blocks.current;
            }
        }]);

        return JavaScriptCompiler;
    }();

    var _createClass = function () {
        function defineProperties(target, props) {
            var i, descriptor;

            for (i = 0; i < props.length; i++) {
                descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
            }
        }return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
        };
    }();

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    function isTrustedValue(value) {
        return value.escaped !== undefined && !value.escaped;
    }

    var TemplateCompiler = function () {
        function TemplateCompiler(options) {
            _classCallCheck(this, TemplateCompiler);

            this.templateId = 0;
            this.templateIds = [];
            this.symbolStack = new _util.Stack();
            this.opcodes = [];
            this.includeMeta = false;
            this.options = options || {};
        }

        TemplateCompiler.compile = function (options, ast) {
            var templateVisitor = new TemplateVisitor();
            templateVisitor.visit(ast);
            var compiler = new TemplateCompiler(options);
            var opcodes = compiler.process(templateVisitor.actions);
            return JavaScriptCompiler.process(opcodes, ast['symbols'], options.meta);
        };

        TemplateCompiler.prototype.process = function (actions) {
            var _this = this;

            actions.forEach(function (_ref) {
                var name = _ref[0],
                    args = _ref.slice(1);

                if (!_this[name]) {
                    throw new Error("Unimplemented " + name + " on TemplateCompiler");
                }
                _this[name].apply(_this, args);
            });
            return this.opcodes;
        };

        TemplateCompiler.prototype.startProgram = function (program) {
            this.symbolStack.push(program[0]['symbols']);
            this.opcode('startProgram', program, program);
        };

        TemplateCompiler.prototype.endProgram = function () {
            this.symbolStack.pop();
            this.opcode('endProgram', null);
        };

        TemplateCompiler.prototype.startBlock = function (program) {
            this.symbolStack.push(program[0]['symbols']);
            this.templateId++;
            this.opcode('startBlock', program, program);
        };

        TemplateCompiler.prototype.endBlock = function () {
            this.symbolStack.pop();
            this.templateIds.push(this.templateId - 1);
            this.opcode('endBlock', null);
        };

        TemplateCompiler.prototype.text = function (_ref2) {
            var action = _ref2[0];

            this.opcode('text', action, action.chars);
        };

        TemplateCompiler.prototype.comment = function (_ref3) {
            var action = _ref3[0];

            this.opcode('comment', action, action.value);
        };

        TemplateCompiler.prototype.openElement = function (_ref4) {
            var action = _ref4[0],
                i,
                _i;

            this.opcode('openElement', action, action);
            for (i = 0; i < action.attributes.length; i++) {
                this.attribute([action.attributes[i]]);
            }
            for (_i = 0; _i < action.modifiers.length; _i++) {
                this.modifier([action.modifiers[_i]]);
            }
            this.opcode('flushElement', null);
            this.symbolStack.push(action['symbols']);
        };

        TemplateCompiler.prototype.closeElement = function (_ref5) {
            var action = _ref5[0];

            this.symbolStack.pop();
            this.opcode('closeElement', null, action);
        };

        TemplateCompiler.prototype.attribute = function (_ref6) {
            var action = _ref6[0],
                isTrusting;
            var name = action.name,
                value = action.value;

            var namespace = (0, _util.getAttrNamespace)(name);
            var isStatic = this.prepareAttributeValue(value);
            if (name.charAt(0) === '@') {
                // Arguments
                if (isStatic) {
                    this.opcode('staticArg', action, name);
                } else if (action.value.type === 'MustacheStatement') {
                    this.opcode('dynamicArg', action, name);
                } else {
                    this.opcode('dynamicArg', action, name);
                }
            } else {
                isTrusting = isTrustedValue(value);

                if (isStatic) {
                    this.opcode('staticAttr', action, name, namespace);
                } else if (isTrusting) {
                    this.opcode('trustingAttr', action, name, namespace);
                } else if (action.value.type === 'MustacheStatement') {
                    this.opcode('dynamicAttr', action, name);
                } else {
                    this.opcode('dynamicAttr', action, name, namespace);
                }
            }
        };

        TemplateCompiler.prototype.modifier = function (_ref7) {
            var action = _ref7[0];

            assertIsSimplePath(action.path, action.loc, 'modifier');
            var parts = action.path.parts;

            this.prepareHelper(action);
            this.opcode('modifier', action, parts[0]);
        };

        TemplateCompiler.prototype.mustache = function (_ref8) {
            var action = _ref8[0],
                to,
                params;
            var path = action.path;

            if ((0, _syntax.isLiteral)(path)) {
                this.mustacheExpression(action);
                this.opcode('append', action, !action.escaped);
            } else if (isYield(path)) {
                to = assertValidYield(action);

                this.yield(to, action);
            } else if (isPartial(path)) {
                params = assertValidPartial(action);

                this.partial(params, action);
            } else if (isDebugger(path)) {
                assertValidDebuggerUsage(action);
                this.debugger('debugger', action);
            } else {
                this.mustacheExpression(action);
                this.opcode('append', action, !action.escaped);
            }
        };

        TemplateCompiler.prototype.block = function (_ref9) {
            var action /*, index, count*/ = _ref9[0];

            this.prepareHelper(action);
            var templateId = this.templateIds.pop();
            var inverseId = action.inverse === null ? null : this.templateIds.pop();
            this.opcode('block', action, action.path.parts[0], templateId, inverseId);
        };
        /// Internal actions, not found in the original processed actions


        TemplateCompiler.prototype.arg = function (_ref10) {
            var path = _ref10[0];

            var _path$parts = path.parts,
                head = _path$parts[0],
                rest = _path$parts.slice(1);

            var symbol = this.symbols.allocateNamed(head);
            this.opcode('get', path, symbol, rest);
        };

        TemplateCompiler.prototype.mustacheExpression = function (expr) {
            var path = expr.path,
                _path$parts2,
                head,
                parts;

            if ((0, _syntax.isLiteral)(path)) {
                this.opcode('literal', expr, path.value);
            } else if (isBuiltInHelper(path)) {
                this.builtInHelper(expr);
            } else if (isArg(path)) {
                this.arg([path]);
            } else if (isHelperInvocation(expr)) {
                this.prepareHelper(expr);
                this.opcode('helper', expr, path.parts[0]);
            } else if (path.this) {
                this.opcode('get', expr, 0, path.parts);
            } else if (isLocal(path, this.symbols)) {
                _path$parts2 = path.parts, head = _path$parts2[0], parts = _path$parts2.slice(1);


                this.opcode('get', expr, this.symbols.get(head), parts);
            } else if (isSimplePath(path)) {
                this.opcode('unknown', expr, path.parts[0]);
            } else {
                this.opcode('maybeLocal', expr, path.parts);
            }
        };
        /// Internal Syntax


        TemplateCompiler.prototype.yield = function (to, action) {
            this.prepareParams(action.params);
            this.opcode('yield', action, this.symbols.allocateBlock(to));
        };

        TemplateCompiler.prototype.debugger = function (_name, action) {
            this.opcode('debugger', action, this.symbols.getEvalInfo());
        };

        TemplateCompiler.prototype.hasBlock = function (name, action) {
            this.opcode('hasBlock', action, this.symbols.allocateBlock(name));
        };

        TemplateCompiler.prototype.hasBlockParams = function (name, action) {
            this.opcode('hasBlockParams', action, this.symbols.allocateBlock(name));
        };

        TemplateCompiler.prototype.partial = function (_params, action) {
            this.prepareParams(action.params);
            this.opcode('partial', action, this.symbols.getEvalInfo());
        };

        TemplateCompiler.prototype.builtInHelper = function (expr) {
            var path = expr.path,
                name,
                _name2;

            if (isHasBlock(path)) {
                name = assertValidHasBlockUsage(expr.path.original, expr);

                this.hasBlock(name, expr);
            } else if (isHasBlockParams(path)) {
                _name2 = assertValidHasBlockUsage(expr.path.original, expr);

                this.hasBlockParams(_name2, expr);
            }
        };
        /// Expressions, invoked recursively from prepareParams and prepareHash


        TemplateCompiler.prototype.SubExpression = function (expr) {
            if (isBuiltInHelper(expr.path)) {
                this.builtInHelper(expr);
            } else {
                this.prepareHelper(expr);
                this.opcode('helper', expr, expr.path.parts[0]);
            }
        };

        TemplateCompiler.prototype.PathExpression = function (expr) {
            var symbols, _expr$parts, head;

            if (expr.data) {
                this.arg([expr]);
            } else {
                symbols = this.symbols;
                _expr$parts = expr.parts, head = _expr$parts[0];


                if (expr.this) {
                    this.opcode('get', expr, 0, expr.parts);
                } else if (symbols.has(head)) {
                    this.opcode('get', expr, symbols.get(head), expr.parts.slice(1));
                } else {
                    this.opcode('maybeLocal', expr, expr.parts);
                }
            }
        };

        TemplateCompiler.prototype.StringLiteral = function (action) {
            this.opcode('literal', null, action.value);
        };

        TemplateCompiler.prototype.BooleanLiteral = function (action) {
            this.opcode('literal', null, action.value);
        };

        TemplateCompiler.prototype.NumberLiteral = function (action) {
            this.opcode('literal', null, action.value);
        };

        TemplateCompiler.prototype.NullLiteral = function (action) {
            this.opcode('literal', null, action.value);
        };

        TemplateCompiler.prototype.UndefinedLiteral = function (action) {
            this.opcode('literal', null, action.value);
        };
        /// Utilities


        TemplateCompiler.prototype.opcode = function (name, action) {
            for (_len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
                args[_key - 2] = arguments[_key];
            }

            var opcode = [name].concat(args),
                _len,
                args,
                _key;
            if (this.includeMeta && action) {
                opcode.push(this.meta(action));
            }
            this.opcodes.push(opcode);
        };

        TemplateCompiler.prototype.prepareHelper = function (expr) {
            assertIsSimplePath(expr.path, expr.loc, 'helper');
            var params = expr.params,
                hash = expr.hash;

            this.prepareHash(hash);
            this.prepareParams(params);
        };

        TemplateCompiler.prototype.prepareParams = function (params) {
            var i, param;

            if (!params.length) {
                this.opcode('literal', null, null);
                return;
            }
            for (i = params.length - 1; i >= 0; i--) {
                param = params[i];

                (0, _util.assert)(this[param.type], "Unimplemented " + param.type + " on TemplateCompiler");
                this[param.type](param);
            }
            this.opcode('prepareArray', null, params.length);
        };

        TemplateCompiler.prototype.prepareHash = function (hash) {
            var pairs = hash.pairs,
                i,
                _pairs$i,
                key,
                value;
            if (!pairs.length) {
                this.opcode('literal', null, null);
                return;
            }
            for (i = pairs.length - 1; i >= 0; i--) {
                _pairs$i = pairs[i], key = _pairs$i.key, value = _pairs$i.value;


                (0, _util.assert)(this[value.type], "Unimplemented " + value.type + " on TemplateCompiler");
                this[value.type](value);
                this.opcode('literal', null, key);
            }
            this.opcode('prepareObject', null, pairs.length);
        };

        TemplateCompiler.prototype.prepareAttributeValue = function (value) {
            // returns the static value if the value is static
            switch (value.type) {
                case 'TextNode':
                    this.opcode('literal', value, value.chars);
                    return true;
                case 'MustacheStatement':
                    this.attributeMustache([value]);
                    return false;
                case 'ConcatStatement':
                    this.prepareConcatParts(value.parts);
                    this.opcode('concat', value);
                    return false;
            }
        };

        TemplateCompiler.prototype.prepareConcatParts = function (parts) {
            var i, part;

            for (i = parts.length - 1; i >= 0; i--) {
                part = parts[i];

                if (part.type === 'MustacheStatement') {
                    this.attributeMustache([part]);
                } else if (part.type === 'TextNode') {
                    this.opcode('literal', null, part.chars);
                }
            }
            this.opcode('prepareArray', null, parts.length);
        };

        TemplateCompiler.prototype.attributeMustache = function (_ref11) {
            var action = _ref11[0];

            this.mustacheExpression(action);
        };

        TemplateCompiler.prototype.meta = function (node) {
            var loc = node.loc;
            if (!loc) {
                return [];
            }
            var source = loc.source,
                start = loc.start,
                end = loc.end;

            return ['loc', [source || null, [start.line, start.column], [end.line, end.column]]];
        };

        _createClass(TemplateCompiler, [{
            key: "symbols",
            get: function () {
                return this.symbolStack.current;
            }
        }]);

        return TemplateCompiler;
    }();

    function isHelperInvocation(mustache) {
        return mustache.params && mustache.params.length > 0 || mustache.hash && mustache.hash.pairs.length > 0;
    }
    function isSimplePath(_ref12) {
        var parts = _ref12.parts;

        return parts.length === 1;
    }
    function isLocal(_ref13, symbols) {
        var parts = _ref13.parts;

        return symbols && symbols.has(parts[0]);
    }
    function isYield(path) {
        return path.original === 'yield';
    }
    function isPartial(path) {
        return path.original === 'partial';
    }
    function isDebugger(path) {
        return path.original === 'debugger';
    }
    function isHasBlock(path) {
        return path.original === 'has-block';
    }
    function isHasBlockParams(path) {
        return path.original === 'has-block-params';
    }
    function isBuiltInHelper(path) {
        return isHasBlock(path) || isHasBlockParams(path);
    }
    function isArg(path) {
        return !!path['data'];
    }
    function assertIsSimplePath(path, loc, context) {
        if (!isSimplePath(path)) {
            throw new _syntax.SyntaxError("`" + path.original + "` is not a valid name for a " + context + " on line " + loc.start.line + ".", path.loc);
        }
    }
    function assertValidYield(statement) {
        var pairs = statement.hash.pairs;

        if (pairs.length === 1 && pairs[0].key !== 'to' || pairs.length > 1) {
            throw new _syntax.SyntaxError("yield only takes a single named argument: 'to'", statement.loc);
        } else if (pairs.length === 1 && pairs[0].value.type !== 'StringLiteral') {
            throw new _syntax.SyntaxError("you can only yield to a literal value", statement.loc);
        } else if (pairs.length === 0) {
            return 'default';
        } else {
            return pairs[0].value.value;
        }
    }
    function assertValidPartial(statement) {
        var params = statement.params,
            hash = statement.hash,
            escaped = statement.escaped,
            loc = statement.loc;

        if (params && params.length !== 1) {
            throw new _syntax.SyntaxError("Partial found with no arguments. You must specify a template name. (on line " + loc.start.line + ")", statement.loc);
        } else if (hash && hash.pairs.length > 0) {
            throw new _syntax.SyntaxError("partial does not take any named arguments (on line " + loc.start.line + ")", statement.loc);
        } else if (!escaped) {
            throw new _syntax.SyntaxError("{{{partial ...}}} is not supported, please use {{partial ...}} instead (on line " + loc.start.line + ")", statement.loc);
        }
        return params;
    }
    function assertValidHasBlockUsage(type, call) {
        var params = call.params,
            hash = call.hash,
            loc = call.loc,
            param;

        if (hash && hash.pairs.length > 0) {
            throw new _syntax.SyntaxError(type + " does not take any named arguments", call.loc);
        }
        if (params.length === 0) {
            return 'default';
        } else if (params.length === 1) {
            param = params[0];

            if (param.type === 'StringLiteral') {
                return param.value;
            } else {
                throw new _syntax.SyntaxError("you can only yield to a literal value (on line " + loc.start.line + ")", call.loc);
            }
        } else {
            throw new _syntax.SyntaxError(type + " only takes a single positional argument (on line " + loc.start.line + ")", call.loc);
        }
    }
    function assertValidDebuggerUsage(statement) {
        var params = statement.params,
            hash = statement.hash;

        if (hash && hash.pairs.length > 0) {
            throw new _syntax.SyntaxError("debugger does not take any named arguments", statement.loc);
        }
        if (params.length === 0) {
            return 'default';
        } else {
            throw new _syntax.SyntaxError("debugger does not take any positional arguments", statement.loc);
        }
    }

    var defaultId = function () {
        var crypto, idFn;

        if (typeof _nodeModule.require === 'function') {
            try {
                /* tslint:disable:no-require-imports */
                crypto = (0, _nodeModule.require)('crypto');
                /* tslint:enable:no-require-imports */

                idFn = function (src) {
                    var hash = crypto.createHash('sha1');
                    hash.update(src, 'utf8');
                    // trim to 6 bytes of data (2^48 - 1)
                    return hash.digest('base64').substring(0, 8);
                };

                idFn("test");
                return idFn;
            } catch (e) {}
        }
        return function () {
            return null;
        };
    }();
    var defaultOptions = {
        id: defaultId,
        meta: {}
    };


    exports.precompile = function (string) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : defaultOptions;

        var ast = (0, _syntax.preprocess)(string, options);

        var _TemplateCompiler$com = TemplateCompiler.compile(options, ast),
            block = _TemplateCompiler$com.block,
            meta = _TemplateCompiler$com.meta;

        var idFn = options.id || defaultId;
        var blockJSON = JSON.stringify(block.toJSON());
        var templateJSONObject = {
            id: idFn(JSON.stringify(meta) + blockJSON),
            block: blockJSON,
            meta: meta
        };
        // JSON is javascript
        return JSON.stringify(templateJSONObject);
    };
    exports.TemplateVisitor = TemplateVisitor;
});
enifed("@glimmer/reference", ["exports", "@glimmer/util"], function (exports, _util) {
    "use strict";

    exports.isModified = exports.ReferenceCache = exports.map = exports.CachedReference = exports.UpdatableTag = exports.CachedTag = exports.combine = exports.combineSlice = exports.combineTagged = exports.DirtyableTag = exports.CURRENT_TAG = exports.VOLATILE_TAG = exports.CONSTANT_TAG = exports.TagWrapper = exports.RevisionTag = exports.VOLATILE = exports.INITIAL = exports.CONSTANT = exports.IteratorSynchronizer = exports.ReferenceIterator = exports.IterationArtifacts = exports.referenceFromParts = exports.ListItem = exports.isConst = exports.ConstReference = undefined;

    function _defaults(obj, defaults) {
        var keys = Object.getOwnPropertyNames(defaults),
            i,
            key,
            value;for (i = 0; i < keys.length; i++) {
            key = keys[i];
            value = Object.getOwnPropertyDescriptor(defaults, key);
            if (value && value.configurable && obj[key] === undefined) {
                Object.defineProperty(obj, key, value);
            }
        }return obj;
    }

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults(subClass, superClass);
    }

    function _classCallCheck$1(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var CONSTANT = 0;
    var INITIAL = 1;
    var VOLATILE = NaN;
    var RevisionTag = function () {
        function RevisionTag() {
            _classCallCheck$1(this, RevisionTag);
        }

        RevisionTag.prototype.validate = function (snapshot) {
            return this.value() === snapshot;
        };

        return RevisionTag;
    }();
    RevisionTag.id = 0;
    var VALUE = [];
    var VALIDATE = [];
    var TagWrapper = function () {
        function TagWrapper(type, inner) {
            _classCallCheck$1(this, TagWrapper);

            this.type = type;
            this.inner = inner;
        }

        TagWrapper.prototype.value = function () {
            var func = VALUE[this.type];
            return func(this.inner);
        };

        TagWrapper.prototype.validate = function (snapshot) {
            var func = VALIDATE[this.type];
            return func(this.inner, snapshot);
        };

        return TagWrapper;
    }();
    function register(Type) {
        var type = VALUE.length;
        VALUE.push(function (tag) {
            return tag.value();
        });
        VALIDATE.push(function (tag, snapshot) {
            return tag.validate(snapshot);
        });
        Type.id = type;
    }
    ///
    // CONSTANT: 0
    VALUE.push(function () {
        return CONSTANT;
    });
    VALIDATE.push(function (_tag, snapshot) {
        return snapshot === CONSTANT;
    });
    var CONSTANT_TAG = new TagWrapper(0, null);
    // VOLATILE: 1
    VALUE.push(function () {
        return VOLATILE;
    });
    VALIDATE.push(function (_tag, snapshot) {
        return snapshot === VOLATILE;
    });
    var VOLATILE_TAG = new TagWrapper(1, null);
    // CURRENT: 2
    VALUE.push(function () {
        return $REVISION;
    });
    VALIDATE.push(function (_tag, snapshot) {
        return snapshot === $REVISION;
    });
    var CURRENT_TAG = new TagWrapper(2, null);
    ///
    var $REVISION = INITIAL;
    var DirtyableTag = function (_RevisionTag) {
        _inherits(DirtyableTag, _RevisionTag);

        DirtyableTag.create = function () {
            var revision = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : $REVISION;

            return new TagWrapper(this.id, new DirtyableTag(revision));
        };

        function DirtyableTag() {
            var revision = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : $REVISION;

            _classCallCheck$1(this, DirtyableTag);

            var _this = _possibleConstructorReturn(this, _RevisionTag.call(this));

            _this.revision = revision;
            return _this;
        }

        DirtyableTag.prototype.value = function () {
            return this.revision;
        };

        DirtyableTag.prototype.dirty = function () {
            this.revision = ++$REVISION;
        };

        return DirtyableTag;
    }(RevisionTag);
    register(DirtyableTag);

    function _combine(tags) {
        switch (tags.length) {
            case 0:
                return CONSTANT_TAG;
            case 1:
                return tags[0];
            case 2:
                return TagsPair.create(tags[0], tags[1]);
            default:
                return TagsCombinator.create(tags);
        }
    }
    var CachedTag = function (_RevisionTag2) {
        _inherits(CachedTag, _RevisionTag2);

        function CachedTag() {
            _classCallCheck$1(this, CachedTag);

            var _this2 = _possibleConstructorReturn(this, _RevisionTag2.apply(this, arguments));

            _this2.lastChecked = null;
            _this2.lastValue = null;
            return _this2;
        }

        CachedTag.prototype.value = function () {
            var lastChecked = this.lastChecked,
                lastValue = this.lastValue;

            if (lastChecked !== $REVISION) {
                this.lastChecked = $REVISION;
                this.lastValue = lastValue = this.compute();
            }
            return this.lastValue;
        };

        CachedTag.prototype.invalidate = function () {
            this.lastChecked = null;
        };

        return CachedTag;
    }(RevisionTag);

    var TagsPair = function (_CachedTag) {
        _inherits(TagsPair, _CachedTag);

        TagsPair.create = function (first, second) {
            return new TagWrapper(this.id, new TagsPair(first, second));
        };

        function TagsPair(first, second) {
            _classCallCheck$1(this, TagsPair);

            var _this3 = _possibleConstructorReturn(this, _CachedTag.call(this));

            _this3.first = first;
            _this3.second = second;
            return _this3;
        }

        TagsPair.prototype.compute = function () {
            return Math.max(this.first.value(), this.second.value());
        };

        return TagsPair;
    }(CachedTag);

    register(TagsPair);

    var TagsCombinator = function (_CachedTag2) {
        _inherits(TagsCombinator, _CachedTag2);

        TagsCombinator.create = function (tags) {
            return new TagWrapper(this.id, new TagsCombinator(tags));
        };

        function TagsCombinator(tags) {
            _classCallCheck$1(this, TagsCombinator);

            var _this4 = _possibleConstructorReturn(this, _CachedTag2.call(this));

            _this4.tags = tags;
            return _this4;
        }

        TagsCombinator.prototype.compute = function () {
            var tags = this.tags,
                i,
                value;

            var max = -1;
            for (i = 0; i < tags.length; i++) {
                value = tags[i].value();

                max = Math.max(value, max);
            }
            return max;
        };

        return TagsCombinator;
    }(CachedTag);

    register(TagsCombinator);
    var UpdatableTag = function (_CachedTag3) {
        _inherits(UpdatableTag, _CachedTag3);

        UpdatableTag.create = function (tag) {
            return new TagWrapper(this.id, new UpdatableTag(tag));
        };

        function UpdatableTag(tag) {
            _classCallCheck$1(this, UpdatableTag);

            var _this5 = _possibleConstructorReturn(this, _CachedTag3.call(this));

            _this5.tag = tag;
            _this5.lastUpdated = INITIAL;
            return _this5;
        }

        UpdatableTag.prototype.compute = function () {
            return Math.max(this.lastUpdated, this.tag.value());
        };

        UpdatableTag.prototype.update = function (tag) {
            if (tag !== this.tag) {
                this.tag = tag;
                this.lastUpdated = $REVISION;
                this.invalidate();
            }
        };

        return UpdatableTag;
    }(CachedTag);
    register(UpdatableTag);
    var CachedReference = function () {
        function CachedReference() {
            _classCallCheck$1(this, CachedReference);

            this.lastRevision = null;
            this.lastValue = null;
        }

        CachedReference.prototype.value = function () {
            var tag = this.tag,
                lastRevision = this.lastRevision,
                lastValue = this.lastValue;

            if (!lastRevision || !tag.validate(lastRevision)) {
                lastValue = this.lastValue = this.compute();
                this.lastRevision = tag.value();
            }
            return lastValue;
        };

        CachedReference.prototype.invalidate = function () {
            this.lastRevision = null;
        };

        return CachedReference;
    }();

    var MapperReference = function (_CachedReference) {
        _inherits(MapperReference, _CachedReference);

        function MapperReference(reference, mapper) {
            _classCallCheck$1(this, MapperReference);

            var _this6 = _possibleConstructorReturn(this, _CachedReference.call(this));

            _this6.tag = reference.tag;
            _this6.reference = reference;
            _this6.mapper = mapper;
            return _this6;
        }

        MapperReference.prototype.compute = function () {
            var reference = this.reference,
                mapper = this.mapper;

            return mapper(reference.value());
        };

        return MapperReference;
    }(CachedReference);

    //////////
    var ReferenceCache = function () {
        function ReferenceCache(reference) {
            _classCallCheck$1(this, ReferenceCache);

            this.lastValue = null;
            this.lastRevision = null;
            this.initialized = false;
            this.tag = reference.tag;
            this.reference = reference;
        }

        ReferenceCache.prototype.peek = function () {
            if (!this.initialized) {
                return this.initialize();
            }
            return this.lastValue;
        };

        ReferenceCache.prototype.revalidate = function () {
            if (!this.initialized) {
                return this.initialize();
            }
            var reference = this.reference,
                lastRevision = this.lastRevision;

            var tag = reference.tag;
            if (tag.validate(lastRevision)) return NOT_MODIFIED;
            this.lastRevision = tag.value();
            var lastValue = this.lastValue;

            var value = reference.value();
            if (value === lastValue) return NOT_MODIFIED;
            this.lastValue = value;
            return value;
        };

        ReferenceCache.prototype.initialize = function () {
            var reference = this.reference;

            var value = this.lastValue = reference.value();
            this.lastRevision = reference.tag.value();
            this.initialized = true;
            return value;
        };

        return ReferenceCache;
    }();
    var NOT_MODIFIED = "adb3b78e-3d22-4e4b-877a-6317c2c5c145";


    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var ConstReference = function () {
        function ConstReference(inner) {
            _classCallCheck(this, ConstReference);

            this.inner = inner;
            this.tag = CONSTANT_TAG;
        }

        ConstReference.prototype.value = function () {
            return this.inner;
        };

        return ConstReference;
    }();


    function _defaults$1(obj, defaults) {
        var keys = Object.getOwnPropertyNames(defaults),
            i,
            key,
            value;for (i = 0; i < keys.length; i++) {
            key = keys[i];
            value = Object.getOwnPropertyDescriptor(defaults, key);
            if (value && value.configurable && obj[key] === undefined) {
                Object.defineProperty(obj, key, value);
            }
        }return obj;
    }

    function _classCallCheck$2(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    function _possibleConstructorReturn$1(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits$1(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults$1(subClass, superClass);
    }

    var ListItem = function (_ListNode) {
        _inherits$1(ListItem, _ListNode);

        function ListItem(iterable, result) {
            _classCallCheck$2(this, ListItem);

            var _this = _possibleConstructorReturn$1(this, _ListNode.call(this, iterable.valueReferenceFor(result)));

            _this.retained = false;
            _this.seen = false;
            _this.key = result.key;
            _this.iterable = iterable;
            _this.memo = iterable.memoReferenceFor(result);
            return _this;
        }

        ListItem.prototype.update = function (item) {
            this.retained = true;
            this.iterable.updateValueReference(this.value, item);
            this.iterable.updateMemoReference(this.memo, item);
        };

        ListItem.prototype.shouldRemove = function () {
            return !this.retained;
        };

        ListItem.prototype.reset = function () {
            this.retained = false;
            this.seen = false;
        };

        return ListItem;
    }(_util.ListNode);
    var IterationArtifacts = function () {
        function IterationArtifacts(iterable) {
            _classCallCheck$2(this, IterationArtifacts);

            this.map = (0, _util.dict)();
            this.list = new _util.LinkedList();
            this.tag = iterable.tag;
            this.iterable = iterable;
        }

        IterationArtifacts.prototype.isEmpty = function () {
            var iterator = this.iterator = this.iterable.iterate();
            return iterator.isEmpty();
        };

        IterationArtifacts.prototype.iterate = function () {
            var iterator = this.iterator || this.iterable.iterate();
            this.iterator = null;
            return iterator;
        };

        IterationArtifacts.prototype.has = function (key) {
            return !!this.map[key];
        };

        IterationArtifacts.prototype.get = function (key) {
            return this.map[key];
        };

        IterationArtifacts.prototype.wasSeen = function (key) {
            var node = this.map[key];
            return node && node.seen;
        };

        IterationArtifacts.prototype.append = function (item) {
            var map = this.map,
                list = this.list,
                iterable = this.iterable;

            var node = map[item.key] = new ListItem(iterable, item);
            list.append(node);
            return node;
        };

        IterationArtifacts.prototype.insertBefore = function (item, reference) {
            var map = this.map,
                list = this.list,
                iterable = this.iterable;

            var node = map[item.key] = new ListItem(iterable, item);
            node.retained = true;
            list.insertBefore(node, reference);
            return node;
        };

        IterationArtifacts.prototype.move = function (item, reference) {
            var list = this.list;

            item.retained = true;
            list.remove(item);
            list.insertBefore(item, reference);
        };

        IterationArtifacts.prototype.remove = function (item) {
            var list = this.list;

            list.remove(item);
            delete this.map[item.key];
        };

        IterationArtifacts.prototype.nextNode = function (item) {
            return this.list.nextNode(item);
        };

        IterationArtifacts.prototype.head = function () {
            return this.list.head();
        };

        return IterationArtifacts;
    }();
    var ReferenceIterator = function () {
        // if anyone needs to construct this object with something other than
        // an iterable, let @wycats know.
        function ReferenceIterator(iterable) {
            _classCallCheck$2(this, ReferenceIterator);

            this.iterator = null;
            var artifacts = new IterationArtifacts(iterable);
            this.artifacts = artifacts;
        }

        ReferenceIterator.prototype.next = function () {
            var artifacts = this.artifacts;

            var iterator = this.iterator = this.iterator || artifacts.iterate();
            var item = iterator.next();
            if (!item) return null;
            return artifacts.append(item);
        };

        return ReferenceIterator;
    }();
    var Phase;
    (function (Phase) {
        Phase[Phase["Append"] = 0] = "Append";
        Phase[Phase["Prune"] = 1] = "Prune";
        Phase[Phase["Done"] = 2] = "Done";
    })(Phase || (Phase = {}));
    var IteratorSynchronizer = function () {
        function IteratorSynchronizer(_ref) {
            var target = _ref.target,
                artifacts = _ref.artifacts;

            _classCallCheck$2(this, IteratorSynchronizer);

            this.target = target;
            this.artifacts = artifacts;
            this.iterator = artifacts.iterate();
            this.current = artifacts.head();
        }

        IteratorSynchronizer.prototype.sync = function () {
            var phase = Phase.Append;
            while (true) {
                switch (phase) {
                    case Phase.Append:
                        phase = this.nextAppend();
                        break;
                    case Phase.Prune:
                        phase = this.nextPrune();
                        break;
                    case Phase.Done:
                        this.nextDone();
                        return;
                }
            }
        };

        IteratorSynchronizer.prototype.advanceToKey = function (key) {
            var current = this.current,
                artifacts = this.artifacts;

            var seek = current;
            while (seek && seek.key !== key) {
                seek.seen = true;
                seek = artifacts.nextNode(seek);
            }
            this.current = seek && artifacts.nextNode(seek);
        };

        IteratorSynchronizer.prototype.nextAppend = function () {
            var iterator = this.iterator,
                current = this.current,
                artifacts = this.artifacts;

            var item = iterator.next();
            if (item === null) {
                return this.startPrune();
            }
            var key = item.key;

            if (current && current.key === key) {
                this.nextRetain(item);
            } else if (artifacts.has(key)) {
                this.nextMove(item);
            } else {
                this.nextInsert(item);
            }
            return Phase.Append;
        };

        IteratorSynchronizer.prototype.nextRetain = function (item) {
            var artifacts = this.artifacts,
                current = this.current;

            current = current;
            current.update(item);
            this.current = artifacts.nextNode(current);
            this.target.retain(item.key, current.value, current.memo);
        };

        IteratorSynchronizer.prototype.nextMove = function (item) {
            var current = this.current,
                artifacts = this.artifacts,
                target = this.target;
            var key = item.key;

            var found = artifacts.get(item.key);
            found.update(item);
            if (artifacts.wasSeen(item.key)) {
                artifacts.move(found, current);
                target.move(found.key, found.value, found.memo, current ? current.key : null);
            } else {
                this.advanceToKey(key);
            }
        };

        IteratorSynchronizer.prototype.nextInsert = function (item) {
            var artifacts = this.artifacts,
                target = this.target,
                current = this.current;

            var node = artifacts.insertBefore(item, current);
            target.insert(node.key, node.value, node.memo, current ? current.key : null);
        };

        IteratorSynchronizer.prototype.startPrune = function () {
            this.current = this.artifacts.head();
            return Phase.Prune;
        };

        IteratorSynchronizer.prototype.nextPrune = function () {
            var artifacts = this.artifacts,
                target = this.target,
                current = this.current;

            if (current === null) {
                return Phase.Done;
            }
            var node = current;
            this.current = artifacts.nextNode(node);
            if (node.shouldRemove()) {
                artifacts.remove(node);
                target.delete(node.key);
            } else {
                node.reset();
            }
            return Phase.Prune;
        };

        IteratorSynchronizer.prototype.nextDone = function () {
            this.target.done();
        };

        return IteratorSynchronizer;
    }();

    exports.ConstReference = ConstReference;
    exports.isConst = function (reference) {
        return reference.tag === CONSTANT_TAG;
    };
    exports.ListItem = ListItem;
    exports.referenceFromParts = function (root, parts) {
        var reference = root,
            i;
        for (i = 0; i < parts.length; i++) {
            reference = reference.get(parts[i]);
        }
        return reference;
    };
    exports.IterationArtifacts = IterationArtifacts;
    exports.ReferenceIterator = ReferenceIterator;
    exports.IteratorSynchronizer = IteratorSynchronizer;
    exports.CONSTANT = CONSTANT;
    exports.INITIAL = INITIAL;
    exports.VOLATILE = VOLATILE;
    exports.RevisionTag = RevisionTag;
    exports.TagWrapper = TagWrapper;
    exports.CONSTANT_TAG = CONSTANT_TAG;
    exports.VOLATILE_TAG = VOLATILE_TAG;
    exports.CURRENT_TAG = CURRENT_TAG;
    exports.DirtyableTag = DirtyableTag;
    exports.combineTagged = function (tagged) {
        var optimized = [],
            i,
            l,
            tag;
        for (i = 0, l = tagged.length; i < l; i++) {
            tag = tagged[i].tag;

            if (tag === VOLATILE_TAG) return VOLATILE_TAG;
            if (tag === CONSTANT_TAG) continue;
            optimized.push(tag);
        }
        return _combine(optimized);
    };
    exports.combineSlice = function (slice) {
        var optimized = [],
            tag;
        var node = slice.head();
        while (node !== null) {
            tag = node.tag;

            if (tag === VOLATILE_TAG) return VOLATILE_TAG;
            if (tag !== CONSTANT_TAG) optimized.push(tag);
            node = slice.nextNode(node);
        }
        return _combine(optimized);
    };
    exports.combine = function (tags) {
        var optimized = [],
            i,
            l,
            tag;
        for (i = 0, l = tags.length; i < l; i++) {
            tag = tags[i];

            if (tag === VOLATILE_TAG) return VOLATILE_TAG;
            if (tag === CONSTANT_TAG) continue;
            optimized.push(tag);
        }
        return _combine(optimized);
    };
    exports.CachedTag = CachedTag;
    exports.UpdatableTag = UpdatableTag;
    exports.CachedReference = CachedReference;
    exports.map = function (reference, mapper) {
        return new MapperReference(reference, mapper);
    };
    exports.ReferenceCache = ReferenceCache;
    exports.isModified = function (value) {
        return value !== NOT_MODIFIED;
    };
});
enifed('@glimmer/syntax', ['exports', 'simple-html-tokenizer', '@glimmer/util', 'handlebars'], function (exports, _simpleHtmlTokenizer, _util, _handlebars) {
    'use strict';

    exports.printLiteral = exports.isLiteral = exports.SyntaxError = exports.print = exports.Walker = exports.traverse = exports.builders = exports.preprocess = exports.AST = undefined;

    function isLiteral(input) {
        return !!(typeof input === 'object' && input.type.match(/Literal$/));
    }

    var nodes = Object.freeze({
        isCall: function (node) {
            return node.type === 'SubExpression' || node.type === 'MustacheStatement' && node.path.type === 'PathExpression';
        },
        isLiteral: isLiteral
    });
    // Expressions

    function buildPath(original, loc) {
        if (typeof original !== 'string') return original;
        var parts = original.split('.');
        var thisHead = false;
        if (parts[0] === 'this') {
            thisHead = true;
            parts = parts.slice(1);
        }
        return {
            type: "PathExpression",
            original: original,
            this: thisHead,
            parts: parts,
            data: false,
            loc: buildLoc(loc || null)
        };
    }
    function buildLiteral(type, value, loc) {
        return {
            type: type,
            value: value,
            original: value,
            loc: buildLoc(loc || null)
        };
    }
    // Miscellaneous
    function buildHash(pairs, loc) {
        return {
            type: "Hash",
            pairs: pairs || [],
            loc: buildLoc(loc || null)
        };
    }

    function buildSource(source) {
        return source || null;
    }
    function buildPosition(line, column) {
        return {
            line: line,
            column: column
        };
    }
    var SYNTHETIC = { source: '(synthetic)', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } };
    function buildLoc() {
        var _len, args, _key, loc, startLine, startColumn, endLine, endColumn, source;

        for (_len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
        }

        if (args.length === 1) {
            loc = args[0];

            if (loc && typeof loc === 'object') {
                return {
                    source: buildSource(loc.source),
                    start: buildPosition(loc.start.line, loc.start.column),
                    end: buildPosition(loc.end.line, loc.end.column)
                };
            } else {
                return SYNTHETIC;
            }
        } else {
            startLine = args[0], startColumn = args[1], endLine = args[2], endColumn = args[3], source = args[4];


            return {
                source: buildSource(source),
                start: buildPosition(startLine, startColumn),
                end: buildPosition(endLine, endColumn)
            };
        }
    }
    var b = {
        mustache: function (path, params, hash, raw, loc) {
            if (!isLiteral(path)) {
                path = buildPath(path);
            }
            return {
                type: "MustacheStatement",
                path: path,
                params: params || [],
                hash: hash || buildHash([]),
                escaped: !raw,
                loc: buildLoc(loc || null)
            };
        },
        block: function (path, params, hash, program, inverse, loc) {
            return {
                type: "BlockStatement",
                path: buildPath(path),
                params: params || [],
                hash: hash || buildHash([]),
                program: program || null,
                inverse: inverse || null,
                loc: buildLoc(loc || null)
            };
        },
        partial: function (name, params, hash, indent, loc) {
            return {
                type: "PartialStatement",
                name: name,
                params: params || [],
                hash: hash || buildHash([]),
                indent: indent || '',
                strip: { open: false, close: false },
                loc: buildLoc(loc || null)
            };
        },
        comment: function (value, loc) {
            return {
                type: "CommentStatement",
                value: value,
                loc: buildLoc(loc || null)
            };
        },
        mustacheComment: function (value, loc) {
            return {
                type: "MustacheCommentStatement",
                value: value,
                loc: buildLoc(loc || null)
            };
        },
        element: function (tag, attributes, modifiers, children, comments, loc) {
            // this is used for backwards compat prior to `comments` being added to the AST
            if (!Array.isArray(comments)) {
                loc = comments;
                comments = [];
            }
            return {
                type: "ElementNode",
                tag: tag || "",
                attributes: attributes || [],
                blockParams: [],
                modifiers: modifiers || [],
                comments: comments || [],
                children: children || [],
                loc: buildLoc(loc || null)
            };
        },
        elementModifier: function (path, params, hash, loc) {
            return {
                type: "ElementModifierStatement",
                path: buildPath(path),
                params: params || [],
                hash: hash || buildHash([]),
                loc: buildLoc(loc || null)
            };
        },
        attr: function (name, value, loc) {
            return {
                type: "AttrNode",
                name: name,
                value: value,
                loc: buildLoc(loc || null)
            };
        },
        text: function (chars, loc) {
            return {
                type: "TextNode",
                chars: chars || "",
                loc: buildLoc(loc || null)
            };
        },
        sexpr: function (path, params, hash, loc) {
            return {
                type: "SubExpression",
                path: buildPath(path),
                params: params || [],
                hash: hash || buildHash([]),
                loc: buildLoc(loc || null)
            };
        },
        path: buildPath,
        concat: function (parts, loc) {
            return {
                type: "ConcatStatement",
                parts: parts || [],
                loc: buildLoc(loc || null)
            };
        },
        hash: buildHash,
        pair: function (key, value, loc) {
            return {
                type: "HashPair",
                key: key,
                value: value,
                loc: buildLoc(loc || null)
            };
        },
        literal: buildLiteral,
        program: function (body, blockParams, loc) {
            return {
                type: "Program",
                body: body || [],
                blockParams: blockParams || [],
                loc: buildLoc(loc || null)
            };
        },
        loc: buildLoc,
        pos: buildPosition,
        string: literal('StringLiteral'),
        boolean: literal('BooleanLiteral'),
        number: literal('NumberLiteral'),
        undefined: function () {
            return buildLiteral('UndefinedLiteral', undefined);
        },
        null: function () {
            return buildLiteral('NullLiteral', null);
        }
    };
    function literal(type) {
        return function (value) {
            return buildLiteral(type, value);
        };
    }

    /**
     * Subclass of `Error` with additional information
     * about location of incorrect markup.
     */
    var SyntaxError = function () {
        SyntaxError.prototype = Object.create(Error.prototype);
        SyntaxError.prototype.constructor = SyntaxError;
        function SyntaxError(message, location) {
            var error = Error.call(this, message);
            this.message = message;
            this.stack = error.stack;
            this.location = location;
        }
        return SyntaxError;
    }();

    // Regex to validate the identifier for block parameters.
    // Based on the ID validation regex in Handlebars.
    var ID_INVERSE_PATTERN = /[!"#%-,\.\/;->@\[-\^`\{-~]/;
    // Checks the element's attributes to see if it uses block params.
    // If it does, registers the block params with the program and
    // removes the corresponding attributes from the element.
    function parseElementBlockParams(element) {
        var params = parseBlockParams(element);
        if (params) element.blockParams = params;
    }
    function parseBlockParams(element) {
        var l = element.attributes.length,
            i,
            paramsString,
            params,
            _i,
            param;
        var attrNames = [];
        for (i = 0; i < l; i++) {
            attrNames.push(element.attributes[i].name);
        }
        var asIndex = attrNames.indexOf('as');
        if (asIndex !== -1 && l > asIndex && attrNames[asIndex + 1].charAt(0) === '|') {
            // Some basic validation, since we're doing the parsing ourselves
            paramsString = attrNames.slice(asIndex).join(' ');

            if (paramsString.charAt(paramsString.length - 1) !== '|' || paramsString.match(/\|/g).length !== 2) {
                throw new SyntaxError('Invalid block parameters syntax: \'' + paramsString + '\'', element.loc);
            }
            params = [];

            for (_i = asIndex + 1; _i < l; _i++) {
                param = attrNames[_i].replace(/\|/g, '');

                if (param !== '') {
                    if (ID_INVERSE_PATTERN.test(param)) {
                        throw new SyntaxError('Invalid identifier for block parameters: \'' + param + '\' in \'' + paramsString + '\'', element.loc);
                    }
                    params.push(param);
                }
            }
            if (params.length === 0) {
                throw new SyntaxError('Cannot use zero block parameters: \'' + paramsString + '\'', element.loc);
            }
            element.attributes = element.attributes.slice(0, asIndex);
            return params;
        }
        return null;
    }
    function childrenFor(node) {
        switch (node.type) {
            case 'Program':
                return node.body;
            case 'ElementNode':
                return node.children;
        }
    }
    function appendChild(parent, node) {
        childrenFor(parent).push(node);
    }
    function isLiteral$1(path) {
        return path.type === 'StringLiteral' || path.type === 'BooleanLiteral' || path.type === 'NumberLiteral' || path.type === 'NullLiteral' || path.type === 'UndefinedLiteral';
    }
    function printLiteral(literal) {
        if (literal.type === 'UndefinedLiteral') {
            return 'undefined';
        } else {
            return JSON.stringify(literal.value);
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            var i, descriptor;

            for (i = 0; i < props.length; i++) {
                descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
            }
        }return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
        };
    }();

    function _classCallCheck$2(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var entityParser = new _simpleHtmlTokenizer.EntityParser(_simpleHtmlTokenizer.HTML5NamedCharRefs);
    var Parser = function () {
        function Parser(source) {
            var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

            _classCallCheck$2(this, Parser);

            this.elementStack = [];
            this.currentAttribute = null;
            this.currentNode = null;
            this.tokenizer = new _simpleHtmlTokenizer.EventedTokenizer(this, entityParser);
            this.options = options;
            this.source = source.split(/(?:\r\n?|\n)/g);
        }

        Parser.prototype.acceptNode = function (node) {
            return this[node.type](node);
        };

        Parser.prototype.currentElement = function () {
            return this.elementStack[this.elementStack.length - 1];
        };

        Parser.prototype.sourceForNode = function (node, endNode) {
            var firstLine = node.loc.start.line - 1;
            var currentLine = firstLine - 1;
            var firstColumn = node.loc.start.column;
            var string = [];
            var line = void 0;
            var lastLine = void 0;
            var lastColumn = void 0;
            if (endNode) {
                lastLine = endNode.loc.end.line - 1;
                lastColumn = endNode.loc.end.column;
            } else {
                lastLine = node.loc.end.line - 1;
                lastColumn = node.loc.end.column;
            }
            while (currentLine < lastLine) {
                currentLine++;
                line = this.source[currentLine];
                if (currentLine === firstLine) {
                    if (firstLine === lastLine) {
                        string.push(line.slice(firstColumn, lastColumn));
                    } else {
                        string.push(line.slice(firstColumn));
                    }
                } else if (currentLine === lastLine) {
                    string.push(line.slice(0, lastColumn));
                } else {
                    string.push(line);
                }
            }
            return string.join('\n');
        };

        _createClass(Parser, [{
            key: 'currentAttr',
            get: function () {
                return this.currentAttribute;
            }
        }, {
            key: 'currentTag',
            get: function () {
                var node = this.currentNode;
                (0, _util.assert)(node && (node.type === 'StartTag' || node.type === 'EndTag'), 'expected tag');
                return node;
            }
        }, {
            key: 'currentStartTag',
            get: function () {
                var node = this.currentNode;
                (0, _util.assert)(node && node.type === 'StartTag', 'expected start tag');
                return node;
            }
        }, {
            key: 'currentEndTag',
            get: function () {
                var node = this.currentNode;
                (0, _util.assert)(node && node.type === 'EndTag', 'expected end tag');
                return node;
            }
        }, {
            key: 'currentComment',
            get: function () {
                var node = this.currentNode;
                (0, _util.assert)(node && node.type === 'CommentStatement', 'expected a comment');
                return node;
            }
        }, {
            key: 'currentData',
            get: function () {
                var node = this.currentNode;
                (0, _util.assert)(node && node.type === 'TextNode', 'expected a text node');
                return node;
            }
        }]);

        return Parser;
    }();

    function _defaults$1(obj, defaults) {
        var keys = Object.getOwnPropertyNames(defaults),
            i,
            key,
            value;for (i = 0; i < keys.length; i++) {
            key = keys[i];
            value = Object.getOwnPropertyDescriptor(defaults, key);
            if (value && value.configurable && obj[key] === undefined) {
                Object.defineProperty(obj, key, value);
            }
        }return obj;
    }

    function _classCallCheck$1(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    function _possibleConstructorReturn$1(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits$1(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults$1(subClass, superClass);
    }

    var HandlebarsNodeVisitors = function (_Parser) {
        _inherits$1(HandlebarsNodeVisitors, _Parser);

        function HandlebarsNodeVisitors() {
            _classCallCheck$1(this, HandlebarsNodeVisitors);

            return _possibleConstructorReturn$1(this, _Parser.apply(this, arguments));
        }

        HandlebarsNodeVisitors.prototype.Program = function (program) {
            var node = b.program([], program.blockParams, program.loc),
                elementNode;
            var i = void 0,
                l = program.body.length;
            this.elementStack.push(node);
            if (l === 0) {
                return this.elementStack.pop();
            }
            for (i = 0; i < l; i++) {
                this.acceptNode(program.body[i]);
            }
            // Ensure that that the element stack is balanced properly.
            var poppedNode = this.elementStack.pop();
            if (poppedNode !== node) {
                elementNode = poppedNode;

                throw new SyntaxError("Unclosed element `" + elementNode.tag + "` (on line " + elementNode.loc.start.line + ").", elementNode.loc);
            }
            return node;
        };

        HandlebarsNodeVisitors.prototype.BlockStatement = function (block) {
            if (this.tokenizer['state'] === 'comment') {
                this.appendToCommentData(this.sourceForNode(block));
                return;
            }
            if (this.tokenizer['state'] !== 'comment' && this.tokenizer['state'] !== 'data' && this.tokenizer['state'] !== 'beforeData') {
                throw new SyntaxError("A block may only be used inside an HTML element or another block.", block.loc);
            }

            var _acceptCallNodes = acceptCallNodes(this, block),
                path = _acceptCallNodes.path,
                params = _acceptCallNodes.params,
                hash = _acceptCallNodes.hash;

            var program = this.Program(block.program);
            var inverse = block.inverse ? this.Program(block.inverse) : null;
            var node = b.block(path, params, hash, program, inverse, block.loc);
            var parentProgram = this.currentElement();
            appendChild(parentProgram, node);
        };

        HandlebarsNodeVisitors.prototype.MustacheStatement = function (rawMustache) {
            var tokenizer = this.tokenizer,
                _acceptCallNodes2,
                path,
                params,
                hash;

            if (tokenizer['state'] === 'comment') {
                this.appendToCommentData(this.sourceForNode(rawMustache));
                return;
            }
            var mustache = void 0;
            var escaped = rawMustache.escaped,
                loc = rawMustache.loc;

            if (rawMustache.path.type.match(/Literal$/)) {
                mustache = {
                    type: 'MustacheStatement',
                    path: this.acceptNode(rawMustache.path),
                    params: [],
                    hash: b.hash(),
                    escaped: escaped,
                    loc: loc
                };
            } else {
                _acceptCallNodes2 = acceptCallNodes(this, rawMustache), path = _acceptCallNodes2.path, params = _acceptCallNodes2.params, hash = _acceptCallNodes2.hash;


                mustache = b.mustache(path, params, hash, !escaped, loc);
            }
            switch (tokenizer.state) {
                // Tag helpers
                case "tagName":
                    addElementModifier(this.currentStartTag, mustache);
                    tokenizer.state = "beforeAttributeName";
                    break;
                case "beforeAttributeName":
                    addElementModifier(this.currentStartTag, mustache);
                    break;
                case "attributeName":
                case "afterAttributeName":
                    this.beginAttributeValue(false);
                    this.finishAttributeValue();
                    addElementModifier(this.currentStartTag, mustache);
                    tokenizer.state = "beforeAttributeName";
                    break;
                case "afterAttributeValueQuoted":
                    addElementModifier(this.currentStartTag, mustache);
                    tokenizer.state = "beforeAttributeName";
                    break;
                // Attribute values
                case "beforeAttributeValue":
                    appendDynamicAttributeValuePart(this.currentAttribute, mustache);
                    tokenizer.state = 'attributeValueUnquoted';
                    break;
                case "attributeValueDoubleQuoted":
                case "attributeValueSingleQuoted":
                case "attributeValueUnquoted":
                    appendDynamicAttributeValuePart(this.currentAttribute, mustache);
                    break;
                // TODO: Only append child when the tokenizer state makes
                // sense to do so, otherwise throw an error.
                default:
                    appendChild(this.currentElement(), mustache);
            }
            return mustache;
        };

        HandlebarsNodeVisitors.prototype.ContentStatement = function (content) {
            updateTokenizerLocation(this.tokenizer, content);
            this.tokenizer.tokenizePart(content.value);
            this.tokenizer.flushData();
        };

        HandlebarsNodeVisitors.prototype.CommentStatement = function (rawComment) {
            var tokenizer = this.tokenizer;

            if (tokenizer.state === 'comment') {
                this.appendToCommentData(this.sourceForNode(rawComment));
                return null;
            }
            var value = rawComment.value,
                loc = rawComment.loc;

            var comment = b.mustacheComment(value, loc);
            switch (tokenizer.state) {
                case "beforeAttributeName":
                    this.currentStartTag.comments.push(comment);
                    break;
                case 'beforeData':
                case 'data':
                    appendChild(this.currentElement(), comment);
                    break;
                default:
                    throw new SyntaxError("Using a Handlebars comment when in the `" + tokenizer.state + "` state is not supported: \"" + comment.value + "\" on line " + loc.start.line + ":" + loc.start.column, rawComment.loc);
            }
            return comment;
        };

        HandlebarsNodeVisitors.prototype.PartialStatement = function (partial) {
            var loc = partial.loc;

            throw new SyntaxError("Handlebars partials are not supported: \"" + this.sourceForNode(partial, partial.name) + "\" at L" + loc.start.line + ":C" + loc.start.column, partial.loc);
        };

        HandlebarsNodeVisitors.prototype.PartialBlockStatement = function (partialBlock) {
            var loc = partialBlock.loc;

            throw new SyntaxError("Handlebars partial blocks are not supported: \"" + this.sourceForNode(partialBlock, partialBlock.name) + "\" at L" + loc.start.line + ":C" + loc.start.column, partialBlock.loc);
        };

        HandlebarsNodeVisitors.prototype.Decorator = function (decorator) {
            var loc = decorator.loc;

            throw new SyntaxError("Handlebars decorators are not supported: \"" + this.sourceForNode(decorator, decorator.path) + "\" at L" + loc.start.line + ":C" + loc.start.column, decorator.loc);
        };

        HandlebarsNodeVisitors.prototype.DecoratorBlock = function (decoratorBlock) {
            var loc = decoratorBlock.loc;

            throw new SyntaxError("Handlebars decorator blocks are not supported: \"" + this.sourceForNode(decoratorBlock, decoratorBlock.path) + "\" at L" + loc.start.line + ":C" + loc.start.column, decoratorBlock.loc);
        };

        HandlebarsNodeVisitors.prototype.SubExpression = function (sexpr) {
            var _acceptCallNodes3 = acceptCallNodes(this, sexpr),
                path = _acceptCallNodes3.path,
                params = _acceptCallNodes3.params,
                hash = _acceptCallNodes3.hash;

            return b.sexpr(path, params, hash, sexpr.loc);
        };

        HandlebarsNodeVisitors.prototype.PathExpression = function (path) {
            var original = path.original,
                loc = path.loc;

            var parts = void 0;
            if (original.indexOf('/') !== -1) {
                if (original.slice(0, 2) === './') {
                    throw new SyntaxError("Using \"./\" is not supported in Glimmer and unnecessary: \"" + path.original + "\" on line " + loc.start.line + ".", path.loc);
                }
                if (original.slice(0, 3) === '../') {
                    throw new SyntaxError("Changing context using \"../\" is not supported in Glimmer: \"" + path.original + "\" on line " + loc.start.line + ".", path.loc);
                }
                if (original.indexOf('.') !== -1) {
                    throw new SyntaxError("Mixing '.' and '/' in paths is not supported in Glimmer; use only '.' to separate property paths: \"" + path.original + "\" on line " + loc.start.line + ".", path.loc);
                }
                parts = [path.parts.join('/')];
            } else {
                parts = path.parts;
            }
            var thisHead = false;
            // This is to fix a bug in the Handlebars AST where the path expressions in
            // `{{this.foo}}` (and similarly `{{foo-bar this.foo named=this.foo}}` etc)
            // are simply turned into `{{foo}}`. The fix is to push it back onto the
            // parts array and let the runtime see the difference. However, we cannot
            // simply use the string `this` as it means literally the property called
            // "this" in the current context (it can be expressed in the syntax as
            // `{{[this]}}`, where the square bracket are generally for this kind of
            // escaping – such as `{{foo.["bar.baz"]}}` would mean lookup a property
            // named literally "bar.baz" on `this.foo`). By convention, we use `null`
            // for this purpose.
            if (original.match(/^this(\..+)?$/)) {
                thisHead = true;
            }
            return {
                type: 'PathExpression',
                original: path.original,
                this: thisHead,
                parts: parts,
                data: path.data,
                loc: path.loc
            };
        };

        HandlebarsNodeVisitors.prototype.Hash = function (hash) {
            var pairs = [],
                i,
                pair;
            for (i = 0; i < hash.pairs.length; i++) {
                pair = hash.pairs[i];

                pairs.push(b.pair(pair.key, this.acceptNode(pair.value), pair.loc));
            }
            return b.hash(pairs, hash.loc);
        };

        HandlebarsNodeVisitors.prototype.StringLiteral = function (string) {
            return b.literal('StringLiteral', string.value, string.loc);
        };

        HandlebarsNodeVisitors.prototype.BooleanLiteral = function (boolean) {
            return b.literal('BooleanLiteral', boolean.value, boolean.loc);
        };

        HandlebarsNodeVisitors.prototype.NumberLiteral = function (number) {
            return b.literal('NumberLiteral', number.value, number.loc);
        };

        HandlebarsNodeVisitors.prototype.UndefinedLiteral = function (undef) {
            return b.literal('UndefinedLiteral', undefined, undef.loc);
        };

        HandlebarsNodeVisitors.prototype.NullLiteral = function (nul) {
            return b.literal('NullLiteral', null, nul.loc);
        };

        return HandlebarsNodeVisitors;
    }(Parser);
    function calculateRightStrippedOffsets(original, value) {
        if (value === '') {
            // if it is empty, just return the count of newlines
            // in original
            return {
                lines: original.split("\n").length - 1,
                columns: 0
            };
        }
        // otherwise, return the number of newlines prior to
        // `value`
        var difference = original.split(value)[0];
        var lines = difference.split(/\n/);
        var lineCount = lines.length - 1;
        return {
            lines: lineCount,
            columns: lines[lineCount].length
        };
    }
    function updateTokenizerLocation(tokenizer, content) {
        var line = content.loc.start.line;
        var column = content.loc.start.column;
        var offsets = calculateRightStrippedOffsets(content.original, content.value);
        line = line + offsets.lines;
        if (offsets.lines) {
            column = offsets.columns;
        } else {
            column = column + offsets.columns;
        }
        tokenizer.line = line;
        tokenizer.column = column;
    }
    function acceptCallNodes(compiler, node) {
        var path = compiler.PathExpression(node.path);
        var params = node.params ? node.params.map(function (e) {
            return compiler.acceptNode(e);
        }) : [];
        var hash = node.hash ? compiler.Hash(node.hash) : b.hash();
        return { path: path, params: params, hash: hash };
    }
    function addElementModifier(element, mustache) {
        var path = mustache.path,
            params = mustache.params,
            hash = mustache.hash,
            loc = mustache.loc,
            _modifier,
            tag;

        if (isLiteral$1(path)) {
            _modifier = "{{" + printLiteral(path) + "}}";
            tag = "<" + element.name + " ... " + _modifier + " ...";

            throw new SyntaxError("In " + tag + ", " + _modifier + " is not a valid modifier: \"" + path.original + "\" on line " + (loc && loc.start.line) + ".", mustache.loc);
        }
        var modifier = b.elementModifier(path, params, hash, loc);
        element.modifiers.push(modifier);
    }
    function appendDynamicAttributeValuePart(attribute, part) {
        attribute.isDynamic = true;
        attribute.parts.push(part);
    }

    var visitorKeys = {
        Program: ['body'],
        MustacheStatement: ['path', 'params', 'hash'],
        BlockStatement: ['path', 'params', 'hash', 'program', 'inverse'],
        ElementModifierStatement: ['path', 'params', 'hash'],
        PartialStatement: ['name', 'params', 'hash'],
        CommentStatement: [],
        MustacheCommentStatement: [],
        ElementNode: ['attributes', 'modifiers', 'children', 'comments'],
        AttrNode: ['value'],
        TextNode: [],
        ConcatStatement: ['parts'],
        SubExpression: ['path', 'params', 'hash'],
        PathExpression: [],
        StringLiteral: [],
        BooleanLiteral: [],
        NumberLiteral: [],
        NullLiteral: [],
        UndefinedLiteral: [],
        Hash: ['pairs'],
        HashPair: ['value']
    };

    var TraversalError = function () {
        TraversalError.prototype = Object.create(Error.prototype);
        TraversalError.prototype.constructor = TraversalError;
        function TraversalError(message, node, parent, key) {
            var error = Error.call(this, message);
            this.key = key;
            this.message = message;
            this.node = node;
            this.parent = parent;
            this.stack = error.stack;
        }
        return TraversalError;
    }();
    function cannotRemoveNode(node, parent, key) {
        return new TraversalError("Cannot remove a node unless it is part of an array", node, parent, key);
    }
    function cannotReplaceNode(node, parent, key) {
        return new TraversalError("Cannot replace a node with multiple nodes unless it is part of an array", node, parent, key);
    }
    function cannotReplaceOrRemoveInKeyHandlerYet(node, key) {
        return new TraversalError("Replacing and removing in key handlers is not yet supported.", node, null, key);
    }

    function visitNode(visitor, node) {
        var handler = visitor[node.type] || visitor.All || null,
            keys,
            i;
        var result = void 0;
        if (handler && handler['enter']) {
            result = handler['enter'].call(null, node);
        }
        if (result !== undefined && result !== null) {
            if (JSON.stringify(node) === JSON.stringify(result)) {
                result = undefined;
            } else if (Array.isArray(result)) {
                return visitArray(visitor, result) || result;
            } else {
                return visitNode(visitor, result) || result;
            }
        }
        if (result === undefined) {
            keys = visitorKeys[node.type];

            for (i = 0; i < keys.length; i++) {
                visitKey(visitor, handler, node, keys[i]);
            }
            if (handler && handler['exit']) {
                result = handler['exit'].call(null, node);
            }
        }
        return result;
    }
    function visitKey(visitor, handler, node, key) {
        var value = node[key],
            _result;
        if (!value) {
            return;
        }
        var keyHandler = handler && (handler.keys[key] || handler.keys.All);
        var result = void 0;
        if (keyHandler && keyHandler.enter) {
            result = keyHandler.enter.call(null, node, key);
            if (result !== undefined) {
                throw cannotReplaceOrRemoveInKeyHandlerYet(node, key);
            }
        }
        if (Array.isArray(value)) {
            visitArray(visitor, value);
        } else {
            _result = visitNode(visitor, value);

            if (_result !== undefined) {
                assignKey(node, key, _result);
            }
        }
        if (keyHandler && keyHandler.exit) {
            result = keyHandler.exit.call(null, node, key);
            if (result !== undefined) {
                throw cannotReplaceOrRemoveInKeyHandlerYet(node, key);
            }
        }
    }
    function visitArray(visitor, array) {
        var i, result;

        for (i = 0; i < array.length; i++) {
            result = visitNode(visitor, array[i]);

            if (result !== undefined) {
                i += spliceArray(array, i, result) - 1;
            }
        }
    }
    function assignKey(node, key, result) {
        if (result === null) {
            throw cannotRemoveNode(node[key], node, key);
        } else if (Array.isArray(result)) {
            if (result.length === 1) {
                node[key] = result[0];
            } else {
                if (result.length === 0) {
                    throw cannotRemoveNode(node[key], node, key);
                } else {
                    throw cannotReplaceNode(node[key], node, key);
                }
            }
        } else {
            node[key] = result;
        }
    }
    function spliceArray(array, index, result) {
        if (result === null) {
            array.splice(index, 1);
            return 0;
        } else if (Array.isArray(result)) {
            array.splice.apply(array, [index, 1].concat(result));
            return result.length;
        } else {
            array.splice(index, 1, result);
            return 1;
        }
    }
    function traverse(node, visitor) {
        visitNode(normalizeVisitor(visitor), node);
    }
    function normalizeVisitor(visitor) {
        var normalizedVisitor = {},
            handler,
            normalizedKeys,
            keys,
            keyHandler;
        for (var type in visitor) {
            handler = visitor[type] || visitor.All;
            normalizedKeys = {};

            if (typeof handler === 'object') {
                keys = handler.keys;

                if (keys) {
                    for (var key in keys) {
                        keyHandler = keys[key];

                        if (typeof keyHandler === 'object') {
                            normalizedKeys[key] = {
                                enter: typeof keyHandler.enter === 'function' ? keyHandler.enter : null,
                                exit: typeof keyHandler.exit === 'function' ? keyHandler.exit : null
                            };
                        } else if (typeof keyHandler === 'function') {
                            normalizedKeys[key] = {
                                enter: keyHandler,
                                exit: null
                            };
                        }
                    }
                }
                normalizedVisitor[type] = {
                    enter: typeof handler.enter === 'function' ? handler.enter : null,
                    exit: typeof handler.exit === 'function' ? handler.exit : null,
                    keys: normalizedKeys
                };
            } else if (typeof handler === 'function') {
                normalizedVisitor[type] = {
                    enter: handler,
                    exit: null,
                    keys: normalizedKeys
                };
            }
        }
        return normalizedVisitor;
    }

    function unreachable() {
        throw new Error('unreachable');
    }
    function build(ast) {
        if (!ast) {
            return '';
        }
        var output = [],
            chainBlock,
            body,
            value,
            lines;
        switch (ast.type) {
            case 'Program':
                {
                    chainBlock = ast['chained'] && ast.body[0];

                    if (chainBlock) {
                        chainBlock['chained'] = true;
                    }
                    body = buildEach(ast.body).join('');

                    output.push(body);
                }
                break;
            case 'ElementNode':
                output.push('<', ast.tag);
                if (ast.attributes.length) {
                    output.push(' ', buildEach(ast.attributes).join(' '));
                }
                if (ast.modifiers.length) {
                    output.push(' ', buildEach(ast.modifiers).join(' '));
                }
                if (ast.comments.length) {
                    output.push(' ', buildEach(ast.comments).join(' '));
                }
                output.push('>');
                output.push.apply(output, buildEach(ast.children));
                output.push('</', ast.tag, '>');
                break;
            case 'AttrNode':
                output.push(ast.name, '=');
                value = build(ast.value);

                if (ast.value.type === 'TextNode') {
                    output.push('"', value, '"');
                } else {
                    output.push(value);
                }
                break;
            case 'ConcatStatement':
                output.push('"');
                ast.parts.forEach(function (node) {
                    if (node.type === 'StringLiteral') {
                        output.push(node.original);
                    } else {
                        output.push(build(node));
                    }
                });
                output.push('"');
                break;
            case 'TextNode':
                output.push(ast.chars);
                break;
            case 'MustacheStatement':
                {
                    output.push(compactJoin(['{{', pathParams(ast), '}}']));
                }
                break;
            case 'MustacheCommentStatement':
                {
                    output.push(compactJoin(['{{!--', ast.value, '--}}']));
                }
                break;
            case 'ElementModifierStatement':
                {
                    output.push(compactJoin(['{{', pathParams(ast), '}}']));
                }
                break;
            case 'PathExpression':
                output.push(ast.original);
                break;
            case 'SubExpression':
                {
                    output.push('(', pathParams(ast), ')');
                }
                break;
            case 'BooleanLiteral':
                output.push(ast.value ? 'true' : 'false');
                break;
            case 'BlockStatement':
                {
                    lines = [];

                    if (ast['chained']) {
                        lines.push(['{{else ', pathParams(ast), '}}'].join(''));
                    } else {
                        lines.push(openBlock(ast));
                    }
                    lines.push(build(ast.program));
                    if (ast.inverse) {
                        if (!ast.inverse['chained']) {
                            lines.push('{{else}}');
                        }
                        lines.push(build(ast.inverse));
                    }
                    if (!ast['chained']) {
                        lines.push(closeBlock(ast));
                    }
                    output.push(lines.join(''));
                }
                break;
            case 'PartialStatement':
                {
                    output.push(compactJoin(['{{>', pathParams(ast), '}}']));
                }
                break;
            case 'CommentStatement':
                {
                    output.push(compactJoin(['<!--', ast.value, '-->']));
                }
                break;
            case 'StringLiteral':
                {
                    output.push('"' + ast.value + '"');
                }
                break;
            case 'NumberLiteral':
                {
                    output.push(String(ast.value));
                }
                break;
            case 'UndefinedLiteral':
                {
                    output.push('undefined');
                }
                break;
            case 'NullLiteral':
                {
                    output.push('null');
                }
                break;
            case 'Hash':
                {
                    output.push(ast.pairs.map(function (pair) {
                        return build(pair);
                    }).join(' '));
                }
                break;
            case 'HashPair':
                {
                    output.push(ast.key + '=' + build(ast.value));
                }
                break;
        }
        return output.join('');
    }
    function compact(array) {
        var newArray = [];
        array.forEach(function (a) {
            if (typeof a !== 'undefined' && a !== null && a !== '') {
                newArray.push(a);
            }
        });
        return newArray;
    }
    function buildEach(asts) {
        return asts.map(build);
    }
    function pathParams(ast) {
        var path = void 0;
        switch (ast.type) {
            case 'MustacheStatement':
            case 'SubExpression':
            case 'ElementModifierStatement':
            case 'BlockStatement':
                if (isLiteral(ast.path)) {
                    return String(ast.path.value);
                }
                path = build(ast.path);
                break;
            case 'PartialStatement':
                path = build(ast.name);
                break;
            default:
                return unreachable();
        }
        return compactJoin([path, buildEach(ast.params).join(' '), build(ast.hash)], ' ');
    }
    function compactJoin(array, delimiter) {
        return compact(array).join(delimiter || '');
    }
    function blockParams(block) {
        var params = block.program.blockParams;
        if (params.length) {
            return ' as |' + params.join(' ') + '|';
        }
        return null;
    }
    function openBlock(block) {
        return ['{{#', pathParams(block), blockParams(block), '}}'].join('');
    }
    function closeBlock(block) {
        return ['{{/', build(block.path), '}}'].join('');
    }

    function _classCallCheck$3(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var Walker = function () {
        function Walker(order) {
            _classCallCheck$3(this, Walker);

            this.order = order;
            this.stack = [];
        }

        Walker.prototype.visit = function (node, callback) {
            if (!node) {
                return;
            }
            this.stack.push(node);
            if (this.order === 'post') {
                this.children(node, callback);
                callback(node, this);
            } else {
                callback(node, this);
                this.children(node, callback);
            }
            this.stack.pop();
        };

        Walker.prototype.children = function (node, callback) {
            var visitor = visitors[node.type];
            if (visitor) {
                visitor(this, node, callback);
            }
        };

        return Walker;
    }();

    var visitors = {
        Program: function (walker, node, callback) {
            var i;

            for (i = 0; i < node.body.length; i++) {
                walker.visit(node.body[i], callback);
            }
        },
        ElementNode: function (walker, node, callback) {
            var i;

            for (i = 0; i < node.children.length; i++) {
                walker.visit(node.children[i], callback);
            }
        },
        BlockStatement: function (walker, node, callback) {
            walker.visit(node.program, callback);
            walker.visit(node.inverse || null, callback);
        }
    };

    function _defaults(obj, defaults) {
        var keys = Object.getOwnPropertyNames(defaults),
            i,
            key,
            value;for (i = 0; i < keys.length; i++) {
            key = keys[i];
            value = Object.getOwnPropertyDescriptor(defaults, key);
            if (value && value.configurable && obj[key] === undefined) {
                Object.defineProperty(obj, key, value);
            }
        }return obj;
    }

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults(subClass, superClass);
    }

    var voidMap = Object.create(null);

    "area base br col command embed hr img input keygen link meta param source track wbr".split(" ").forEach(function (tagName) {
        voidMap[tagName] = true;
    });
    var TokenizerEventHandlers = function (_HandlebarsNodeVisito) {
        _inherits(TokenizerEventHandlers, _HandlebarsNodeVisito);

        function TokenizerEventHandlers() {
            _classCallCheck(this, TokenizerEventHandlers);

            var _this = _possibleConstructorReturn(this, _HandlebarsNodeVisito.apply(this, arguments));

            _this.tagOpenLine = 0;
            _this.tagOpenColumn = 0;
            return _this;
        }

        TokenizerEventHandlers.prototype.reset = function () {
            this.currentNode = null;
        };
        // Comment


        TokenizerEventHandlers.prototype.beginComment = function () {
            this.currentNode = b.comment("");
            this.currentNode.loc = {
                source: null,
                start: b.pos(this.tagOpenLine, this.tagOpenColumn),
                end: null
            };
        };

        TokenizerEventHandlers.prototype.appendToCommentData = function (char) {
            this.currentComment.value += char;
        };

        TokenizerEventHandlers.prototype.finishComment = function () {
            this.currentComment.loc.end = b.pos(this.tokenizer.line, this.tokenizer.column);
            appendChild(this.currentElement(), this.currentComment);
        };
        // Data


        TokenizerEventHandlers.prototype.beginData = function () {
            this.currentNode = b.text();
            this.currentNode.loc = {
                source: null,
                start: b.pos(this.tokenizer.line, this.tokenizer.column),
                end: null
            };
        };

        TokenizerEventHandlers.prototype.appendToData = function (char) {
            this.currentData.chars += char;
        };

        TokenizerEventHandlers.prototype.finishData = function () {
            this.currentData.loc.end = b.pos(this.tokenizer.line, this.tokenizer.column);
            appendChild(this.currentElement(), this.currentData);
        };
        // Tags - basic


        TokenizerEventHandlers.prototype.tagOpen = function () {
            this.tagOpenLine = this.tokenizer.line;
            this.tagOpenColumn = this.tokenizer.column;
        };

        TokenizerEventHandlers.prototype.beginStartTag = function () {
            this.currentNode = {
                type: 'StartTag',
                name: "",
                attributes: [],
                modifiers: [],
                comments: [],
                selfClosing: false,
                loc: SYNTHETIC
            };
        };

        TokenizerEventHandlers.prototype.beginEndTag = function () {
            this.currentNode = {
                type: 'EndTag',
                name: "",
                attributes: [],
                modifiers: [],
                comments: [],
                selfClosing: false,
                loc: SYNTHETIC
            };
        };

        TokenizerEventHandlers.prototype.finishTag = function () {
            var _tokenizer = this.tokenizer,
                line = _tokenizer.line,
                column = _tokenizer.column;

            var tag = this.currentTag;
            tag.loc = b.loc(this.tagOpenLine, this.tagOpenColumn, line, column);
            if (tag.type === 'StartTag') {
                this.finishStartTag();
                if (voidMap[tag.name] || tag.selfClosing) {
                    this.finishEndTag(true);
                }
            } else if (tag.type === 'EndTag') {
                this.finishEndTag(false);
            }
        };

        TokenizerEventHandlers.prototype.finishStartTag = function () {
            var _currentStartTag = this.currentStartTag,
                name = _currentStartTag.name,
                attributes = _currentStartTag.attributes,
                modifiers = _currentStartTag.modifiers,
                comments = _currentStartTag.comments;

            var loc = b.loc(this.tagOpenLine, this.tagOpenColumn);
            var element = b.element(name, attributes, modifiers, [], comments, loc);
            this.elementStack.push(element);
        };

        TokenizerEventHandlers.prototype.finishEndTag = function (isVoid) {
            var tag = this.currentTag;
            var element = this.elementStack.pop();
            var parent = this.currentElement();
            validateEndTag(tag, element, isVoid);
            element.loc.end.line = this.tokenizer.line;
            element.loc.end.column = this.tokenizer.column;
            parseElementBlockParams(element);
            appendChild(parent, element);
        };

        TokenizerEventHandlers.prototype.markTagAsSelfClosing = function () {
            this.currentTag.selfClosing = true;
        };
        // Tags - name


        TokenizerEventHandlers.prototype.appendToTagName = function (char) {
            this.currentTag.name += char;
        };
        // Tags - attributes


        TokenizerEventHandlers.prototype.beginAttribute = function () {
            var tag = this.currentTag;
            if (tag.type === 'EndTag') {
                throw new SyntaxError("Invalid end tag: closing tag must not have attributes, " + ("in `" + tag.name + "` (on line " + this.tokenizer.line + ")."), tag.loc);
            }
            this.currentAttribute = {
                name: "",
                parts: [],
                isQuoted: false,
                isDynamic: false,
                start: b.pos(this.tokenizer.line, this.tokenizer.column),
                valueStartLine: 0,
                valueStartColumn: 0
            };
        };

        TokenizerEventHandlers.prototype.appendToAttributeName = function (char) {
            this.currentAttr.name += char;
        };

        TokenizerEventHandlers.prototype.beginAttributeValue = function (isQuoted) {
            this.currentAttr.isQuoted = isQuoted;
            this.currentAttr.valueStartLine = this.tokenizer.line;
            this.currentAttr.valueStartColumn = this.tokenizer.column;
        };

        TokenizerEventHandlers.prototype.appendToAttributeValue = function (char) {
            var parts = this.currentAttr.parts,
                loc,
                text;
            var lastPart = parts[parts.length - 1];
            if (lastPart && lastPart.type === 'TextNode') {
                lastPart.chars += char;
                // update end location for each added char
                lastPart.loc.end.line = this.tokenizer.line;
                lastPart.loc.end.column = this.tokenizer.column;
            } else {
                // initially assume the text node is a single char
                loc = b.loc(this.tokenizer.line, this.tokenizer.column, this.tokenizer.line, this.tokenizer.column);
                // correct for `\n` as first char

                if (char === '\n') {
                    loc.start.line -= 1;
                    loc.start.column = lastPart ? lastPart.loc.end.column : this.currentAttr.valueStartColumn;
                }
                text = b.text(char, loc);

                parts.push(text);
            }
        };

        TokenizerEventHandlers.prototype.finishAttributeValue = function () {
            var _currentAttr = this.currentAttr,
                name = _currentAttr.name,
                parts = _currentAttr.parts,
                isQuoted = _currentAttr.isQuoted,
                isDynamic = _currentAttr.isDynamic,
                valueStartLine = _currentAttr.valueStartLine,
                valueStartColumn = _currentAttr.valueStartColumn;

            var value = assembleAttributeValue(parts, isQuoted, isDynamic, this.tokenizer.line);
            value.loc = b.loc(valueStartLine, valueStartColumn, this.tokenizer.line, this.tokenizer.column);
            var loc = b.loc(this.currentAttr.start.line, this.currentAttr.start.column, this.tokenizer.line, this.tokenizer.column);
            var attribute = b.attr(name, value, loc);
            this.currentStartTag.attributes.push(attribute);
        };

        TokenizerEventHandlers.prototype.reportSyntaxError = function (message) {
            throw new SyntaxError("Syntax error at line " + this.tokenizer.line + " col " + this.tokenizer.column + ": " + message, b.loc(this.tokenizer.line, this.tokenizer.column));
        };

        return TokenizerEventHandlers;
    }(HandlebarsNodeVisitors);

    function assembleAttributeValue(parts, isQuoted, isDynamic, line) {
        if (isDynamic) {
            if (isQuoted) {
                return assembleConcatenatedValue(parts);
            } else {
                if (parts.length === 1 || parts.length === 2 && parts[1].type === 'TextNode' && parts[1].chars === '/') {
                    return parts[0];
                } else {
                    throw new SyntaxError("An unquoted attribute value must be a string or a mustache, " + "preceeded by whitespace or a '=' character, and " + ("followed by whitespace, a '>' character, or '/>' (on line " + line + ")"), b.loc(line, 0));
                }
            }
        } else {
            return parts.length > 0 ? parts[0] : b.text("");
        }
    }
    function assembleConcatenatedValue(parts) {
        var i, part;

        for (i = 0; i < parts.length; i++) {
            part = parts[i];

            if (part.type !== 'MustacheStatement' && part.type !== 'TextNode') {
                throw new SyntaxError("Unsupported node in quoted attribute value: " + part['type'], part.loc);
            }
        }
        return b.concat(parts);
    }
    function validateEndTag(tag, element, selfClosing) {
        var error = void 0;
        if (voidMap[tag.name] && !selfClosing) {
            // EngTag is also called by StartTag for void and self-closing tags (i.e.
            // <input> or <br />, so we need to check for that here. Otherwise, we would
            // throw an error for those cases.
            error = "Invalid end tag " + formatEndTagInfo(tag) + " (void elements cannot have end tags).";
        } else if (element.tag === undefined) {
            error = "Closing tag " + formatEndTagInfo(tag) + " without an open tag.";
        } else if (element.tag !== tag.name) {
            error = "Closing tag " + formatEndTagInfo(tag) + " did not match last open tag `" + element.tag + "` (on line " + element.loc.start.line + ").";
        }
        if (error) {
            throw new SyntaxError(error, element.loc);
        }
    }
    function formatEndTagInfo(tag) {
        return "`" + tag.name + "` (on line " + tag.loc.end.line + ")";
    }
    var syntax = {
        parse: preprocess,
        builders: b,
        print: build,
        traverse: traverse,
        Walker: Walker
    };
    function preprocess(html, options) {
        var ast = typeof html === 'object' ? html : (0, _handlebars.parse)(html),
            i,
            l,
            transform,
            env,
            pluginResult;
        var program = new TokenizerEventHandlers(html, options).acceptNode(ast);
        if (options && options.plugins && options.plugins.ast) {
            for (i = 0, l = options.plugins.ast.length; i < l; i++) {
                transform = options.plugins.ast[i];
                env = (0, _util.assign)({}, options, { syntax: syntax }, { plugins: undefined });
                pluginResult = transform(env);

                traverse(program, pluginResult.visitors);
            }
        }
        return program;
    }

    // used by ember-compiler
    // AST

    exports.AST = nodes;
    exports.preprocess = preprocess;
    exports.builders = b;
    exports.traverse = traverse;
    exports.Walker = Walker;
    exports.print = build;
    exports.SyntaxError = SyntaxError;
    exports.isLiteral = isLiteral$1;
    exports.printLiteral = printLiteral;
});
enifed('@glimmer/util', ['exports'], function (exports) {
    'use strict';

    // There is a small whitelist of namespaced attributes specially
    // enumerated in
    // https://www.w3.org/TR/html/syntax.html#attributes-0
    //
    // > When a foreign element has one of the namespaced attributes given by
    // > the local name and namespace of the first and second cells of a row
    // > from the following table, it must be written using the name given by
    // > the third cell from the same row.
    //
    // In all other cases, colons are interpreted as a regular character
    // with no special meaning:
    //
    // > No other namespaced attribute can be expressed in the HTML syntax.

    var XLINK = 'http://www.w3.org/1999/xlink';
    var XML = 'http://www.w3.org/XML/1998/namespace';
    var XMLNS = 'http://www.w3.org/2000/xmlns/';
    var WHITELIST = {
        'xlink:actuate': XLINK,
        'xlink:arcrole': XLINK,
        'xlink:href': XLINK,
        'xlink:role': XLINK,
        'xlink:show': XLINK,
        'xlink:title': XLINK,
        'xlink:type': XLINK,
        'xml:base': XML,
        'xml:lang': XML,
        'xml:space': XML,
        'xmlns': XMLNS,
        'xmlns:xlink': XMLNS
    };

    // import Logger from './logger';
    // let alreadyWarned = false;
    // import Logger from './logger';


    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var LogLevel;
    (function (LogLevel) {
        LogLevel[LogLevel["Trace"] = 0] = "Trace";
        LogLevel[LogLevel["Debug"] = 1] = "Debug";
        LogLevel[LogLevel["Warn"] = 2] = "Warn";
        LogLevel[LogLevel["Error"] = 3] = "Error";
    })(LogLevel || (exports.LogLevel = LogLevel = {}));

    var NullConsole = function () {
        function NullConsole() {
            _classCallCheck(this, NullConsole);
        }

        NullConsole.prototype.log = function () {};

        NullConsole.prototype.warn = function () {};

        NullConsole.prototype.error = function () {};

        NullConsole.prototype.trace = function () {};

        return NullConsole;
    }();

    var ALWAYS = void 0;
    var Logger = function () {
        function Logger(_ref) {
            var console = _ref.console,
                level = _ref.level;

            _classCallCheck(this, Logger);

            this.f = ALWAYS;
            this.force = ALWAYS;
            this.console = console;
            this.level = level;
        }

        Logger.prototype.skipped = function (level) {
            return level < this.level;
        };

        Logger.prototype.trace = function (message) {
            var _ref2 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
                _ref2$stackTrace = _ref2.stackTrace,
                stackTrace = _ref2$stackTrace === undefined ? false : _ref2$stackTrace;

            if (this.skipped(LogLevel.Trace)) return;
            this.console.log(message);
            if (stackTrace) this.console.trace();
        };

        Logger.prototype.debug = function (message) {
            var _ref3 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
                _ref3$stackTrace = _ref3.stackTrace,
                stackTrace = _ref3$stackTrace === undefined ? false : _ref3$stackTrace;

            if (this.skipped(LogLevel.Debug)) return;
            this.console.log(message);
            if (stackTrace) this.console.trace();
        };

        Logger.prototype.warn = function (message) {
            var _ref4 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
                _ref4$stackTrace = _ref4.stackTrace,
                stackTrace = _ref4$stackTrace === undefined ? false : _ref4$stackTrace;

            if (this.skipped(LogLevel.Warn)) return;
            this.console.warn(message);
            if (stackTrace) this.console.trace();
        };

        Logger.prototype.error = function (message) {
            if (this.skipped(LogLevel.Error)) return;
            this.console.error(message);
        };

        return Logger;
    }();
    var _console = typeof console === 'undefined' ? new NullConsole() : console;
    ALWAYS = new Logger({ console: _console, level: LogLevel.Trace });
    var LOG_LEVEL = LogLevel.Debug;
    var logger = new Logger({ console: _console, level: LOG_LEVEL });

    var objKeys = Object.keys;

    var GUID = 0;
    function initializeGuid(object) {
        return object._guid = ++GUID;
    }
    function ensureGuid(object) {
        return object._guid || initializeGuid(object);
    }

    function _classCallCheck$1(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var proto = Object.create(null, {
        // without this, we will always still end up with (new
        // EmptyObject()).constructor === Object
        constructor: {
            value: undefined,
            enumerable: false,
            writable: true
        }
    });
    function EmptyObject() {}
    EmptyObject.prototype = proto;
    function dict() {
        // let d = Object.create(null);
        // d.x = 1;
        // delete d.x;
        // return d;
        return new EmptyObject();
    }
    var DictSet = function () {
        function DictSet() {
            _classCallCheck$1(this, DictSet);

            this.dict = dict();
        }

        DictSet.prototype.add = function (obj) {
            if (typeof obj === 'string') this.dict[obj] = obj;else this.dict[ensureGuid(obj)] = obj;
            return this;
        };

        DictSet.prototype.delete = function (obj) {
            if (typeof obj === 'string') delete this.dict[obj];else if (obj._guid) delete this.dict[obj._guid];
        };

        DictSet.prototype.forEach = function (callback) {
            var dict = this.dict,
                i;

            var dictKeys = Object.keys(dict);
            for (i = 0; dictKeys.length; i++) {
                callback(dict[dictKeys[i]]);
            }
        };

        DictSet.prototype.toArray = function () {
            return Object.keys(this.dict);
        };

        return DictSet;
    }();
    var Stack = function () {
        function Stack() {
            _classCallCheck$1(this, Stack);

            this.stack = [];
            this.current = null;
        }

        Stack.prototype.toArray = function () {
            return this.stack;
        };

        Stack.prototype.push = function (item) {
            this.current = item;
            this.stack.push(item);
        };

        Stack.prototype.pop = function () {
            var item = this.stack.pop();
            var len = this.stack.length;
            this.current = len === 0 ? null : this.stack[len - 1];
            return item === undefined ? null : item;
        };

        Stack.prototype.isEmpty = function () {
            return this.stack.length === 0;
        };

        return Stack;
    }();

    function _classCallCheck$2(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var LinkedList = function () {
        function LinkedList() {
            _classCallCheck$2(this, LinkedList);

            this.clear();
        }

        LinkedList.fromSlice = function (slice) {
            var list = new LinkedList();
            slice.forEachNode(function (n) {
                return list.append(n.clone());
            });
            return list;
        };

        LinkedList.prototype.head = function () {
            return this._head;
        };

        LinkedList.prototype.tail = function () {
            return this._tail;
        };

        LinkedList.prototype.clear = function () {
            this._head = this._tail = null;
        };

        LinkedList.prototype.isEmpty = function () {
            return this._head === null;
        };

        LinkedList.prototype.toArray = function () {
            var out = [];
            this.forEachNode(function (n) {
                return out.push(n);
            });
            return out;
        };

        LinkedList.prototype.splice = function (start, end, reference) {
            var before = void 0;
            if (reference === null) {
                before = this._tail;
                this._tail = end;
            } else {
                before = reference.prev;
                end.next = reference;
                reference.prev = end;
            }
            if (before) {
                before.next = start;
                start.prev = before;
            }
        };

        LinkedList.prototype.nextNode = function (node) {
            return node.next;
        };

        LinkedList.prototype.prevNode = function (node) {
            return node.prev;
        };

        LinkedList.prototype.forEachNode = function (callback) {
            var node = this._head;
            while (node !== null) {
                callback(node);
                node = node.next;
            }
        };

        LinkedList.prototype.contains = function (needle) {
            var node = this._head;
            while (node !== null) {
                if (node === needle) return true;
                node = node.next;
            }
            return false;
        };

        LinkedList.prototype.insertBefore = function (node) {
            var reference = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

            if (reference === null) return this.append(node);
            if (reference.prev) reference.prev.next = node;else this._head = node;
            node.prev = reference.prev;
            node.next = reference;
            reference.prev = node;
            return node;
        };

        LinkedList.prototype.append = function (node) {
            var tail = this._tail;
            if (tail) {
                tail.next = node;
                node.prev = tail;
                node.next = null;
            } else {
                this._head = node;
            }
            return this._tail = node;
        };

        LinkedList.prototype.pop = function () {
            if (this._tail) return this.remove(this._tail);
            return null;
        };

        LinkedList.prototype.prepend = function (node) {
            if (this._head) return this.insertBefore(node, this._head);
            return this._head = this._tail = node;
        };

        LinkedList.prototype.remove = function (node) {
            if (node.prev) node.prev.next = node.next;else this._head = node.next;
            if (node.next) node.next.prev = node.prev;else this._tail = node.prev;
            return node;
        };

        return LinkedList;
    }();
    var ListSlice = function () {
        function ListSlice(head, tail) {
            _classCallCheck$2(this, ListSlice);

            this._head = head;
            this._tail = tail;
        }

        ListSlice.toList = function (slice) {
            var list = new LinkedList();
            slice.forEachNode(function (n) {
                return list.append(n.clone());
            });
            return list;
        };

        ListSlice.prototype.forEachNode = function (callback) {
            var node = this._head;
            while (node !== null) {
                callback(node);
                node = this.nextNode(node);
            }
        };

        ListSlice.prototype.contains = function (needle) {
            var node = this._head;
            while (node !== null) {
                if (node === needle) return true;
                node = node.next;
            }
            return false;
        };

        ListSlice.prototype.head = function () {
            return this._head;
        };

        ListSlice.prototype.tail = function () {
            return this._tail;
        };

        ListSlice.prototype.toArray = function () {
            var out = [];
            this.forEachNode(function (n) {
                return out.push(n);
            });
            return out;
        };

        ListSlice.prototype.nextNode = function (node) {
            if (node === this._tail) return null;
            return node.next;
        };

        ListSlice.prototype.prevNode = function (node) {
            if (node === this._head) return null;
            return node.prev;
        };

        ListSlice.prototype.isEmpty = function () {
            return false;
        };

        return ListSlice;
    }();
    var EMPTY_SLICE = new ListSlice(null, null);

    var HAS_NATIVE_WEAKMAP = function () {
        // detect if `WeakMap` is even present
        var hasWeakMap = typeof WeakMap === 'function';
        if (!hasWeakMap) {
            return false;
        }
        var instance = new WeakMap();
        // use `Object`'s `.toString` directly to prevent us from detecting
        // polyfills as native weakmaps
        return Object.prototype.toString.call(instance) === '[object WeakMap]';
    }();

    var HAS_TYPED_ARRAYS = typeof Uint32Array !== 'undefined';
    var A = void 0;
    if (HAS_TYPED_ARRAYS) {
        A = Uint32Array;
    } else {
        A = Array;
    }
    var A$1 = A;
    var EMPTY_ARRAY = HAS_NATIVE_WEAKMAP ? Object.freeze([]) : [];

    exports.getAttrNamespace = function (attrName) {
        return WHITELIST[attrName] || null;
    };
    exports.assert = function (test, msg) {
        // if (!alreadyWarned) {
        //   alreadyWarned = true;
        //   Logger.warn("Don't leave debug assertions on in public builds");
        // }
        if (!test) {
            throw new Error(msg || "assertion failure");
        }
    };
    exports.LOGGER = logger;
    exports.Logger = Logger;
    exports.LogLevel = LogLevel;
    exports.assign = function (obj) {
        var i, assignment, keys, j, key;

        for (i = 1; i < arguments.length; i++) {
            assignment = arguments[i];

            if (assignment === null || typeof assignment !== 'object') continue;
            keys = objKeys(assignment);

            for (j = 0; j < keys.length; j++) {
                key = keys[j];

                obj[key] = assignment[key];
            }
        }
        return obj;
    };
    exports.fillNulls = function (count) {
        var arr = new Array(count),
            i;
        for (i = 0; i < count; i++) {
            arr[i] = null;
        }
        return arr;
    };
    exports.ensureGuid = ensureGuid;
    exports.initializeGuid = initializeGuid;
    exports.Stack = Stack;
    exports.DictSet = DictSet;
    exports.dict = dict;
    exports.EMPTY_SLICE = EMPTY_SLICE;
    exports.LinkedList = LinkedList;
    exports.ListNode = function ListNode(value) {
        _classCallCheck$2(this, ListNode);

        this.next = null;
        this.prev = null;
        this.value = value;
    };
    exports.ListSlice = ListSlice;
    exports.A = A$1;
    exports.EMPTY_ARRAY = EMPTY_ARRAY;
    exports.HAS_NATIVE_WEAKMAP = HAS_NATIVE_WEAKMAP;
    exports.unwrap = function (val) {
        if (val === null || val === undefined) throw new Error('Expected value to be present');
        return val;
    };
    exports.expect = function (val, message) {
        if (val === null || val === undefined) throw new Error(message);
        return val;
    };
    exports.unreachable = function () {
        return new Error('unreachable');
    };
    exports.typePos = function (lastOperand) {
        return lastOperand - 4;
    };
});
enifed("@glimmer/wire-format", ["exports"], function (exports) {
    "use strict";

    var Opcodes;
    (function (Opcodes) {
        // Statements
        Opcodes[Opcodes["Text"] = 0] = "Text";
        Opcodes[Opcodes["Append"] = 1] = "Append";
        Opcodes[Opcodes["Comment"] = 2] = "Comment";
        Opcodes[Opcodes["Modifier"] = 3] = "Modifier";
        Opcodes[Opcodes["Block"] = 4] = "Block";
        Opcodes[Opcodes["Component"] = 5] = "Component";
        Opcodes[Opcodes["OpenElement"] = 6] = "OpenElement";
        Opcodes[Opcodes["FlushElement"] = 7] = "FlushElement";
        Opcodes[Opcodes["CloseElement"] = 8] = "CloseElement";
        Opcodes[Opcodes["StaticAttr"] = 9] = "StaticAttr";
        Opcodes[Opcodes["DynamicAttr"] = 10] = "DynamicAttr";
        Opcodes[Opcodes["Yield"] = 11] = "Yield";
        Opcodes[Opcodes["Partial"] = 12] = "Partial";
        Opcodes[Opcodes["DynamicArg"] = 13] = "DynamicArg";
        Opcodes[Opcodes["StaticArg"] = 14] = "StaticArg";
        Opcodes[Opcodes["TrustingAttr"] = 15] = "TrustingAttr";
        Opcodes[Opcodes["Debugger"] = 16] = "Debugger";
        Opcodes[Opcodes["ClientSideStatement"] = 17] = "ClientSideStatement";
        // Expressions
        Opcodes[Opcodes["Unknown"] = 18] = "Unknown";
        Opcodes[Opcodes["Get"] = 19] = "Get";
        Opcodes[Opcodes["MaybeLocal"] = 20] = "MaybeLocal";
        Opcodes[Opcodes["FixThisBeforeWeMerge"] = 21] = "FixThisBeforeWeMerge";
        Opcodes[Opcodes["HasBlock"] = 22] = "HasBlock";
        Opcodes[Opcodes["HasBlockParams"] = 23] = "HasBlockParams";
        Opcodes[Opcodes["Undefined"] = 24] = "Undefined";
        Opcodes[Opcodes["Helper"] = 25] = "Helper";
        Opcodes[Opcodes["Concat"] = 26] = "Concat";
        Opcodes[Opcodes["ClientSideExpression"] = 27] = "ClientSideExpression";
    })(Opcodes || (exports.Ops = Opcodes = {}));

    function is(variant) {
        return function (value) {
            return Array.isArray(value) && value[0] === variant;
        };
    }
    var Expressions;
    (function (Expressions) {
        Expressions.isUnknown = is(Opcodes.Unknown);
        Expressions.isGet = is(Opcodes.Get);
        Expressions.isConcat = is(Opcodes.Concat);
        Expressions.isHelper = is(Opcodes.Helper);
        Expressions.isHasBlock = is(Opcodes.HasBlock);
        Expressions.isHasBlockParams = is(Opcodes.HasBlockParams);
        Expressions.isUndefined = is(Opcodes.Undefined);
        Expressions.isClientSide = is(Opcodes.ClientSideExpression);
        Expressions.isMaybeLocal = is(Opcodes.MaybeLocal);

        Expressions.isPrimitiveValue = function (value) {
            if (value === null) {
                return true;
            }
            return typeof value !== 'object';
        };
    })(Expressions || (exports.Expressions = Expressions = {}));
    var Statements;
    (function (Statements) {
        Statements.isText = is(Opcodes.Text);
        Statements.isAppend = is(Opcodes.Append);
        Statements.isComment = is(Opcodes.Comment);
        Statements.isModifier = is(Opcodes.Modifier);
        Statements.isBlock = is(Opcodes.Block);
        Statements.isComponent = is(Opcodes.Component);
        Statements.isOpenElement = is(Opcodes.OpenElement);
        Statements.isFlushElement = is(Opcodes.FlushElement);
        Statements.isCloseElement = is(Opcodes.CloseElement);
        Statements.isStaticAttr = is(Opcodes.StaticAttr);
        Statements.isDynamicAttr = is(Opcodes.DynamicAttr);
        Statements.isYield = is(Opcodes.Yield);
        Statements.isPartial = is(Opcodes.Partial);
        Statements.isDynamicArg = is(Opcodes.DynamicArg);
        Statements.isStaticArg = is(Opcodes.StaticArg);
        Statements.isTrustingAttr = is(Opcodes.TrustingAttr);
        Statements.isDebugger = is(Opcodes.Debugger);
        Statements.isClientSide = is(Opcodes.ClientSideStatement);
        function isAttribute(val) {
            return val[0] === Opcodes.StaticAttr || val[0] === Opcodes.DynamicAttr || val[0] === Opcodes.TrustingAttr;
        }
        Statements.isAttribute = isAttribute;
        function isArgument(val) {
            return val[0] === Opcodes.StaticArg || val[0] === Opcodes.DynamicArg;
        }
        Statements.isArgument = isArgument;

        Statements.isParameter = function (val) {
            return isAttribute(val) || isArgument(val);
        };

        Statements.getParameterName = function (s) {
            return s[1];
        };
    })(Statements || (exports.Statements = Statements = {}));

    exports.is = is;
    exports.Expressions = Expressions;
    exports.Statements = Statements;
    exports.Ops = Opcodes;
});
enifed('backburner', ['exports'], function (exports) {
    'use strict';

    var NUMBER = /\d+/;
    function isString(suspect) {
        return typeof suspect === 'string';
    }
    function isFunction(suspect) {
        return typeof suspect === 'function';
    }
    function isNumber(suspect) {
        return typeof suspect === 'number';
    }
    function isCoercableNumber(suspect) {
        return isNumber(suspect) && suspect === suspect || NUMBER.test(suspect);
    }
    function noSuchQueue(name) {
        throw new Error('You attempted to schedule an action in a queue (' + name + ') that doesn\'t exist');
    }
    function noSuchMethod(name) {
        throw new Error('You attempted to schedule an action in a queue (' + name + ') for a method that doesn\'t exist');
    }
    function getOnError(options) {
        return options.onError || options.onErrorTarget && options.onErrorTarget[options.onErrorMethod];
    }
    function findItem(target, method, collection) {
        var index = -1,
            i,
            l;
        for (i = 0, l = collection.length; i < l; i += 4) {
            if (collection[i] === target && collection[i + 1] === method) {
                index = i;
                break;
            }
        }
        return index;
    }
    function findTimer(timer, collection) {
        var index = -1,
            i;
        for (i = 3; i < collection.length; i += 4) {
            if (collection[i] === timer) {
                index = i - 3;
                break;
            }
        }
        return index;
    }

    function binarySearch(time, timers) {
        var start = 0;
        var end = timers.length - 2;
        var middle = void 0;
        var l = void 0;
        while (start < end) {
            // since timers is an array of pairs 'l' will always
            // be an integer
            l = (end - start) / 2;
            // compensate for the index in case even number
            // of pairs inside timers
            middle = start + l - l % 2;
            if (time >= timers[middle]) {
                start = middle + 2;
            } else {
                end = middle;
            }
        }
        return time >= timers[start] ? start + 2 : start;
    }

    var Queue = function () {
        function Queue(name) {
            var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
            var globalOptions = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};


            this._queueBeingFlushed = [];
            this.targetQueues = Object.create(null);
            this.index = 0;
            this._queue = [];
            this.name = name;
            this.options = options;
            this.globalOptions = globalOptions;
        }

        Queue.prototype.push = function (target, method, args, stack) {
            this._queue.push(target, method, args, stack);
            return {
                queue: this,
                target: target,
                method: method
            };
        };

        Queue.prototype.pushUnique = function (target, method, args, stack) {
            var guid = this.guidForTarget(target);
            if (guid) {
                this.pushUniqueWithGuid(guid, target, method, args, stack);
            } else {
                this.pushUniqueWithoutGuid(target, method, args, stack);
            }
            return {
                queue: this,
                target: target,
                method: method
            };
        };

        Queue.prototype.flush = function (sync) {
            var _options = this.options,
                before = _options.before,
                after = _options.after,
                onError,
                i;

            var target = void 0;
            var method = void 0;
            var args = void 0;
            var errorRecordedForStack = void 0;
            this.targetQueues = Object.create(null);
            if (this._queueBeingFlushed.length === 0) {
                this._queueBeingFlushed = this._queue;
                this._queue = [];
            }
            if (before !== undefined) {
                before();
            }
            var invoke = void 0;
            var queueItems = this._queueBeingFlushed;
            if (queueItems.length > 0) {
                onError = getOnError(this.globalOptions);

                invoke = onError ? this.invokeWithOnError : this.invoke;
                for (i = this.index; i < queueItems.length; i += 4) {
                    this.index += 4;
                    method = queueItems[i + 1];
                    // method could have been nullified / canceled during flush
                    if (method !== null) {
                        //
                        //    ** Attention intrepid developer **
                        //
                        //    To find out the stack of this task when it was scheduled onto
                        //    the run loop, add the following to your app.js:
                        //
                        //    Ember.run.backburner.DEBUG = true; // NOTE: This slows your app, don't leave it on in production.
                        //
                        //    Once that is in place, when you are at a breakpoint and navigate
                        //    here in the stack explorer, you can look at `errorRecordedForStack.stack`,
                        //    which will be the captured stack when this job was scheduled.
                        //
                        //    One possible long-term solution is the following Chrome issue:
                        //       https://bugs.chromium.org/p/chromium/issues/detail?id=332624
                        //
                        target = queueItems[i];
                        args = queueItems[i + 2];
                        errorRecordedForStack = queueItems[i + 3]; // Debugging assistance
                        invoke(target, method, args, onError, errorRecordedForStack);
                    }
                    if (this.index !== this._queueBeingFlushed.length && this.globalOptions.mustYield && this.globalOptions.mustYield()) {
                        return 1 /* Pause */;
                    }
                }
            }
            if (after !== undefined) {
                after();
            }
            this._queueBeingFlushed.length = 0;
            this.index = 0;
            if (sync !== false && this._queue.length > 0) {
                // check if new items have been added
                this.flush(true);
            }
        };

        Queue.prototype.hasWork = function () {
            return this._queueBeingFlushed.length > 0 || this._queue.length > 0;
        };

        Queue.prototype.cancel = function (_ref) {
            var target = _ref.target,
                method = _ref.method,
                t,
                i,
                l;

            var queue = this._queue;
            var guid = this.guidForTarget(target);
            var targetQueue = guid ? this.targetQueues[guid] : undefined;
            if (targetQueue !== undefined) {
                t = void 0;

                for (i = 0, l = targetQueue.length; i < l; i += 2) {
                    t = targetQueue[i];
                    if (t === method) {
                        targetQueue.splice(i, 2);
                        break;
                    }
                }
            }
            var index = findItem(target, method, queue);
            if (index > -1) {
                queue.splice(index, 4);
                return true;
            }
            // if not found in current queue
            // could be in the queue that is being flushed
            queue = this._queueBeingFlushed;
            index = findItem(target, method, queue);
            if (index > -1) {
                queue[index + 1] = null;
                return true;
            }
            return false;
        };

        Queue.prototype.guidForTarget = function (target) {
            if (!target) {
                return;
            }
            var peekGuid = this.globalOptions.peekGuid;
            if (peekGuid) {
                return peekGuid(target);
            }
            var KEY = this.globalOptions.GUID_KEY;
            if (KEY) {
                return target[KEY];
            }
        };

        Queue.prototype.pushUniqueWithoutGuid = function (target, method, args, stack) {
            var queue = this._queue;
            var index = findItem(target, method, queue);
            if (index > -1) {
                queue[index + 2] = args; // replace args
                queue[index + 3] = stack; // replace stack
            } else {
                queue.push(target, method, args, stack);
            }
        };

        Queue.prototype.targetQueue = function (_targetQueue, target, method, args, stack) {
            var queue = this._queue,
                i,
                l,
                currentMethod,
                currentIndex;
            for (i = 0, l = _targetQueue.length; i < l; i += 2) {
                currentMethod = _targetQueue[i];

                if (currentMethod === method) {
                    currentIndex = _targetQueue[i + 1];

                    queue[currentIndex + 2] = args; // replace args
                    queue[currentIndex + 3] = stack; // replace stack
                    return;
                }
            }
            _targetQueue.push(method, queue.push(target, method, args, stack) - 4);
        };

        Queue.prototype.pushUniqueWithGuid = function (guid, target, method, args, stack) {
            var localQueue = this.targetQueues[guid];
            if (localQueue !== undefined) {
                this.targetQueue(localQueue, target, method, args, stack);
            } else {
                this.targetQueues[guid] = [method, this._queue.push(target, method, args, stack) - 4];
            }
        };

        Queue.prototype.invoke = function (target, method, args /*, onError, errorRecordedForStack */) {
            if (args !== undefined) {
                method.apply(target, args);
            } else {
                method.call(target);
            }
        };

        Queue.prototype.invokeWithOnError = function (target, method, args, onError, errorRecordedForStack) {
            try {
                if (args !== undefined) {
                    method.apply(target, args);
                } else {
                    method.call(target);
                }
            } catch (error) {
                onError(error, errorRecordedForStack);
            }
        };

        return Queue;
    }();

    var DeferredActionQueues = function () {
        function DeferredActionQueues() {
            var queueNames = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
            var options = arguments[1];


            this.queues = {};
            this.queueNameIndex = 0;
            this.queueNames = queueNames;
            queueNames.reduce(function (queues, queueName) {
                queues[queueName] = new Queue(queueName, options[queueName], options);
                return queues;
            }, this.queues);
        }
        /*
          @method schedule
          @param {String} queueName
          @param {Any} target
          @param {Any} method
          @param {Any} args
          @param {Boolean} onceFlag
          @param {Any} stack
          @return queue
        */

        DeferredActionQueues.prototype.schedule = function (queueName, target, method, args, onceFlag, stack) {
            var queues = this.queues;
            var queue = queues[queueName];
            if (!queue) {
                noSuchQueue(queueName);
            }
            if (!method) {
                noSuchMethod(queueName);
            }
            if (onceFlag) {
                return queue.pushUnique(target, method, args, stack);
            } else {
                return queue.push(target, method, args, stack);
            }
        };

        DeferredActionQueues.prototype.flush = function () {
            var queue = void 0;
            var queueName = void 0;
            var numberOfQueues = this.queueNames.length;
            while (this.queueNameIndex < numberOfQueues) {
                queueName = this.queueNames[this.queueNameIndex];
                queue = this.queues[queueName];
                if (queue.hasWork() === false) {
                    this.queueNameIndex++;
                } else {
                    if (queue.flush(false /* async */) === 1 /* Pause */) {
                            return 1 /* Pause */;
                        }
                    this.queueNameIndex = 0; // only reset to first queue if non-pause break
                }
            }
        };

        return DeferredActionQueues;
    }();

    // accepts a function that when invoked will return an iterator
    // iterator will drain until completion
    var iteratorDrain = function (fn) {
        var iterator = fn();
        var result = iterator.next();
        while (result.done === false) {
            result.value();
            result = iterator.next();
        }
    };

    var noop = function () {};
    var SET_TIMEOUT = setTimeout;
    function parseArgs() {
        var length = arguments.length,
            i;
        var method = void 0;
        var target = void 0;
        var args = void 0;
        if (length === 1) {
            method = arguments[0];
            target = null;
        } else {
            target = arguments[0];
            method = arguments[1];
            if (isString(method)) {
                method = target[method];
            }
            if (length > 2) {
                args = new Array(length - 2);
                for (i = 0; i < length - 2; i++) {
                    args[i] = arguments[i + 2];
                }
            }
        }
        return [target, method, args];
    }

    var Backburner = function () {
        function Backburner(queueNames) {
            var _this = this;

            var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};


            this.DEBUG = false;
            this.currentInstance = null;
            this._timerTimeoutId = null;
            this._autorun = null;
            this.queueNames = queueNames;
            this.options = options;
            if (!this.options.defaultQueue) {
                this.options.defaultQueue = queueNames[0];
            }
            this.instanceStack = [];
            this._timers = [];
            this._debouncees = [];
            this._throttlers = [];
            this._eventCallbacks = {
                end: [],
                begin: []
            };
            this._onBegin = this.options.onBegin || noop;
            this._onEnd = this.options.onEnd || noop;
            var _platform = this.options._platform || {};
            var platform = Object.create(null);
            platform.setTimeout = _platform.setTimeout || function (fn, ms) {
                return setTimeout(fn, ms);
            };
            platform.clearTimeout = _platform.clearTimeout || function (id) {
                return clearTimeout(id);
            };
            platform.next = _platform.next || function (fn) {
                return SET_TIMEOUT(fn, 0);
            };
            platform.clearNext = _platform.clearNext || platform.clearTimeout;
            platform.now = _platform.now || function () {
                return Date.now();
            };
            this._platform = platform;
            this._boundRunExpiredTimers = function () {
                _this._runExpiredTimers();
            };
            this._boundAutorunEnd = function () {
                _this._autorun = null;
                _this.end();
            };
        }
        /*
          @method begin
          @return instantiated class DeferredActionQueues
        */

        Backburner.prototype.begin = function () {
            var options = this.options;
            var previousInstance = this.currentInstance;
            var current = void 0;
            if (this._autorun !== null) {
                current = previousInstance;
                this._cancelAutorun();
            } else {
                if (previousInstance !== null) {
                    this.instanceStack.push(previousInstance);
                }
                current = this.currentInstance = new DeferredActionQueues(this.queueNames, options);
                this._trigger('begin', current, previousInstance);
            }
            this._onBegin(current, previousInstance);
            return current;
        };

        Backburner.prototype.end = function () {
            var currentInstance = this.currentInstance,
                next;
            var nextInstance = null;
            if (currentInstance === null) {
                throw new Error('end called without begin');
            }
            // Prevent double-finally bug in Safari 6.0.2 and iOS 6
            // This bug appears to be resolved in Safari 6.0.5 and iOS 7
            var finallyAlreadyCalled = false;
            var result = void 0;
            try {
                result = currentInstance.flush();
            } finally {
                if (!finallyAlreadyCalled) {
                    finallyAlreadyCalled = true;
                    if (result === 1 /* Pause */) {
                            next = this._platform.next;

                            this._autorun = next(this._boundAutorunEnd);
                        } else {
                        this.currentInstance = null;
                        if (this.instanceStack.length > 0) {
                            nextInstance = this.instanceStack.pop();
                            this.currentInstance = nextInstance;
                        }
                        this._trigger('end', currentInstance, nextInstance);
                        this._onEnd(currentInstance, nextInstance);
                    }
                }
            }
        };

        Backburner.prototype.on = function (eventName, callback) {
            if (typeof callback !== 'function') {
                throw new TypeError('Callback must be a function');
            }
            var callbacks = this._eventCallbacks[eventName];
            if (callbacks !== undefined) {
                callbacks.push(callback);
            } else {
                throw new TypeError('Cannot on() event ' + eventName + ' because it does not exist');
            }
        };

        Backburner.prototype.off = function (eventName, callback) {
            var callbacks = this._eventCallbacks[eventName],
                i;
            if (!eventName || callbacks === undefined) {
                throw new TypeError('Cannot off() event ' + eventName + ' because it does not exist');
            }
            var callbackFound = false;
            if (callback) {
                for (i = 0; i < callbacks.length; i++) {
                    if (callbacks[i] === callback) {
                        callbackFound = true;
                        callbacks.splice(i, 1);
                        i--;
                    }
                }
            }
            if (!callbackFound) {
                throw new TypeError('Cannot off() callback that does not exist');
            }
        };

        Backburner.prototype.run = function () {
            var _parseArgs = parseArgs.apply(undefined, arguments),
                target = _parseArgs[0],
                method = _parseArgs[1],
                args = _parseArgs[2];

            return this._run(target, method, args);
        };

        Backburner.prototype.join = function () {
            var _parseArgs2 = parseArgs.apply(undefined, arguments),
                target = _parseArgs2[0],
                method = _parseArgs2[1],
                args = _parseArgs2[2];

            return this._join(target, method, args);
        };

        Backburner.prototype.defer = function () {
            return this.schedule.apply(this, arguments);
        };

        Backburner.prototype.schedule = function (queueName) {
            for (_len = arguments.length, _args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                _args[_key - 1] = arguments[_key];
            }

            var _parseArgs3 = parseArgs.apply(undefined, _args),
                target = _parseArgs3[0],
                method = _parseArgs3[1],
                args = _parseArgs3[2],
                _len,
                _args,
                _key;

            var stack = this.DEBUG ? new Error() : undefined;
            return this._ensureInstance().schedule(queueName, target, method, args, false, stack);
        };

        Backburner.prototype.scheduleIterable = function (queueName, iterable) {
            var stack = this.DEBUG ? new Error() : undefined;
            return this._ensureInstance().schedule(queueName, null, iteratorDrain, [iterable], false, stack);
        };

        Backburner.prototype.deferOnce = function () {
            return this.scheduleOnce.apply(this, arguments);
        };

        Backburner.prototype.scheduleOnce = function (queueName) {
            for (_len2 = arguments.length, _args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                _args[_key2 - 1] = arguments[_key2];
            }

            var _parseArgs4 = parseArgs.apply(undefined, _args),
                target = _parseArgs4[0],
                method = _parseArgs4[1],
                args = _parseArgs4[2],
                _len2,
                _args,
                _key2;

            var stack = this.DEBUG ? new Error() : undefined;
            return this._ensureInstance().schedule(queueName, target, method, args, true, stack);
        };

        Backburner.prototype.setTimeout = function () {
            return this.later.apply(this, arguments);
        };

        Backburner.prototype.later = function () {
            for (_len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
                args[_key3] = arguments[_key3];
            }

            var length = args.length,
                _len3,
                args,
                _key3,
                last;
            var wait = 0;
            var method = void 0;
            var target = void 0;
            var methodOrTarget = void 0;
            var methodOrWait = void 0;
            var methodOrArgs = void 0;
            if (length === 0) {
                return;
            } else if (length === 1) {
                method = args.shift();
            } else if (length === 2) {
                methodOrTarget = args[0];
                methodOrWait = args[1];
                if (isFunction(methodOrWait)) {
                    target = args.shift();
                    method = args.shift();
                } else if (methodOrTarget !== null && isString(methodOrWait) && methodOrWait in methodOrTarget) {
                    target = args.shift();
                    method = target[args.shift()];
                } else if (isCoercableNumber(methodOrWait)) {
                    method = args.shift();
                    wait = parseInt(args.shift(), 10);
                } else {
                    method = args.shift();
                }
            } else {
                last = args[args.length - 1];

                if (isCoercableNumber(last)) {
                    wait = parseInt(args.pop(), 10);
                }
                methodOrTarget = args[0];
                methodOrArgs = args[1];
                if (isFunction(methodOrArgs)) {
                    target = args.shift();
                    method = args.shift();
                } else if (methodOrTarget !== null && isString(methodOrArgs) && methodOrArgs in methodOrTarget) {
                    target = args.shift();
                    method = target[args.shift()];
                } else {
                    method = args.shift();
                }
            }
            var onError = getOnError(this.options);
            var executeAt = this._platform.now() + wait;
            var fn = void 0;
            if (onError) {
                fn = function () {
                    try {
                        method.apply(target, args);
                    } catch (e) {
                        onError(e);
                    }
                };
            } else {
                fn = function () {
                    method.apply(target, args);
                };
            }
            return this._setTimeout(fn, executeAt);
        };

        Backburner.prototype.throttle = function (targetOrThisArgOrMethod) {
            var _this2 = this,
                _len4,
                args,
                _key4;

            var target = void 0;
            var method = void 0;
            var immediate = void 0;
            var isImmediate = void 0;
            var wait = void 0;

            for (_len4 = arguments.length, args = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
                args[_key4 - 1] = arguments[_key4];
            }

            if (args.length === 1) {
                method = targetOrThisArgOrMethod;
                wait = args.pop();
                target = null;
                isImmediate = true;
            } else {
                target = targetOrThisArgOrMethod;
                method = args.shift();
                immediate = args.pop();
                if (isString(method)) {
                    method = target[method];
                } else if (!isFunction(method)) {
                    args.unshift(method);
                    method = target;
                    target = null;
                }
                if (isCoercableNumber(immediate)) {
                    wait = immediate;
                    isImmediate = true;
                } else {
                    wait = args.pop();
                    isImmediate = immediate === true;
                }
            }
            var index = findItem(target, method, this._throttlers);
            if (index > -1) {
                this._throttlers[index + 2] = args;
                return this._throttlers[index + 3];
            } // throttled
            wait = parseInt(wait, 10);
            var timer = this._platform.setTimeout(function () {
                var i = findTimer(timer, _this2._throttlers);

                var _throttlers$splice = _this2._throttlers.splice(i, 4),
                    context = _throttlers$splice[0],
                    func = _throttlers$splice[1],
                    params = _throttlers$splice[2];

                if (isImmediate === false) {
                    _this2._run(context, func, params);
                }
            }, wait);
            if (isImmediate) {
                this._join(target, method, args);
            }
            this._throttlers.push(target, method, args, timer);
            return timer;
        };

        Backburner.prototype.debounce = function (targetOrThisArgOrMethod) {
            var _this3 = this,
                _len5,
                args,
                _key5,
                timerId;

            var target = void 0;
            var method = void 0;
            var immediate = void 0;
            var isImmediate = void 0;
            var wait = void 0;

            for (_len5 = arguments.length, args = Array(_len5 > 1 ? _len5 - 1 : 0), _key5 = 1; _key5 < _len5; _key5++) {
                args[_key5 - 1] = arguments[_key5];
            }

            if (args.length === 1) {
                method = targetOrThisArgOrMethod;
                wait = args.pop();
                target = null;
                isImmediate = false;
            } else {
                target = targetOrThisArgOrMethod;
                method = args.shift();
                immediate = args.pop();
                if (isString(method)) {
                    method = target[method];
                } else if (!isFunction(method)) {
                    args.unshift(method);
                    method = target;
                    target = null;
                }
                if (isCoercableNumber(immediate)) {
                    wait = immediate;
                    isImmediate = false;
                } else {
                    wait = args.pop();
                    isImmediate = immediate === true;
                }
            }
            wait = parseInt(wait, 10);
            // Remove debouncee
            var index = findItem(target, method, this._debouncees);
            if (index > -1) {
                timerId = this._debouncees[index + 3];

                this._platform.clearTimeout(timerId);
                this._debouncees.splice(index, 4);
            }
            var timer = this._platform.setTimeout(function () {
                var i = findTimer(timer, _this3._debouncees);

                var _debouncees$splice = _this3._debouncees.splice(i, 4),
                    context = _debouncees$splice[0],
                    func = _debouncees$splice[1],
                    params = _debouncees$splice[2];

                if (isImmediate === false) {
                    _this3._run(context, func, params);
                }
            }, wait);
            if (isImmediate && index === -1) {
                this._join(target, method, args);
            }
            this._debouncees.push(target, method, args, timer);
            return timer;
        };

        Backburner.prototype.cancelTimers = function () {
            var i, t;

            for (i = 3; i < this._throttlers.length; i += 4) {
                this._platform.clearTimeout(this._throttlers[i]);
            }
            this._throttlers = [];
            for (t = 3; t < this._debouncees.length; t += 4) {
                this._platform.clearTimeout(this._debouncees[t]);
            }
            this._debouncees = [];
            this._clearTimerTimeout();
            this._timers = [];
            this._cancelAutorun();
        };

        Backburner.prototype.hasTimers = function () {
            return this._timers.length > 0 || this._debouncees.length > 0 || this._throttlers.length > 0 || this._autorun !== null;
        };

        Backburner.prototype.cancel = function (timer) {
            if (!timer) {
                return false;
            }
            var timerType = typeof timer;
            if (timerType === 'number' || timerType === 'string') {
                return this._cancelItem(timer, this._throttlers) || this._cancelItem(timer, this._debouncees);
            } else if (timerType === 'function') {
                return this._cancelLaterTimer(timer);
            } else if (timerType === 'object' && timer.queue && timer.method) {
                return timer.queue.cancel(timer);
            }
            return false;
        };

        Backburner.prototype.ensureInstance = function () {
            this._ensureInstance();
        };

        Backburner.prototype._join = function (target, method, args) {
            if (this.currentInstance === null) {
                return this._run(target, method, args);
            }
            if (target === undefined && args === undefined) {
                return method();
            } else {
                return method.apply(target, args);
            }
        };

        Backburner.prototype._run = function (target, method, args) {
            var onError = getOnError(this.options);
            this.begin();
            if (onError) {
                try {
                    return method.apply(target, args);
                } catch (error) {
                    onError(error);
                } finally {
                    this.end();
                }
            } else {
                try {
                    return method.apply(target, args);
                } finally {
                    this.end();
                }
            }
        };

        Backburner.prototype._cancelAutorun = function () {
            if (this._autorun !== null) {
                this._platform.clearNext(this._autorun);
                this._autorun = null;
            }
        };

        Backburner.prototype._setTimeout = function (fn, executeAt) {
            if (this._timers.length === 0) {
                this._timers.push(executeAt, fn);
                this._installTimerTimeout();
                return fn;
            }
            // find position to insert
            var i = binarySearch(executeAt, this._timers);
            this._timers.splice(i, 0, executeAt, fn);
            // we should be the new earliest timer if i == 0
            if (i === 0) {
                this._reinstallTimerTimeout();
            }
            return fn;
        };

        Backburner.prototype._cancelLaterTimer = function (timer) {
            var i;

            for (i = 1; i < this._timers.length; i += 2) {
                if (this._timers[i] === timer) {
                    i = i - 1;
                    this._timers.splice(i, 2); // remove the two elements
                    if (i === 0) {
                        this._reinstallTimerTimeout();
                    }
                    return true;
                }
            }
            return false;
        };

        Backburner.prototype._cancelItem = function (timer, array) {
            var index = findTimer(timer, array);
            if (index > -1) {
                this._platform.clearTimeout(timer);
                array.splice(index, 4);
                return true;
            }
            return false;
        };

        Backburner.prototype._trigger = function (eventName, arg1, arg2) {
            var callbacks = this._eventCallbacks[eventName],
                i;
            if (callbacks !== undefined) {
                for (i = 0; i < callbacks.length; i++) {
                    callbacks[i](arg1, arg2);
                }
            }
        };

        Backburner.prototype._runExpiredTimers = function () {
            this._timerTimeoutId = null;
            if (this._timers.length === 0) {
                return;
            }
            this.begin();
            this._scheduleExpiredTimers();
            this.end();
        };

        Backburner.prototype._scheduleExpiredTimers = function () {
            var timers = this._timers,
                executeAt,
                fn;
            var l = timers.length;
            var i = 0;
            var defaultQueue = this.options.defaultQueue;
            var n = this._platform.now();
            for (; i < l; i += 2) {
                executeAt = timers[i];

                if (executeAt <= n) {
                    fn = timers[i + 1];

                    this.schedule(defaultQueue, null, fn);
                } else {
                    break;
                }
            }
            timers.splice(0, i);
            this._installTimerTimeout();
        };

        Backburner.prototype._reinstallTimerTimeout = function () {
            this._clearTimerTimeout();
            this._installTimerTimeout();
        };

        Backburner.prototype._clearTimerTimeout = function () {
            if (this._timerTimeoutId === null) {
                return;
            }
            this._platform.clearTimeout(this._timerTimeoutId);
            this._timerTimeoutId = null;
        };

        Backburner.prototype._installTimerTimeout = function () {
            if (this._timers.length === 0) {
                return;
            }
            var minExpiresAt = this._timers[0];
            var n = this._platform.now();
            var wait = Math.max(0, minExpiresAt - n);
            this._timerTimeoutId = this._platform.setTimeout(this._boundRunExpiredTimers, wait);
        };

        Backburner.prototype._ensureInstance = function () {
            var currentInstance = this.currentInstance,
                next;
            if (currentInstance === null) {
                currentInstance = this.begin();
                next = this._platform.next;

                this._autorun = next(this._boundAutorunEnd);
            }
            return currentInstance;
        };

        return Backburner;
    }();

    Backburner.Queue = Queue;

    exports.default = Backburner;
});
enifed('container', ['exports', 'ember-utils', 'ember-debug', 'ember/features'], function (exports, _emberUtils, _emberDebug, _features) {
  'use strict';

  exports.Container = exports.privatize = exports.Registry = undefined;

  /* globals Proxy */
  var CONTAINER_OVERRIDE = (0, _emberUtils.symbol)('CONTAINER_OVERRIDE');

  /**
   A container used to instantiate and cache objects.
  
   Every `Container` must be associated with a `Registry`, which is referenced
   to determine the factory and options that should be used to instantiate
   objects.
  
   The public API for `Container` is still in flux and should not be considered
   stable.
  
   @private
   @class Container
   */

  var Container = function () {
    function Container(registry) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};


      this.registry = registry;
      this.owner = options.owner || null;
      this.cache = (0, _emberUtils.dictionary)(options.cache || null);
      this.factoryManagerCache = (0, _emberUtils.dictionary)(options.factoryManagerCache || null);
      this[CONTAINER_OVERRIDE] = undefined;
      this.isDestroyed = false;

      this.validationCache = (0, _emberUtils.dictionary)(options.validationCache || null);
    }

    /**
     @private
     @property registry
     @type Registry
     @since 1.11.0
     */

    /**
     @private
     @property cache
     @type InheritingDict
     */

    /**
     @private
     @property validationCache
     @type InheritingDict
     */

    /**
     Given a fullName return a corresponding instance.
      The default behavior is for lookup to return a singleton instance.
     The singleton is scoped to the container, allowing multiple containers
     to all have their own locally scoped singletons.
      ```javascript
     let registry = new Registry();
     let container = registry.container();
      registry.register('api:twitter', Twitter);
      let twitter = container.lookup('api:twitter');
      twitter instanceof Twitter; // => true
      // by default the container will return singletons
     let twitter2 = container.lookup('api:twitter');
     twitter2 instanceof Twitter; // => true
      twitter === twitter2; //=> true
     ```
      If singletons are not wanted, an optional flag can be provided at lookup.
      ```javascript
     let registry = new Registry();
     let container = registry.container();
      registry.register('api:twitter', Twitter);
      let twitter = container.lookup('api:twitter', { singleton: false });
     let twitter2 = container.lookup('api:twitter', { singleton: false });
      twitter === twitter2; //=> false
     ```
      @private
     @method lookup
     @param {String} fullName
     @param {Object} [options]
     @param {String} [options.source] The fullname of the request source (used for local lookup)
     @return {any}
     */

    Container.prototype.lookup = function (fullName, options) {
      true && !this.registry.isValidFullName(fullName) && (0, _emberDebug.assert)('fullName must be a proper full name', this.registry.isValidFullName(fullName));

      return _lookup(this, this.registry.normalize(fullName), options);
    };

    Container.prototype.destroy = function () {
      destroyDestroyables(this);
      this.isDestroyed = true;
    };

    Container.prototype.reset = function (fullName) {
      if (fullName === undefined) {
        resetCache(this);
      } else {
        resetMember(this, this.registry.normalize(fullName));
      }
    };

    Container.prototype.ownerInjection = function () {
      var _ref;

      return _ref = {}, _ref[_emberUtils.OWNER] = this.owner, _ref;
    };

    Container.prototype._resolverCacheKey = function (name, options) {
      return this.registry.resolverCacheKey(name, options);
    };

    Container.prototype.factoryFor = function (fullName) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          expandedFullName;

      var normalizedName = this.registry.normalize(fullName);

      true && !this.registry.isValidFullName(normalizedName) && (0, _emberDebug.assert)('fullName must be a proper full name', this.registry.isValidFullName(normalizedName));

      if (options.source) {
        expandedFullName = this.registry.expandLocalLookup(fullName, options);
        // if expandLocalLookup returns falsey, we do not support local lookup

        if (!_features.EMBER_MODULE_UNIFICATION) {
          if (!expandedFullName) {
            return;
          }

          normalizedName = expandedFullName;
        } else if (expandedFullName) {
          // with ember-module-unification, if expandLocalLookup returns something,
          // pass it to the resolve without the source
          normalizedName = expandedFullName;
          options = {};
        }
      }

      var cacheKey = this._resolverCacheKey(normalizedName, options);
      var cached = this.factoryManagerCache[cacheKey];

      if (cached !== undefined) {
        return cached;
      }

      var factory = _features.EMBER_MODULE_UNIFICATION ? this.registry.resolve(normalizedName, options) : this.registry.resolve(normalizedName);

      if (factory === undefined) {
        return;
      }

      if (true && factory && typeof factory._onLookup === 'function') {
        factory._onLookup(fullName);
      }

      var manager = new FactoryManager(this, factory, fullName, normalizedName);

      manager = wrapManagerInDeprecationProxy(manager);


      this.factoryManagerCache[cacheKey] = manager;
      return manager;
    };

    return Container;
  }();

  /*
   * Wrap a factory manager in a proxy which will not permit properties to be
   * set on the manager.
   */
  function wrapManagerInDeprecationProxy(manager) {
    var validator, m, proxiedManager;

    if (_emberUtils.HAS_NATIVE_PROXY) {
      validator = {
        set: function (obj, prop) {
          throw new Error('You attempted to set "' + prop + '" on a factory manager created by container#factoryFor. A factory manager is a read-only construct.');
        }
      };

      // Note:
      // We have to proxy access to the manager here so that private property
      // access doesn't cause the above errors to occur.

      m = manager;
      proxiedManager = {
        class: m.class,
        create: function (props) {
          return m.create(props);
        }
      };


      return new Proxy(proxiedManager, validator);
    }

    return manager;
  }

  function isSingleton(container, fullName) {
    return container.registry.getOption(fullName, 'singleton') !== false;
  }

  function isInstantiatable(container, fullName) {
    return container.registry.getOption(fullName, 'instantiate') !== false;
  }

  function _lookup(container, fullName) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
        expandedFullName,
        cacheKey,
        cached;

    if (options.source) {
      expandedFullName = container.registry.expandLocalLookup(fullName, options);


      if (!_features.EMBER_MODULE_UNIFICATION) {
        // if expandLocalLookup returns falsey, we do not support local lookup
        if (!expandedFullName) {
          return;
        }

        fullName = expandedFullName;
      } else if (expandedFullName) {
        // with ember-module-unification, if expandLocalLookup returns something,
        // pass it to the resolve without the source
        fullName = expandedFullName;
        options = {};
      }
    }

    if (options.singleton !== false) {
      cacheKey = container._resolverCacheKey(fullName, options);
      cached = container.cache[cacheKey];

      if (cached !== undefined) {
        return cached;
      }
    }

    return instantiateFactory(container, fullName, options);
  }

  function isSingletonClass(container, fullName, _ref2) {
    var instantiate = _ref2.instantiate,
        singleton = _ref2.singleton;

    return singleton !== false && !instantiate && isSingleton(container, fullName) && !isInstantiatable(container, fullName);
  }

  function isSingletonInstance(container, fullName, _ref3) {
    var instantiate = _ref3.instantiate,
        singleton = _ref3.singleton;

    return singleton !== false && instantiate !== false && isSingleton(container, fullName) && isInstantiatable(container, fullName);
  }

  function isFactoryClass(container, fullname, _ref4) {
    var instantiate = _ref4.instantiate,
        singleton = _ref4.singleton;

    return instantiate === false && (singleton === false || !isSingleton(container, fullname)) && !isInstantiatable(container, fullname);
  }

  function isFactoryInstance(container, fullName, _ref5) {
    var instantiate = _ref5.instantiate,
        singleton = _ref5.singleton;

    return instantiate !== false && (singleton !== false || isSingleton(container, fullName)) && isInstantiatable(container, fullName);
  }

  function instantiateFactory(container, fullName, options) {
    var factoryManager = _features.EMBER_MODULE_UNIFICATION && options && options.source ? container.factoryFor(fullName, options) : container.factoryFor(fullName),
        cacheKey;

    if (factoryManager === undefined) {
      return;
    }

    // SomeClass { singleton: true, instantiate: true } | { singleton: true } | { instantiate: true } | {}
    // By default majority of objects fall into this case
    if (isSingletonInstance(container, fullName, options)) {
      cacheKey = container._resolverCacheKey(fullName, options);

      return container.cache[cacheKey] = factoryManager.create();
    }

    // SomeClass { singleton: false, instantiate: true }
    if (isFactoryInstance(container, fullName, options)) {
      return factoryManager.create();
    }

    // SomeClass { singleton: true, instantiate: false } | { instantiate: false } | { singleton: false, instantiation: false }
    if (isSingletonClass(container, fullName, options) || isFactoryClass(container, fullName, options)) {
      return factoryManager.class;
    }

    throw new Error('Could not create factory');
  }

  function buildInjections(container, injections) {
    var hash = {},
        injection,
        i;
    var isDynamic = false;

    if (injections.length > 0) {
      container.registry.validateInjections(injections);
      injection = void 0;

      for (i = 0; i < injections.length; i++) {
        injection = injections[i];
        hash[injection.property] = _lookup(container, injection.fullName);
        if (!isDynamic) {
          isDynamic = !isSingleton(container, injection.fullName);
        }
      }
    }

    return { injections: hash, isDynamic: isDynamic };
  }

  function injectionsFor(container, fullName) {
    var registry = container.registry;

    var _fullName$split = fullName.split(':'),
        type = _fullName$split[0];

    var injections = registry.getTypeInjections(type).concat(registry.getInjections(fullName));
    return buildInjections(container, injections);
  }

  function destroyDestroyables(container) {
    var cache = container.cache,
        i,
        key,
        value;
    var keys = Object.keys(cache);

    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      value = cache[key];


      if (value.destroy) {
        value.destroy();
      }
    }
  }

  function resetCache(container) {
    destroyDestroyables(container);
    container.cache = (0, _emberUtils.dictionary)(null);
    container.factoryManagerCache = (0, _emberUtils.dictionary)(null);
  }

  function resetMember(container, fullName) {
    var member = container.cache[fullName];

    delete container.factoryManagerCache[fullName];

    if (member) {
      delete container.cache[fullName];

      if (member.destroy) {
        member.destroy();
      }
    }
  }

  var FactoryManager = function () {
    function FactoryManager(container, factory, fullName, normalizedName) {

      this.container = container;
      this.owner = container.owner;
      this.class = factory;
      this.fullName = fullName;
      this.normalizedName = normalizedName;
      this.madeToString = undefined;
      this.injections = undefined;
    }

    FactoryManager.prototype.toString = function () {
      if (this.madeToString === undefined) {
        this.madeToString = this.container.registry.makeToString(this.class, this.fullName);
      }

      return this.madeToString;
    };

    FactoryManager.prototype.create = function () {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
          _injectionsFor,
          injections,
          isDynamic;

      var injectionsCache = this.injections;
      if (injectionsCache === undefined) {
        _injectionsFor = injectionsFor(this.container, this.normalizedName), injections = _injectionsFor.injections, isDynamic = _injectionsFor.isDynamic;


        injectionsCache = injections;
        if (!isDynamic) {
          this.injections = injections;
        }
      }

      var props = (0, _emberUtils.assign)({}, injectionsCache, options);

      var lazyInjections = void 0;
      var validationCache = this.container.validationCache;
      // Ensure that all lazy injections are valid at instantiation time
      if (!validationCache[this.fullName] && this.class && typeof this.class._lazyInjections === 'function') {
        lazyInjections = this.class._lazyInjections();
        lazyInjections = this.container.registry.normalizeInjectionsHash(lazyInjections);

        this.container.registry.validateInjections(lazyInjections);
      }

      validationCache[this.fullName] = true;


      if (!this.class.create) {
        throw new Error('Failed to create an instance of \'' + this.normalizedName + '\'. Most likely an improperly defined class or' + ' an invalid module export.');
      }

      // required to allow access to things like
      // the customized toString, _debugContainerKey,
      // owner, etc. without a double extend and without
      // modifying the objects properties
      if (typeof this.class._initFactory === 'function') {
        this.class._initFactory(this);
      } else {
        // in the non-EmberObject case we need to still setOwner
        // this is required for supporting glimmer environment and
        // template instantiation which rely heavily on
        // `options[OWNER]` being passed into `create`
        // TODO: clean this up, and remove in future versions
        (0, _emberUtils.setOwner)(props, this.owner);
      }

      return this.class.create(props);
    };

    return FactoryManager;
  }();

  var VALID_FULL_NAME_REGEXP = /^[^:]+:[^:]+$/;

  /**
   A registry used to store factory and option information keyed
   by type.
  
   A `Registry` stores the factory and option information needed by a
   `Container` to instantiate and cache objects.
  
   The API for `Registry` is still in flux and should not be considered stable.
  
   @private
   @class Registry
   @since 1.11.0
  */

  var Registry = function () {
    function Registry() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};


      this.fallback = options.fallback || null;
      this.resolver = options.resolver || null;

      if (typeof this.resolver === 'function') {
        deprecateResolverFunction(this);
      }

      this.registrations = (0, _emberUtils.dictionary)(options.registrations || null);

      this._typeInjections = (0, _emberUtils.dictionary)(null);
      this._injections = (0, _emberUtils.dictionary)(null);

      this._localLookupCache = Object.create(null);
      this._normalizeCache = (0, _emberUtils.dictionary)(null);
      this._resolveCache = (0, _emberUtils.dictionary)(null);
      this._failCache = (0, _emberUtils.dictionary)(null);

      this._options = (0, _emberUtils.dictionary)(null);
      this._typeOptions = (0, _emberUtils.dictionary)(null);
    }

    /**
     A backup registry for resolving registrations when no matches can be found.
      @private
     @property fallback
     @type Registry
     */

    /**
     An object that has a `resolve` method that resolves a name.
      @private
     @property resolver
     @type Resolver
     */

    /**
     @private
     @property registrations
     @type InheritingDict
     */

    /**
     @private
      @property _typeInjections
     @type InheritingDict
     */

    /**
     @private
      @property _injections
     @type InheritingDict
     */

    /**
     @private
      @property _normalizeCache
     @type InheritingDict
     */

    /**
     @private
      @property _resolveCache
     @type InheritingDict
     */

    /**
     @private
      @property _options
     @type InheritingDict
     */

    /**
     @private
      @property _typeOptions
     @type InheritingDict
     */

    /**
     Creates a container based on this registry.
      @private
     @method container
     @param {Object} options
     @return {Container} created container
     */

    Registry.prototype.container = function (options) {
      return new Container(this, options);
    };

    Registry.prototype.register = function (fullName, factory) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      true && !this.isValidFullName(fullName) && (0, _emberDebug.assert)('fullName must be a proper full name', this.isValidFullName(fullName));
      true && !(factory !== undefined) && (0, _emberDebug.assert)('Attempting to register an unknown factory: \'' + fullName + '\'', factory !== undefined);

      var normalizedName = this.normalize(fullName);
      true && !!this._resolveCache[normalizedName] && (0, _emberDebug.assert)('Cannot re-register: \'' + fullName + '\', as it has already been resolved.', !this._resolveCache[normalizedName]);

      delete this._failCache[normalizedName];
      this.registrations[normalizedName] = factory;
      this._options[normalizedName] = options;
    };

    Registry.prototype.unregister = function (fullName) {
      true && !this.isValidFullName(fullName) && (0, _emberDebug.assert)('fullName must be a proper full name', this.isValidFullName(fullName));

      var normalizedName = this.normalize(fullName);

      this._localLookupCache = Object.create(null);

      delete this.registrations[normalizedName];
      delete this._resolveCache[normalizedName];
      delete this._failCache[normalizedName];
      delete this._options[normalizedName];
    };

    Registry.prototype.resolve = function (fullName, options) {
      true && !this.isValidFullName(fullName) && (0, _emberDebug.assert)('fullName must be a proper full name', this.isValidFullName(fullName));

      var factory = _resolve(this, this.normalize(fullName), options),
          _fallback;
      if (factory === undefined && this.fallback !== null) {

        factory = (_fallback = this.fallback).resolve.apply(_fallback, arguments);
      }
      return factory;
    };

    Registry.prototype.describe = function (fullName) {
      if (this.resolver !== null && this.resolver.lookupDescription) {
        return this.resolver.lookupDescription(fullName);
      } else if (this.fallback !== null) {
        return this.fallback.describe(fullName);
      } else {
        return fullName;
      }
    };

    Registry.prototype.normalizeFullName = function (fullName) {
      if (this.resolver !== null && this.resolver.normalize) {
        return this.resolver.normalize(fullName);
      } else if (this.fallback !== null) {
        return this.fallback.normalizeFullName(fullName);
      } else {
        return fullName;
      }
    };

    Registry.prototype.normalize = function (fullName) {
      return this._normalizeCache[fullName] || (this._normalizeCache[fullName] = this.normalizeFullName(fullName));
    };

    Registry.prototype.makeToString = function (factory, fullName) {
      if (this.resolver !== null && this.resolver.makeToString) {
        return this.resolver.makeToString(factory, fullName);
      } else if (this.fallback !== null) {
        return this.fallback.makeToString(factory, fullName);
      } else {
        return factory.toString();
      }
    };

    Registry.prototype.has = function (fullName, options) {
      if (!this.isValidFullName(fullName)) {
        return false;
      }

      var source = options && options.source && this.normalize(options.source);

      return _has(this, this.normalize(fullName), source);
    };

    Registry.prototype.optionsForType = function (type, options) {
      this._typeOptions[type] = options;
    };

    Registry.prototype.getOptionsForType = function (type) {
      var optionsForType = this._typeOptions[type];
      if (optionsForType === undefined && this.fallback !== null) {
        optionsForType = this.fallback.getOptionsForType(type);
      }
      return optionsForType;
    };

    Registry.prototype.options = function (fullName) {
      var _options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var normalizedName = this.normalize(fullName);
      this._options[normalizedName] = _options;
    };

    Registry.prototype.getOptions = function (fullName) {
      var normalizedName = this.normalize(fullName);
      var options = this._options[normalizedName];

      if (options === undefined && this.fallback !== null) {
        options = this.fallback.getOptions(fullName);
      }
      return options;
    };

    Registry.prototype.getOption = function (fullName, optionName) {
      var options = this._options[fullName];

      if (options && options[optionName] !== undefined) {
        return options[optionName];
      }

      var type = fullName.split(':')[0];
      options = this._typeOptions[type];

      if (options && options[optionName] !== undefined) {
        return options[optionName];
      } else if (this.fallback !== null) {
        return this.fallback.getOption(fullName, optionName);
      }
    };

    Registry.prototype.typeInjection = function (type, property, fullName) {
      true && !this.isValidFullName(fullName) && (0, _emberDebug.assert)('fullName must be a proper full name', this.isValidFullName(fullName));

      var fullNameType = fullName.split(':')[0];
      true && !(fullNameType !== type) && (0, _emberDebug.assert)('Cannot inject a \'' + fullName + '\' on other ' + type + '(s).', fullNameType !== type);

      var injections = this._typeInjections[type] || (this._typeInjections[type] = []);

      injections.push({ property: property, fullName: fullName });
    };

    Registry.prototype.injection = function (fullName, property, injectionName) {
      true && !this.isValidFullName(injectionName) && (0, _emberDebug.assert)('Invalid injectionName, expected: \'type:name\' got: ' + injectionName, this.isValidFullName(injectionName));

      var normalizedInjectionName = this.normalize(injectionName);

      if (fullName.indexOf(':') === -1) {
        return this.typeInjection(fullName, property, normalizedInjectionName);
      }

      true && !this.isValidFullName(fullName) && (0, _emberDebug.assert)('fullName must be a proper full name', this.isValidFullName(fullName));

      var normalizedName = this.normalize(fullName);

      var injections = this._injections[normalizedName] || (this._injections[normalizedName] = []);

      injections.push({ property: property, fullName: normalizedInjectionName });
    };

    Registry.prototype.knownForType = function (type) {
      var fallbackKnown = void 0,
          resolverKnown = void 0,
          index,
          fullName,
          itemType;

      var localKnown = (0, _emberUtils.dictionary)(null);
      var registeredNames = Object.keys(this.registrations);
      for (index = 0; index < registeredNames.length; index++) {
        fullName = registeredNames[index];
        itemType = fullName.split(':')[0];


        if (itemType === type) {
          localKnown[fullName] = true;
        }
      }

      if (this.fallback !== null) {
        fallbackKnown = this.fallback.knownForType(type);
      }

      if (this.resolver !== null && this.resolver.knownForType) {
        resolverKnown = this.resolver.knownForType(type);
      }

      return (0, _emberUtils.assign)({}, fallbackKnown, localKnown, resolverKnown);
    };

    Registry.prototype.isValidFullName = function (fullName) {
      return VALID_FULL_NAME_REGEXP.test(fullName);
    };

    Registry.prototype.getInjections = function (fullName) {
      var injections = this._injections[fullName] || [];
      if (this.fallback !== null) {
        injections = injections.concat(this.fallback.getInjections(fullName));
      }
      return injections;
    };

    Registry.prototype.getTypeInjections = function (type) {
      var injections = this._typeInjections[type] || [];
      if (this.fallback !== null) {
        injections = injections.concat(this.fallback.getTypeInjections(type));
      }
      return injections;
    };

    Registry.prototype.resolverCacheKey = function (name, options) {
      if (!_features.EMBER_MODULE_UNIFICATION) {
        return name;
      }

      return options && options.source ? options.source + ':' + name : name;
    };

    Registry.prototype.expandLocalLookup = function (fullName, options) {
      var normalizedFullName, normalizedSource;

      if (this.resolver !== null && this.resolver.expandLocalLookup) {
        true && !this.isValidFullName(fullName) && (0, _emberDebug.assert)('fullName must be a proper full name', this.isValidFullName(fullName));
        true && !(options && options.source) && (0, _emberDebug.assert)('options.source must be provided to expandLocalLookup', options && options.source);
        true && !this.isValidFullName(options.source) && (0, _emberDebug.assert)('options.source must be a proper full name', this.isValidFullName(options.source));

        normalizedFullName = this.normalize(fullName);
        normalizedSource = this.normalize(options.source);


        return _expandLocalLookup(this, normalizedFullName, normalizedSource);
      } else if (this.fallback !== null) {
        return this.fallback.expandLocalLookup(fullName, options);
      } else {
        return null;
      }
    };

    return Registry;
  }();

  function deprecateResolverFunction(registry) {
    true && !false && (0, _emberDebug.deprecate)('Passing a `resolver` function into a Registry is deprecated. Please pass in a Resolver object with a `resolve` method.', false, { id: 'ember-application.registry-resolver-as-function', until: '3.0.0', url: 'https://emberjs.com/deprecations/v2.x#toc_registry-resolver-as-function' });

    registry.resolver = { resolve: registry.resolver };
  }

  Registry.prototype.normalizeInjectionsHash = function (hash) {
    var injections = [];

    for (var key in hash) {
      if (hash.hasOwnProperty(key)) {
        true && !this.isValidFullName(hash[key]) && (0, _emberDebug.assert)('Expected a proper full name, given \'' + hash[key] + '\'', this.isValidFullName(hash[key]));

        injections.push({
          property: key,
          fullName: hash[key]
        });
      }
    }

    return injections;
  };

  Registry.prototype.validateInjections = function (injections) {
    if (!injections) {
      return;
    }

    var fullName = void 0,
        i;

    for (i = 0; i < injections.length; i++) {
      fullName = injections[i].fullName;

      true && !this.has(fullName) && (0, _emberDebug.assert)('Attempting to inject an unknown injection: \'' + fullName + '\'', this.has(fullName));
    }
  };


  function _expandLocalLookup(registry, normalizedName, normalizedSource) {
    var cache = registry._localLookupCache;
    var normalizedNameCache = cache[normalizedName];

    if (!normalizedNameCache) {
      normalizedNameCache = cache[normalizedName] = Object.create(null);
    }

    var cached = normalizedNameCache[normalizedSource];

    if (cached !== undefined) {
      return cached;
    }

    var expanded = registry.resolver.expandLocalLookup(normalizedName, normalizedSource);

    return normalizedNameCache[normalizedSource] = expanded;
  }

  function _resolve(registry, normalizedName, options) {
    if (options && options.source) {
      // when `source` is provided expand normalizedName
      // and source into the full normalizedName
      expandedNormalizedName = registry.expandLocalLookup(normalizedName, options);

      // if expandLocalLookup returns falsey, we do not support local lookup

      if (!_features.EMBER_MODULE_UNIFICATION) {
        if (!expandedNormalizedName) {
          return;
        }

        normalizedName = expandedNormalizedName;
      } else if (expandedNormalizedName) {
        // with ember-module-unification, if expandLocalLookup returns something,
        // pass it to the resolve without the source
        normalizedName = expandedNormalizedName;
        options = {};
      }
    }

    var cacheKey = registry.resolverCacheKey(normalizedName, options),
        expandedNormalizedName;
    var cached = registry._resolveCache[cacheKey];
    if (cached !== undefined) {
      return cached;
    }
    if (registry._failCache[cacheKey]) {
      return;
    }

    var resolved = void 0;

    if (registry.resolver) {
      resolved = registry.resolver.resolve(normalizedName, options && options.source);
    }

    if (resolved === undefined) {
      resolved = registry.registrations[normalizedName];
    }

    if (resolved === undefined) {
      registry._failCache[cacheKey] = true;
    } else {
      registry._resolveCache[cacheKey] = resolved;
    }

    return resolved;
  }

  function _has(registry, fullName, source) {
    return registry.resolve(fullName, { source: source }) !== undefined;
  }

  var privateNames = (0, _emberUtils.dictionary)(null);
  var privateSuffix = ('' + Math.random() + Date.now()).replace('.', '');

  /*
  Public API for the container is still in flux.
  The public API, specified on the application namespace should be considered the stable API.
  // @module container
    @private
  */

  exports.Registry = Registry;
  exports.privatize = function (_ref6) {
    var fullName = _ref6[0];

    var name = privateNames[fullName];
    if (name) {
      return name;
    }

    var _fullName$split2 = fullName.split(':'),
        type = _fullName$split2[0],
        rawName = _fullName$split2[1];

    return privateNames[fullName] = (0, _emberUtils.intern)(type + ':' + rawName + '-' + privateSuffix);
  };
  exports.Container = Container;
});
enifed('ember-babel', ['exports'], function (exports) {
  'use strict';

  exports.inherits = function (subClass, superClass) {
    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });

    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : defaults(subClass, superClass);
  };
  exports.taggedTemplateLiteralLoose = function (strings, raw) {
    strings.raw = raw;
    return strings;
  };
  exports.createClass = function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
  exports.defaults = defaults;


  function defineProperties(target, props) {
    var i, descriptor;

    for (i = 0; i < props.length; i++) {
      descriptor = props[i];

      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ('value' in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function defaults(obj, defaults) {
    var keys = Object.getOwnPropertyNames(defaults),
        i,
        key,
        value;
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      value = Object.getOwnPropertyDescriptor(defaults, key);

      if (value && value.configurable && obj[key] === undefined) {
        Object.defineProperty(obj, key, value);
      }
    }
    return obj;
  }

  exports.possibleConstructorReturn = function (self, call) {
    return call && (typeof call === 'object' || typeof call === 'function') ? call : self;
  };

  exports.slice = Array.prototype.slice;
});
enifed('ember-console', ['exports', 'ember-environment'], function (exports, _emberEnvironment) {
  'use strict';

  function K() {}

  function consoleMethod(name) {
    var consoleObj = void 0;
    if (_emberEnvironment.context.imports.console) {
      consoleObj = _emberEnvironment.context.imports.console;
    } else if (typeof console !== 'undefined') {
      // eslint-disable-line no-undef
      consoleObj = console; // eslint-disable-line no-undef
    }

    var method = typeof consoleObj === 'object' ? consoleObj[name] : null;

    if (typeof method !== 'function') {
      return;
    }

    return method.bind(consoleObj);
  }

  /**
    Inside Ember-Metal, simply uses the methods from `imports.console`.
    Override this to provide more robust logging functionality.
  
    @class Logger
    @namespace Ember
    @public
  */
  var index = {
    /**
     Logs the arguments to the console.
     You can pass as many arguments as you want and they will be joined together with a space.
       ```javascript
      var foo = 1;
      Ember.Logger.log('log value of foo:', foo);
      // "log value of foo: 1" will be printed to the console
      ```
      @method log
     @for Ember.Logger
     @param {*} arguments
     @public
    */
    log: consoleMethod('log') || K,

    /**
     Prints the arguments to the console with a warning icon.
     You can pass as many arguments as you want and they will be joined together with a space.
       ```javascript
      Ember.Logger.warn('Something happened!');
      // "Something happened!" will be printed to the console with a warning icon.
      ```
      @method warn
     @for Ember.Logger
     @param {*} arguments
     @public
    */
    warn: consoleMethod('warn') || K,

    /**
     Prints the arguments to the console with an error icon, red text and a stack trace.
     You can pass as many arguments as you want and they will be joined together with a space.
       ```javascript
      Ember.Logger.error('Danger! Danger!');
      // "Danger! Danger!" will be printed to the console in red text.
      ```
      @method error
     @for Ember.Logger
     @param {*} arguments
     @public
    */
    error: consoleMethod('error') || K,

    /**
     Logs the arguments to the console.
     You can pass as many arguments as you want and they will be joined together with a space.
       ```javascript
      var foo = 1;
      Ember.Logger.info('log value of foo:', foo);
      // "log value of foo: 1" will be printed to the console
      ```
      @method info
     @for Ember.Logger
     @param {*} arguments
     @public
    */
    info: consoleMethod('info') || K,

    /**
     Logs the arguments to the console in blue text.
     You can pass as many arguments as you want and they will be joined together with a space.
       ```javascript
      var foo = 1;
      Ember.Logger.debug('log value of foo:', foo);
      // "log value of foo: 1" will be printed to the console
      ```
      @method debug
     @for Ember.Logger
     @param {*} arguments
     @public
    */
    debug: consoleMethod('debug') || consoleMethod('info') || K,

    /**
     If the value passed into `Ember.Logger.assert` is not truthy it will throw an error with a stack trace.
       ```javascript
      Ember.Logger.assert(true); // undefined
      Ember.Logger.assert(true === false); // Throws an Assertion failed error.
      Ember.Logger.assert(true === false, 'Something invalid'); // Throws an Assertion failed error with message.
      ```
      @method assert
     @for Ember.Logger
     @param {Boolean} bool Value to test
     @param {String} message Assertion message on failed
     @public
    */
    assert: consoleMethod('assert') || function (test, message) {
      if (!test) {
        try {
          // attempt to preserve the stack
          throw new Error('assertion failed: ' + message);
        } catch (error) {
          setTimeout(function () {
            throw error;
          }, 0);
        }
      }
    }
  };

  exports.default = index;
});
enifed('ember-debug/deprecate', ['exports', 'ember-debug/error', 'ember-console', 'ember-environment', 'ember-debug/handlers'], function (exports, _error, _emberConsole, _emberEnvironment, _handlers) {
  'use strict';

  exports.missingOptionsUntilDeprecation = exports.missingOptionsIdDeprecation = exports.missingOptionsDeprecation = exports.registerHandler = undefined;

  /**
   @module @ember/debug
   @public
  */
  /**
    Allows for runtime registration of handler functions that override the default deprecation behavior.
    Deprecations are invoked by calls to [Ember.deprecate](https://emberjs.com/api/classes/Ember.html#method_deprecate).
    The following example demonstrates its usage by registering a handler that throws an error if the
    message contains the word "should", otherwise defers to the default handler.
  
    ```javascript
    Ember.Debug.registerDeprecationHandler((message, options, next) => {
      if (message.indexOf('should') !== -1) {
        throw new Error(`Deprecation message with should: ${message}`);
      } else {
        // defer to whatever handler was registered before this one
        next(message, options);
      }
    });
    ```
  
    The handler function takes the following arguments:
  
    <ul>
      <li> <code>message</code> - The message received from the deprecation call.</li>
      <li> <code>options</code> - An object passed in with the deprecation call containing additional information including:</li>
        <ul>
          <li> <code>id</code> - An id of the deprecation in the form of <code>package-name.specific-deprecation</code>.</li>
          <li> <code>until</code> - The Ember version number the feature and deprecation will be removed in.</li>
        </ul>
      <li> <code>next</code> - A function that calls into the previously registered handler.</li>
    </ul>
  
    @public
    @static
    @method registerDeprecationHandler
    @for @ember/debug
    @param handler {Function} A function to handle deprecation calls.
    @since 2.1.0
  */
  var registerHandler = function () {}; /*global __fail__*/

  var missingOptionsDeprecation = void 0,
      missingOptionsIdDeprecation = void 0,
      missingOptionsUntilDeprecation = void 0,
      deprecate = void 0;

  exports.registerHandler = registerHandler = function (handler) {
    (0, _handlers.registerHandler)('deprecate', handler);
  };

  var formatMessage = function (_message, options) {
    var message = _message;

    if (options && options.id) {
      message = message + (' [deprecation id: ' + options.id + ']');
    }

    if (options && options.url) {
      message += ' See ' + options.url + ' for more details.';
    }

    return message;
  };

  registerHandler(function (message, options) {
    var updatedMessage = formatMessage(message, options);

    _emberConsole.default.warn('DEPRECATION: ' + updatedMessage);
  });

  var captureErrorForStack = void 0;

  if (new Error().stack) {
    captureErrorForStack = function () {
      return new Error();
    };
  } else {
    captureErrorForStack = function () {
      try {
        __fail__.fail();
      } catch (e) {
        return e;
      }
    };
  }

  registerHandler(function (message, options, next) {
    var stackStr, error, stack, updatedMessage;

    if (_emberEnvironment.ENV.LOG_STACKTRACE_ON_DEPRECATION) {
      stackStr = '';
      error = captureErrorForStack();
      stack = void 0;


      if (error.stack) {
        if (error['arguments']) {
          // Chrome
          stack = error.stack.replace(/^\s+at\s+/gm, '').replace(/^([^\(]+?)([\n$])/gm, '{anonymous}($1)$2').replace(/^Object.<anonymous>\s*\(([^\)]+)\)/gm, '{anonymous}($1)').split('\n');
          stack.shift();
        } else {
          // Firefox
          stack = error.stack.replace(/(?:\n@:0)?\s+$/m, '').replace(/^\(/gm, '{anonymous}(').split('\n');
        }

        stackStr = '\n    ' + stack.slice(2).join('\n    ');
      }

      updatedMessage = formatMessage(message, options);


      _emberConsole.default.warn('DEPRECATION: ' + updatedMessage + stackStr);
    } else {
      next.apply(undefined, arguments);
    }
  });

  registerHandler(function (message, options, next) {
    var updatedMessage;

    if (_emberEnvironment.ENV.RAISE_ON_DEPRECATION) {
      updatedMessage = formatMessage(message);


      throw new _error.default(updatedMessage);
    } else {
      next.apply(undefined, arguments);
    }
  });

  exports.missingOptionsDeprecation = missingOptionsDeprecation = 'When calling `Ember.deprecate` you ' + 'must provide an `options` hash as the third parameter.  ' + '`options` should include `id` and `until` properties.';
  exports.missingOptionsIdDeprecation = missingOptionsIdDeprecation = 'When calling `Ember.deprecate` you must provide `id` in options.';
  exports.missingOptionsUntilDeprecation = missingOptionsUntilDeprecation = 'When calling `Ember.deprecate` you must provide `until` in options.';
  /**
   @module @ember/application
   @public
   */
  /**
    Display a deprecation warning with the provided message and a stack trace
    (Chrome and Firefox only).
     * In a production build, this method is defined as an empty function (NOP).
    Uses of this method in Ember itself are stripped from the ember.prod.js build.
     @method deprecate
    @for @ember/application/deprecations
    @param {String} message A description of the deprecation.
    @param {Boolean} test A boolean. If falsy, the deprecation will be displayed.
    @param {Object} options
    @param {String} options.id A unique id for this deprecation. The id can be
      used by Ember debugging tools to change the behavior (raise, log or silence)
      for that specific deprecation. The id should be namespaced by dots, e.g.
      "view.helper.select".
    @param {string} options.until The version of Ember when this deprecation
      warning will be removed.
    @param {String} [options.url] An optional url to the transition guide on the
      emberjs.com website.
    @static
    @public
    @since 1.0.0
  */
  deprecate = function deprecate(message, test, options) {
    if (!options || !options.id && !options.until) {
      deprecate(missingOptionsDeprecation, false, {
        id: 'ember-debug.deprecate-options-missing',
        until: '3.0.0',
        url: 'https://emberjs.com/deprecations/v2.x/#toc_ember-debug-function-options'
      });
    }

    if (options && !options.id) {
      deprecate(missingOptionsIdDeprecation, false, {
        id: 'ember-debug.deprecate-id-missing',
        until: '3.0.0',
        url: 'https://emberjs.com/deprecations/v2.x/#toc_ember-debug-function-options'
      });
    }

    if (options && !options.until) {
      deprecate(missingOptionsUntilDeprecation, options && options.until, {
        id: 'ember-debug.deprecate-until-missing',
        until: '3.0.0',
        url: 'https://emberjs.com/deprecations/v2.x/#toc_ember-debug-function-options'
      });
    }

    _handlers.invoke.apply(undefined, ['deprecate'].concat(Array.prototype.slice.call(arguments)));
  };


  exports.default = deprecate;
  exports.registerHandler = registerHandler;
  exports.missingOptionsDeprecation = missingOptionsDeprecation;
  exports.missingOptionsIdDeprecation = missingOptionsIdDeprecation;
  exports.missingOptionsUntilDeprecation = missingOptionsUntilDeprecation;
});
enifed("ember-debug/error", ["exports", "ember-babel"], function (exports, _emberBabel) {
  "use strict";

  /**
   @module @ember/error
  */

  /**
    A subclass of the JavaScript Error object for use in Ember.
  
    @class EmberError
    @extends Error
    @constructor
    @public
  */

  var EmberError = function (_ExtendBuiltin) {
    (0, _emberBabel.inherits)(EmberError, _ExtendBuiltin);

    function EmberError(message) {

      var _this = (0, _emberBabel.possibleConstructorReturn)(this, _ExtendBuiltin.call(this)),
          _ret;

      if (!(_this instanceof EmberError)) {

        return _ret = new EmberError(message), (0, _emberBabel.possibleConstructorReturn)(_this, _ret);
      }

      var error = Error.call(_this, message);
      _this.stack = error.stack;
      _this.description = error.description;
      _this.fileName = error.fileName;
      _this.lineNumber = error.lineNumber;
      _this.message = error.message;
      _this.name = error.name;
      _this.number = error.number;
      _this.code = error.code;
      return _this;
    }

    return EmberError;
  }(function (klass) {
    function ExtendableBuiltin() {
      klass.apply(this, arguments);
    }

    ExtendableBuiltin.prototype = Object.create(klass.prototype);
    ExtendableBuiltin.prototype.constructor = ExtendableBuiltin;
    return ExtendableBuiltin;
  }(Error));

  exports.default = EmberError;
});
enifed('ember-debug/features', ['exports', 'ember-environment', 'ember/features'], function (exports, _emberEnvironment, _features) {
  'use strict';

  exports.default =

  /**
   @module ember
  */

  /**
    The hash of enabled Canary features. Add to this, any canary features
    before creating your application.
  
    Alternatively (and recommended), you can also define `EmberENV.FEATURES`
    if you need to enable features flagged at runtime.
  
    @class FEATURES
    @namespace Ember
    @static
    @since 1.1.0
    @public
  */

  // Auto-generated

  /**
    Determine whether the specified `feature` is enabled. Used by Ember's
    build tools to exclude experimental features from beta/stable builds.
  
    You can define the following configuration options:
  
    * `EmberENV.ENABLE_OPTIONAL_FEATURES` - enable any features that have not been explicitly
      enabled/disabled.
  
    @method isEnabled
    @param {String} feature The feature to check
    @return {Boolean}
    @for Ember.FEATURES
    @since 1.1.0
    @public
  */
  function (feature) {
    var featureValue = FEATURES[feature];

    if (featureValue === true || featureValue === false || featureValue === undefined) {
      return featureValue;
    } else if (_emberEnvironment.ENV.ENABLE_OPTIONAL_FEATURES) {
      return true;
    } else {
      return false;
    }
  };
  var FEATURES = _features.FEATURES;
});
enifed('ember-debug/handlers', ['exports'], function (exports) {
  'use strict';

  var HANDLERS = exports.HANDLERS = {};

  var registerHandler = function () {};
  var invoke = function () {};

  exports.registerHandler = registerHandler = function (type, callback) {
    var nextHandler = HANDLERS[type] || function () {};

    HANDLERS[type] = function (message, options) {
      callback(message, options, nextHandler);
    };
  };

  exports.invoke = invoke = function (type, message, test, options) {
    if (test) {
      return;
    }

    var handlerForType = HANDLERS[type];

    if (handlerForType) {
      handlerForType(message, options);
    }
  };


  exports.registerHandler = registerHandler;
  exports.invoke = invoke;
});
enifed('ember-debug/index', ['exports', 'ember-debug/warn', 'ember-debug/deprecate', 'ember-debug/features', 'ember-debug/error', 'ember-debug/testing', 'ember-environment', 'ember-console', 'ember/features'], function (exports, _warn2, _deprecate2, _features, _error, _testing, _emberEnvironment, _emberConsole, _features2) {
  'use strict';

  exports._warnIfUsingStrippedFeatureFlags = exports.getDebugFunction = exports.setDebugFunction = exports.deprecateFunc = exports.runInDebug = exports.debugFreeze = exports.debugSeal = exports.deprecate = exports.debug = exports.warn = exports.info = exports.assert = exports.setTesting = exports.isTesting = exports.Error = exports.isFeatureEnabled = exports.registerDeprecationHandler = exports.registerWarnHandler = undefined;
  Object.defineProperty(exports, 'registerWarnHandler', {
    enumerable: true,
    get: function () {
      return _warn2.registerHandler;
    }
  });
  Object.defineProperty(exports, 'registerDeprecationHandler', {
    enumerable: true,
    get: function () {
      return _deprecate2.registerHandler;
    }
  });
  Object.defineProperty(exports, 'isFeatureEnabled', {
    enumerable: true,
    get: function () {
      return _features.default;
    }
  });
  Object.defineProperty(exports, 'Error', {
    enumerable: true,
    get: function () {
      return _error.default;
    }
  });
  Object.defineProperty(exports, 'isTesting', {
    enumerable: true,
    get: function () {
      return _testing.isTesting;
    }
  });
  Object.defineProperty(exports, 'setTesting', {
    enumerable: true,
    get: function () {
      return _testing.setTesting;
    }
  });
  var DEFAULT_FEATURES = _features2.DEFAULT_FEATURES,
      FEATURES = _features2.FEATURES,
      featuresWereStripped,
      isFirefox,
      isChrome;

  // These are the default production build versions:
  var noop = function () {};

  var assert = noop;
  var info = noop;
  var warn = noop;
  var debug = noop;
  var deprecate = noop;
  var debugSeal = noop;
  var debugFreeze = noop;
  var runInDebug = noop;
  var setDebugFunction = noop;
  var getDebugFunction = noop;

  var deprecateFunc = function () {
    return arguments[arguments.length - 1];
  };

  exports.setDebugFunction = setDebugFunction = function (type, callback) {
    switch (type) {
      case 'assert':
        return exports.assert = assert = callback;
      case 'info':
        return exports.info = info = callback;
      case 'warn':
        return exports.warn = warn = callback;
      case 'debug':
        return exports.debug = debug = callback;
      case 'deprecate':
        return exports.deprecate = deprecate = callback;
      case 'debugSeal':
        return exports.debugSeal = debugSeal = callback;
      case 'debugFreeze':
        return exports.debugFreeze = debugFreeze = callback;
      case 'runInDebug':
        return exports.runInDebug = runInDebug = callback;
      case 'deprecateFunc':
        return exports.deprecateFunc = deprecateFunc = callback;
    }
  };

  exports.getDebugFunction = getDebugFunction = function (type) {
    switch (type) {
      case 'assert':
        return assert;
      case 'info':
        return info;
      case 'warn':
        return warn;
      case 'debug':
        return debug;
      case 'deprecate':
        return deprecate;
      case 'debugSeal':
        return debugSeal;
      case 'debugFreeze':
        return debugFreeze;
      case 'runInDebug':
        return runInDebug;
      case 'deprecateFunc':
        return deprecateFunc;
    }
  };

  /**
  @module @ember/debug
  */

  /**
    Define an assertion that will throw an exception if the condition is not met.
     * In a production build, this method is defined as an empty function (NOP).
    Uses of this method in Ember itself are stripped from the ember.prod.js build.
     ```javascript
    import { assert } from '@ember/debug';
     // Test for truthiness
    assert('Must pass a valid object', obj);
     // Fail unconditionally
    assert('This code path should never be run');
    ```
     @method assert
    @static
    @for @ember/debug
    @param {String} desc A description of the assertion. This will become
      the text of the Error thrown if the assertion fails.
    @param {Boolean} test Must be truthy for the assertion to pass. If
      falsy, an exception will be thrown.
    @public
    @since 1.0.0
  */
  setDebugFunction('assert', function (desc, test) {
    if (!test) {
      throw new _error.default('Assertion Failed: ' + desc);
    }
  });

  /**
    Display a debug notice.
     * In a production build, this method is defined as an empty function (NOP).
    Uses of this method in Ember itself are stripped from the ember.prod.js build.
     ```javascript
    import { debug } from '@ember/debug';
     debug('I\'m a debug notice!');
    ```
     @method debug
    @for @ember/debug
    @static
    @param {String} message A debug message to display.
    @public
  */
  setDebugFunction('debug', function (message) {
    _emberConsole.default.debug('DEBUG: ' + message);
  });

  /**
    Display an info notice.
     * In a production build, this method is defined as an empty function (NOP).
    Uses of this method in Ember itself are stripped from the ember.prod.js build.
     @method info
    @private
  */
  setDebugFunction('info', function () {
    _emberConsole.default.info.apply(undefined, arguments);
  });

  /**
   @module @ember/application
   @public
  */

  /**
    Alias an old, deprecated method with its new counterpart.
     Display a deprecation warning with the provided message and a stack trace
    (Chrome and Firefox only) when the assigned method is called.
     * In a production build, this method is defined as an empty function (NOP).
     ```javascript
    Ember.oldMethod = Ember.deprecateFunc('Please use the new, updated method', Ember.newMethod);
    ```
     @method deprecateFunc
    @static
    @for @ember/application/deprecations
    @param {String} message A description of the deprecation.
    @param {Object} [options] The options object for Ember.deprecate.
    @param {Function} func The new function called to replace its deprecated counterpart.
    @return {Function} A new function that wraps the original function with a deprecation warning
    @private
  */
  setDebugFunction('deprecateFunc', function () {
    var _len, args, _key, message, options, func, _message, _func;

    for (_len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    if (args.length === 3) {
      message = args[0], options = args[1], func = args[2];


      return function () {
        deprecate(message, false, options);
        return func.apply(this, arguments);
      };
    } else {
      _message = args[0], _func = args[1];


      return function () {
        deprecate(_message);
        return _func.apply(this, arguments);
      };
    }
  });

  /**
   @module @ember/debug
   @public
  */
  /**
    Run a function meant for debugging.
     * In a production build, this method is defined as an empty function (NOP).
    Uses of this method in Ember itself are stripped from the ember.prod.js build.
     ```javascript
    import Component from '@ember/component';
    import { runInDebug } from '@ember/debug';
     runInDebug(() => {
      Component.reopen({
        didInsertElement() {
          console.log("I'm happy");
        }
      });
    });
    ```
     @method runInDebug
    @for @ember/debug
    @static
    @param {Function} func The function to be executed.
    @since 1.5.0
    @public
  */
  setDebugFunction('runInDebug', function (func) {
    func();
  });

  setDebugFunction('debugSeal', function (obj) {
    Object.seal(obj);
  });

  setDebugFunction('debugFreeze', function (obj) {
    Object.freeze(obj);
  });

  setDebugFunction('deprecate', _deprecate2.default);

  setDebugFunction('warn', _warn2.default);


  var _warnIfUsingStrippedFeatureFlags = void 0;

  if (true && !(0, _testing.isTesting)()) {
    /**
       Will call `warn()` if ENABLE_OPTIONAL_FEATURES or
       any specific FEATURES flag is truthy.
        This method is called automatically in debug canary builds.
        @private
       @method _warnIfUsingStrippedFeatureFlags
       @return {void}
    */
    exports._warnIfUsingStrippedFeatureFlags = _warnIfUsingStrippedFeatureFlags = function (FEATURES, knownFeatures, featuresWereStripped) {
      var keys, i, key;

      if (featuresWereStripped) {
        warn('Ember.ENV.ENABLE_OPTIONAL_FEATURES is only available in canary builds.', !_emberEnvironment.ENV.ENABLE_OPTIONAL_FEATURES, { id: 'ember-debug.feature-flag-with-features-stripped' });

        keys = Object.keys(FEATURES || {});

        for (i = 0; i < keys.length; i++) {
          key = keys[i];

          if (key === 'isEnabled' || !(key in knownFeatures)) {
            continue;
          }

          warn('FEATURE["' + key + '"] is set as enabled, but FEATURE flags are only available in canary builds.', !FEATURES[key], { id: 'ember-debug.feature-flag-with-features-stripped' });
        }
      }
    };

    // Complain if they're using FEATURE flags in builds other than canary
    FEATURES['features-stripped-test'] = true;
    featuresWereStripped = true;


    if ((0, _features.default)('features-stripped-test')) {
      featuresWereStripped = false;
    }

    delete FEATURES['features-stripped-test'];
    _warnIfUsingStrippedFeatureFlags(_emberEnvironment.ENV.FEATURES, DEFAULT_FEATURES, featuresWereStripped);

    // Inform the developer about the Ember Inspector if not installed.
    isFirefox = _emberEnvironment.environment.isFirefox;
    isChrome = _emberEnvironment.environment.isChrome;


    if (typeof window !== 'undefined' && (isFirefox || isChrome) && window.addEventListener) {
      window.addEventListener('load', function () {
        var downloadURL;

        if (document.documentElement && document.documentElement.dataset && !document.documentElement.dataset.emberExtension) {
          downloadURL = void 0;


          if (isChrome) {
            downloadURL = 'https://chrome.google.com/webstore/detail/ember-inspector/bmdblncegkenkacieihfhpjfppoconhi';
          } else if (isFirefox) {
            downloadURL = 'https://addons.mozilla.org/en-US/firefox/addon/ember-inspector/';
          }

          debug('For more advanced debugging, install the Ember Inspector from ' + downloadURL);
        }
      }, false);
    }
  }

  exports.assert = assert;
  exports.info = info;
  exports.warn = warn;
  exports.debug = debug;
  exports.deprecate = deprecate;
  exports.debugSeal = debugSeal;
  exports.debugFreeze = debugFreeze;
  exports.runInDebug = runInDebug;
  exports.deprecateFunc = deprecateFunc;
  exports.setDebugFunction = setDebugFunction;
  exports.getDebugFunction = getDebugFunction;
  exports._warnIfUsingStrippedFeatureFlags = _warnIfUsingStrippedFeatureFlags;
});
enifed("ember-debug/testing", ["exports"], function (exports) {
  "use strict";

  exports.isTesting = function () {
    return testing;
  };
  exports.setTesting = function (value) {
    testing = !!value;
  };
  var testing = false;
});
enifed('ember-debug/warn', ['exports', 'ember-console', 'ember-debug/deprecate', 'ember-debug/handlers'], function (exports, _emberConsole, _deprecate, _handlers) {
  'use strict';

  exports.missingOptionsDeprecation = exports.missingOptionsIdDeprecation = exports.registerHandler = undefined;

  var registerHandler = function () {};
  var warn = function () {};
  var missingOptionsDeprecation = void 0,
      missingOptionsIdDeprecation = void 0;

  /**
  @module @ember/debug
  */

  /**
    Allows for runtime registration of handler functions that override the default warning behavior.
    Warnings are invoked by calls made to [warn](https://emberjs.com/api/classes/Ember.html#method_warn).
    The following example demonstrates its usage by registering a handler that does nothing overriding Ember's
    default warning behavior.
     ```javascript
    import { registerWarnHandler } from '@ember/debug';
     // next is not called, so no warnings get the default behavior
    registerWarnHandler(() => {});
    ```
     The handler function takes the following arguments:
     <ul>
      <li> <code>message</code> - The message received from the warn call. </li>
      <li> <code>options</code> - An object passed in with the warn call containing additional information including:</li>
        <ul>
          <li> <code>id</code> - An id of the warning in the form of <code>package-name.specific-warning</code>.</li>
        </ul>
      <li> <code>next</code> - A function that calls into the previously registered handler.</li>
    </ul>
     @public
    @static
    @method registerWarnHandler
    @for @ember/debug
    @param handler {Function} A function to handle warnings.
    @since 2.1.0
  */
  exports.registerHandler = registerHandler = function (handler) {
    (0, _handlers.registerHandler)('warn', handler);
  };

  registerHandler(function (message) {
    _emberConsole.default.warn('WARNING: ' + message);
    if ('trace' in _emberConsole.default) {
      _emberConsole.default.trace();
    }
  });

  exports.missingOptionsDeprecation = missingOptionsDeprecation = 'When calling `warn` you ' + 'must provide an `options` hash as the third parameter.  ' + '`options` should include an `id` property.';
  exports.missingOptionsIdDeprecation = missingOptionsIdDeprecation = 'When calling `warn` you must provide `id` in options.';

  /**
    Display a warning with the provided message.
     * In a production build, this method is defined as an empty function (NOP).
    Uses of this method in Ember itself are stripped from the ember.prod.js build.
     @method warn
    @for @ember/debug
    @static
    @param {String} message A warning to display.
    @param {Boolean} test An optional boolean. If falsy, the warning
      will be displayed.
    @param {Object} options An object that can be used to pass a unique
      `id` for this warning.  The `id` can be used by Ember debugging tools
      to change the behavior (raise, log, or silence) for that specific warning.
      The `id` should be namespaced by dots, e.g. "ember-debug.feature-flag-with-features-stripped"
    @public
    @since 1.0.0
  */
  warn = function (message, test, options) {
    if (arguments.length === 2 && typeof test === 'object') {
      options = test;
      test = false;
    }
    if (!options) {
      (0, _deprecate.default)(missingOptionsDeprecation, false, {
        id: 'ember-debug.warn-options-missing',
        until: '3.0.0',
        url: 'https://emberjs.com/deprecations/v2.x/#toc_ember-debug-function-options'
      });
    }

    if (options && !options.id) {
      (0, _deprecate.default)(missingOptionsIdDeprecation, false, {
        id: 'ember-debug.warn-id-missing',
        until: '3.0.0',
        url: 'https://emberjs.com/deprecations/v2.x/#toc_ember-debug-function-options'
      });
    }

    (0, _handlers.invoke)('warn', message, test, options);
  };


  exports.default = warn;
  exports.registerHandler = registerHandler;
  exports.missingOptionsIdDeprecation = missingOptionsIdDeprecation;
  exports.missingOptionsDeprecation = missingOptionsDeprecation;
});
enifed('ember-environment', ['exports'], function (exports) {
  'use strict';

  /* globals global, window, self, mainContext */

  // from lodash to catch fake globals

  function checkGlobal(value) {
    return value && value.Object === Object ? value : undefined;
  }

  // element ids can ruin global miss checks


  // export real global
  var global$1 = checkGlobal(function (value) {
    return value && value.nodeType === undefined ? value : undefined;
  }(typeof global === 'object' && global)) || checkGlobal(typeof self === 'object' && self) || checkGlobal(typeof window === 'object' && window) || mainContext || // set before strict mode in Ember loader/wrapper
  new Function('return this')(); // eval outside of strict mode

  function defaultTrue(v) {
    return v === false ? false : true;
  }

  function defaultFalse(v) {
    return v === true ? true : false;
  }

  /* globals module */
  /**
    The hash of environment variables used to control various configuration
    settings. To specify your own or override default settings, add the
    desired properties to a global hash named `EmberENV` (or `ENV` for
    backwards compatibility with earlier versions of Ember). The `EmberENV`
    hash must be created before loading Ember.
  
    @class EmberENV
    @type Object
    @public
  */
  var ENV = typeof global$1.EmberENV === 'object' && global$1.EmberENV || typeof global$1.ENV === 'object' && global$1.ENV || {};

  // ENABLE_ALL_FEATURES was documented, but you can't actually enable non optional features.
  if (ENV.ENABLE_ALL_FEATURES) {
    ENV.ENABLE_OPTIONAL_FEATURES = true;
  }

  /**
    Determines whether Ember should add to `Array`, `Function`, and `String`
    native object prototypes, a few extra methods in order to provide a more
    friendly API.
  
    We generally recommend leaving this option set to true however, if you need
    to turn it off, you can add the configuration property
    `EXTEND_PROTOTYPES` to `EmberENV` and set it to `false`.
  
    Note, when disabled (the default configuration for Ember Addons), you will
    instead have to access all methods and functions from the Ember
    namespace.
  
    @property EXTEND_PROTOTYPES
    @type Boolean
    @default true
    @for EmberENV
    @public
  */
  ENV.EXTEND_PROTOTYPES = function (obj) {
    if (obj === false) {
      return { String: false, Array: false, Function: false };
    } else if (!obj || obj === true) {
      return { String: true, Array: true, Function: true };
    } else {
      return {
        String: defaultTrue(obj.String),
        Array: defaultTrue(obj.Array),
        Function: defaultTrue(obj.Function)
      };
    }
  }(ENV.EXTEND_PROTOTYPES);

  /**
    The `LOG_STACKTRACE_ON_DEPRECATION` property, when true, tells Ember to log
    a full stack trace during deprecation warnings.
  
    @property LOG_STACKTRACE_ON_DEPRECATION
    @type Boolean
    @default true
    @for EmberENV
    @public
  */
  ENV.LOG_STACKTRACE_ON_DEPRECATION = defaultTrue(ENV.LOG_STACKTRACE_ON_DEPRECATION);

  /**
    The `LOG_VERSION` property, when true, tells Ember to log versions of all
    dependent libraries in use.
  
    @property LOG_VERSION
    @type Boolean
    @default true
    @for EmberENV
    @public
  */
  ENV.LOG_VERSION = defaultTrue(ENV.LOG_VERSION);

  /**
    Debug parameter you can turn on. This will log all bindings that fire to
    the console. This should be disabled in production code. Note that you
    can also enable this from the console or temporarily.
  
    @property LOG_BINDINGS
    @for EmberENV
    @type Boolean
    @default false
    @public
  */
  ENV.LOG_BINDINGS = defaultFalse(ENV.LOG_BINDINGS);

  ENV.RAISE_ON_DEPRECATION = defaultFalse(ENV.RAISE_ON_DEPRECATION);

  // check if window exists and actually is the global
  var hasDOM = typeof window !== 'undefined' && window === global$1 && window.document && window.document.createElement && !ENV.disableBrowserEnvironment; // is this a public thing?

  // legacy imports/exports/lookup stuff (should we keep this??)
  var originalContext = global$1.Ember || {};

  var context = {
    // import jQuery
    imports: originalContext.imports || global$1,
    // export Ember
    exports: originalContext.exports || global$1,
    // search for Namespaces
    lookup: originalContext.lookup || global$1
  };

  // TODO: cleanup single source of truth issues with this stuff
  var environment = hasDOM ? {
    hasDOM: true,
    isChrome: !!window.chrome && !window.opera,
    isFirefox: typeof InstallTrigger !== 'undefined',
    isPhantom: !!window.callPhantom,
    location: window.location,
    history: window.history,
    userAgent: window.navigator.userAgent,
    window: window
  } : {
    hasDOM: false,
    isChrome: false,
    isFirefox: false,
    isPhantom: false,
    location: null,
    history: null,
    userAgent: 'Lynx (textmode)',
    window: null
  };

  exports.ENV = ENV;
  exports.context = context;
  exports.environment = environment;
});
enifed('ember-metal', ['exports', 'ember-environment', 'ember-utils', 'ember-debug', 'ember-babel', 'ember/features', '@glimmer/reference', 'require', 'ember-console', 'backburner'], function (exports, emberEnvironment, emberUtils, emberDebug, emberBabel, ember_features, _glimmer_reference, require, Logger, Backburner) {
  'use strict';

  require = 'default' in require ? require['default'] : require;
  Logger = 'default' in Logger ? Logger['default'] : Logger;
  Backburner = 'default' in Backburner ? Backburner['default'] : Backburner;

  /**
  @module ember
  */

  /**
    This namespace contains all Ember methods and functions. Future versions of
    Ember may overwrite this namespace and therefore, you should avoid adding any
    new properties.
  
    At the heart of Ember is Ember-Runtime, a set of core functions that provide
    cross-platform compatibility and object property observing.  Ember-Runtime is
    small and performance-focused so you can use it alongside other
    cross-platform libraries such as jQuery. For more details, see
    [Ember-Runtime](https://emberjs.com/api/modules/ember-runtime.html).
  
    @class Ember
    @static
    @public
  */
  var Ember = typeof emberEnvironment.context.imports.Ember === 'object' && emberEnvironment.context.imports.Ember || {},
      TransactionRunner,
      runner,
      _hasOwnProperty,
      _propertyIsEnumerable,
      getPrototypeOf,
      metaStore,
      setWithMandatorySetter,
      makeEnumerable;

  // Make sure these are set whether Ember was already defined or not
  Ember.isNamespace = true;
  Ember.toString = function () {
    return 'Ember';
  };

  /*
   When we render a rich template hierarchy, the set of events that
   *might* happen tends to be much larger than the set of events that
   actually happen. This implies that we should make listener creation &
   destruction cheap, even at the cost of making event dispatch more
   expensive.
  
   Thus we store a new listener with a single push and no new
   allocations, without even bothering to do deduplication -- we can
   save that for dispatch time, if an event actually happens.
   */

  /* listener flags */
  var ONCE = 1;
  var SUSPENDED = 2;

  var protoMethods = {
    addToListeners: function (eventName, target, method, flags) {
      if (this._listeners === undefined) {
        this._listeners = [];
      }
      this._listeners.push(eventName, target, method, flags);
    },
    _finalizeListeners: function () {
      if (this._listenersFinalized) {
        return;
      }
      if (this._listeners === undefined) {
        this._listeners = [];
      }
      var pointer = this.parent,
          listeners;
      while (pointer !== undefined) {
        listeners = pointer._listeners;

        if (listeners !== undefined) {
          this._listeners = this._listeners.concat(listeners);
        }
        if (pointer._listenersFinalized) {
          break;
        }
        pointer = pointer.parent;
      }
      this._listenersFinalized = true;
    },
    removeFromListeners: function (eventName, target, method, didRemove) {
      var pointer = this,
          listeners,
          index;
      while (pointer !== undefined) {
        listeners = pointer._listeners;

        if (listeners !== undefined) {
          for (index = listeners.length - 4; index >= 0; index -= 4) {
            if (listeners[index] === eventName && (!method || listeners[index + 1] === target && listeners[index + 2] === method)) {
              if (pointer === this) {
                // we are modifying our own list, so we edit directly
                if (typeof didRemove === 'function') {
                  didRemove(eventName, target, listeners[index + 2]);
                }
                listeners.splice(index, 4);
              } else {
                // we are trying to remove an inherited listener, so we do
                // just-in-time copying to detach our own listeners from
                // our inheritance chain.
                this._finalizeListeners();
                return this.removeFromListeners(eventName, target, method);
              }
            }
          }
        }
        if (pointer._listenersFinalized) {
          break;
        }
        pointer = pointer.parent;
      }
    },
    matchingListeners: function (eventName) {
      var pointer = this,
          listeners,
          index,
          susIndex,
          resultIndex;
      var result = void 0;
      while (pointer !== undefined) {
        listeners = pointer._listeners;

        if (listeners !== undefined) {
          for (index = 0; index < listeners.length; index += 4) {
            if (listeners[index] === eventName) {
              result = result || [];
              pushUniqueListener(result, listeners, index);
            }
          }
        }
        if (pointer._listenersFinalized) {
          break;
        }
        pointer = pointer.parent;
      }
      var sus = this._suspendedListeners;
      if (sus !== undefined && result !== undefined) {
        for (susIndex = 0; susIndex < sus.length; susIndex += 3) {
          if (eventName === sus[susIndex]) {
            for (resultIndex = 0; resultIndex < result.length; resultIndex += 3) {
              if (result[resultIndex] === sus[susIndex + 1] && result[resultIndex + 1] === sus[susIndex + 2]) {
                result[resultIndex + 2] |= SUSPENDED;
              }
            }
          }
        }
      }
      return result;
    },
    suspendListeners: function (eventNames, target, method, callback) {
      var sus = this._suspendedListeners,
          i,
          _i;
      if (sus === undefined) {
        sus = this._suspendedListeners = [];
      }
      for (i = 0; i < eventNames.length; i++) {
        sus.push(eventNames[i], target, method);
      }
      try {
        return callback.call(target);
      } finally {
        if (sus.length === eventNames.length) {
          this._suspendedListeners = undefined;
        } else {
          for (_i = sus.length - 3; _i >= 0; _i -= 3) {
            if (sus[_i + 1] === target && sus[_i + 2] === method && eventNames.indexOf(sus[_i]) !== -1) {
              sus.splice(_i, 3);
            }
          }
        }
      }
    },
    watchedEvents: function () {
      var pointer = this,
          listeners,
          index;
      var names = {};
      while (pointer !== undefined) {
        listeners = pointer._listeners;

        if (listeners !== undefined) {
          for (index = 0; index < listeners.length; index += 4) {
            names[listeners[index]] = true;
          }
        }
        if (pointer._listenersFinalized) {
          break;
        }
        pointer = pointer.parent;
      }
      return Object.keys(names);
    }
  };

  function pushUniqueListener(destination, source, index) {
    var target = source[index + 1],
        destinationIndex;
    var method = source[index + 2];
    for (destinationIndex = 0; destinationIndex < destination.length; destinationIndex += 3) {
      if (destination[destinationIndex] === target && destination[destinationIndex + 1] === method) {
        return;
      }
    }
    destination.push(target, method, source[index + 3]);
  }

  /**
  @module @ember/object
  */
  /*
    The event system uses a series of nested hashes to store listeners on an
    object. When a listener is registered, or when an event arrives, these
    hashes are consulted to determine which target and action pair to invoke.
  
    The hashes are stored in the object's meta hash, and look like this:
  
        // Object's meta hash
        {
          listeners: {       // variable name: `listenerSet`
            "foo:changed": [ // variable name: `actions`
              target, method, flags
            ]
          }
        }
  
  */

  /**
    Add an event listener
  
    @method addListener
    @static
    @for @ember/object/events
    @param obj
    @param {String} eventName
    @param {Object|Function} target A target object or a function
    @param {Function|String} method A function or the name of a function to be called on `target`
    @param {Boolean} once A flag whether a function should only be called once
    @public
  */
  function addListener(obj, eventName, target, method, once) {
    true && !(!!obj && !!eventName) && emberDebug.assert('You must pass at least an object and event name to addListener', !!obj && !!eventName);
    true && !(eventName !== 'didInitAttrs') && emberDebug.deprecate('didInitAttrs called in ' + (obj && obj.toString && obj.toString()) + '.', eventName !== 'didInitAttrs', {
      id: 'ember-views.did-init-attrs',
      until: '3.0.0',
      url: 'https://emberjs.com/deprecations/v2.x#toc_ember-component-didinitattrs'
    });

    if (!method && 'function' === typeof target) {
      method = target;
      target = null;
    }

    var flags = 0;
    if (once) {
      flags |= ONCE;
    }

    meta(obj).addToListeners(eventName, target, method, flags);

    if ('function' === typeof obj.didAddListener) {
      obj.didAddListener(eventName, target, method);
    }
  }

  /**
    Remove an event listener
  
    Arguments should match those passed to `addListener`.
  
    @method removeListener
    @static
    @for @ember/object/events
    @param obj
    @param {String} eventName
    @param {Object|Function} target A target object or a function
    @param {Function|String} method A function or the name of a function to be called on `target`
    @public
  */
  function removeListener(obj, eventName, target, method) {
    true && !(!!obj && !!eventName) && emberDebug.assert('You must pass at least an object and event name to removeListener', !!obj && !!eventName);

    if (!method && 'function' === typeof target) {
      method = target;
      target = null;
    }

    var func = 'function' === typeof obj.didRemoveListener ? obj.didRemoveListener.bind(obj) : function () {};
    meta(obj).removeFromListeners(eventName, target, method, func);
  }

  /**
    Suspend listener during callback.
  
    This should only be used by the target of the event listener
    when it is taking an action that would cause the event, e.g.
    an object might suspend its property change listener while it is
    setting that property.
  
    @method suspendListener
    @static
    @for @ember/object/events
  
    @private
    @param obj
    @param {String} eventName
    @param {Object|Function} target A target object or a function
    @param {Function|String} method A function or the name of a function to be called on `target`
    @param {Function} callback
  */
  function suspendListener(obj, eventName, target, method, callback) {
    return suspendListeners(obj, [eventName], target, method, callback);
  }

  /**
    Suspends multiple listeners during a callback.
  
    @method suspendListeners
    @static
    @for @ember/object/events
  
    @private
    @param obj
    @param {Array} eventNames Array of event names
    @param {Object|Function} target A target object or a function
    @param {Function|String} method A function or the name of a function to be called on `target`
    @param {Function} callback
  */
  function suspendListeners(obj, eventNames, target, method, callback) {
    if (!method && 'function' === typeof target) {
      method = target;
      target = null;
    }
    return meta(obj).suspendListeners(eventNames, target, method, callback);
  }

  /**
    Return a list of currently watched events
  
    @private
    @method watchedEvents
    @static
    @for @ember/object/events
    @param obj
  */


  /**
    Send an event. The execution of suspended listeners
    is skipped, and once listeners are removed. A listener without
    a target is executed on the passed object. If an array of actions
    is not passed, the actions stored on the passed object are invoked.
  
    @method sendEvent
    @static
    @for @ember/object/events
    @param obj
    @param {String} eventName
    @param {Array} params Optional parameters for each listener.
    @param {Array} actions Optional array of actions (listeners).
    @param {Meta}  meta Optional meta to lookup listeners
    @return true
    @public
  */
  function sendEvent(obj, eventName, params, actions, _meta) {
    var meta$$1, i, target, method, flags;

    if (actions === undefined) {
      meta$$1 = _meta === undefined ? exports.peekMeta(obj) : _meta;

      actions = typeof meta$$1 === 'object' && meta$$1 !== null && meta$$1.matchingListeners(eventName);
    }

    if (actions === undefined || actions.length === 0) {
      return false;
    }

    for (i = actions.length - 3; i >= 0; i -= 3) {
      // looping in reverse for once listeners
      target = actions[i];
      method = actions[i + 1];
      flags = actions[i + 2];


      if (!method) {
        continue;
      }
      if (flags & SUSPENDED) {
        continue;
      }
      if (flags & ONCE) {
        removeListener(obj, eventName, target, method);
      }
      if (!target) {
        target = obj;
      }
      if ('string' === typeof method) {
        if (params) {
          emberUtils.applyStr(target, method, params);
        } else {
          target[method]();
        }
      } else {
        if (params) {
          method.apply(target, params);
        } else {
          method.call(target);
        }
      }
    }
    return true;
  }

  /**
    @private
    @method hasListeners
    @static
    @for @ember/object/events
    @param obj
    @param {String} eventName
  */


  /**
    @private
    @method listenersFor
    @static
    @for @ember/object/events
    @param obj
    @param {String} eventName
  */
  function listenersFor(obj, eventName) {
    var ret = [],
        i,
        target,
        method;
    var meta$$1 = exports.peekMeta(obj);
    var actions = meta$$1 !== undefined ? meta$$1.matchingListeners(eventName) : undefined;

    if (actions === undefined) {
      return ret;
    }

    for (i = 0; i < actions.length; i += 3) {
      target = actions[i];
      method = actions[i + 1];

      ret.push([target, method]);
    }

    return ret;
  }

  /**
    Define a property as a function that should be executed when
    a specified event or events are triggered.
  
  
    ``` javascript
    import EmberObject from '@ember/object';
    import { on } from '@ember/object/evented';
    import { sendEvent } from '@ember/object/events';
  
    let Job = EmberObject.extend({
      logCompleted: on('completed', function() {
        console.log('Job completed!');
      })
    });
  
    let job = Job.create();
  
    sendEvent(job, 'completed'); // Logs 'Job completed!'
   ```
  
    @method on
    @static
    @for @ember/object/evented
    @param {String} eventNames*
    @param {Function} func
    @return func
    @public
  */


  var hasViews = function () {
    return false;
  };

  function makeTag() {
    return new _glimmer_reference.DirtyableTag();
  }

  function tagFor(object, _meta) {
    var meta$$1;

    if (typeof object === 'object' && object !== null) {
      meta$$1 = _meta === undefined ? meta(object) : _meta;

      return meta$$1.writableTag(makeTag);
    } else {
      return _glimmer_reference.CONSTANT_TAG;
    }
  }

  function markObjectAsDirty(meta$$1, propertyKey) {
    var objectTag = meta$$1.readableTag();

    if (objectTag !== undefined) {
      objectTag.dirty();
    }

    var tags = meta$$1.readableTags();
    var propertyTag = tags !== undefined ? tags[propertyKey] : undefined;

    if (propertyTag !== undefined) {
      propertyTag.dirty();
    }

    if (propertyKey === 'content' && meta$$1.isProxy()) {
      objectTag.contentDidChange();
    }

    if (objectTag !== undefined || propertyTag !== undefined) {
      ensureRunloop();
    }
  }

  var backburner = void 0;
  function ensureRunloop() {
    if (backburner === undefined) {
      backburner = require('ember-metal').run.backburner;
    }

    if (hasViews()) {
      backburner.ensureInstance();
    }
  }

  /*
    this.observerSet = {
      [senderGuid]: { // variable name: `keySet`
        [keyName]: listIndex
      }
    },
    this.observers = [
      {
        sender: obj,
        keyName: keyName,
        eventName: eventName,
        listeners: [
          [target, method, flags]
        ]
      },
      ...
    ]
  */

  var ObserverSet = function () {
    function ObserverSet() {

      this.clear();
    }

    ObserverSet.prototype.add = function (sender, keyName, eventName) {
      var observerSet = this.observerSet;
      var observers = this.observers;
      var senderGuid = emberUtils.guidFor(sender);
      var keySet = observerSet[senderGuid];

      if (keySet === undefined) {
        observerSet[senderGuid] = keySet = {};
      }

      var index = keySet[keyName];
      if (index === undefined) {
        index = observers.push({
          sender: sender,
          keyName: keyName,
          eventName: eventName,
          listeners: []
        }) - 1;
        keySet[keyName] = index;
      }
      return observers[index].listeners;
    };

    ObserverSet.prototype.flush = function () {
      var observers = this.observers,
          i;
      var observer = void 0,
          sender = void 0;
      this.clear();
      for (i = 0; i < observers.length; ++i) {
        observer = observers[i];
        sender = observer.sender;
        if (sender.isDestroying || sender.isDestroyed) {
          continue;
        }
        sendEvent(sender, observer.eventName, [sender, observer.keyName], observer.listeners);
      }
    };

    ObserverSet.prototype.clear = function () {
      this.observerSet = {};
      this.observers = [];
    };

    return ObserverSet;
  }();

  /**
   @module ember
  */
  var id = 0;

  // Returns whether Type(value) is Object according to the terminology in the spec
  function isObject$1(value) {
    return typeof value === 'object' && value !== null || typeof value === 'function';
  }

  /*
   * @class Ember.WeakMap
   * @public
   * @category ember-metal-weakmap
   *
   * A partial polyfill for [WeakMap](http://www.ecma-international.org/ecma-262/6.0/#sec-weakmap-objects).
   *
   * There is a small but important caveat. This implementation assumes that the
   * weak map will live longer (in the sense of garbage collection) than all of its
   * keys, otherwise it is possible to leak the values stored in the weak map. In
   * practice, most use cases satisfy this limitation which is why it is included
   * in ember-metal.
   */
  var WeakMapPolyfill = function () {
    function WeakMapPolyfill(iterable) {
      var i, _iterable$i, key, value;

      this._id = emberUtils.GUID_KEY + id++;

      if (iterable === null || iterable === undefined) {} else if (Array.isArray(iterable)) {
        for (i = 0; i < iterable.length; i++) {
          _iterable$i = iterable[i], key = _iterable$i[0], value = _iterable$i[1];


          this.set(key, value);
        }
      } else {
        throw new TypeError('The weak map constructor polyfill only supports an array argument');
      }
    }

    /*
     * @method get
     * @param key {Object | Function}
     * @return {Any} stored value
     */

    WeakMapPolyfill.prototype.get = function (obj) {
      if (!isObject$1(obj)) {
        return undefined;
      }

      var meta$$1 = exports.peekMeta(obj),
          map,
          val;
      if (meta$$1 !== undefined) {
        map = meta$$1.readableWeak();

        if (map !== undefined) {
          val = map[this._id];

          if (val === UNDEFINED) {
            return undefined;
          }
          return val;
        }
      }
    };

    /*
     * @method set
     * @param key {Object | Function}
     * @param value {Any}
     * @return {WeakMap} the weak map
     */

    WeakMapPolyfill.prototype.set = function (obj, value) {
      if (!isObject$1(obj)) {
        throw new TypeError('Invalid value used as weak map key');
      }

      if (value === undefined) {
        value = UNDEFINED;
      }

      meta(obj).writableWeak()[this._id] = value;

      return this;
    };

    /*
     * @method has
     * @param key {Object | Function}
     * @return {boolean} if the key exists
     */

    WeakMapPolyfill.prototype.has = function (obj) {
      if (!isObject$1(obj)) {
        return false;
      }

      var meta$$1 = exports.peekMeta(obj),
          map;
      if (meta$$1 !== undefined) {
        map = meta$$1.readableWeak();

        if (map !== undefined) {
          return map[this._id] !== undefined;
        }
      }

      return false;
    };

    /*
     * @method delete
     * @param key {Object | Function}
     * @return {boolean} if the key was deleted
     */

    WeakMapPolyfill.prototype.delete = function (obj) {
      if (this.has(obj)) {
        delete exports.peekMeta(obj).writableWeak()[this._id];
        return true;
      } else {
        return false;
      }
    };

    /*
     * @method toString
     * @return {String}
     */

    WeakMapPolyfill.prototype.toString = function () {
      return '[object WeakMap]';
    };

    return WeakMapPolyfill;
  }();

  var WeakMap$1 = emberUtils.HAS_NATIVE_WEAKMAP ? WeakMap : WeakMapPolyfill;

  exports.runInTransaction = void 0;
  exports.didRender = void 0;
  exports.assertNotRendered = void 0;

  // detect-backtracking-rerender by default is debug build only
  // detect-glimmer-allow-backtracking-rerender can be enabled in custom builds
  if (ember_features.EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER || ember_features.EMBER_GLIMMER_ALLOW_BACKTRACKING_RERENDER) {

    // there are 4 states

    // NATIVE WEAKMAP AND DEBUG
    // tracks lastRef and lastRenderedIn per rendered object and key during a transaction
    // release everything via normal weakmap semantics by just derefencing the weakmap

    // NATIVE WEAKMAP AND RELEASE
    // tracks transactionId per rendered object and key during a transaction
    // release everything via normal weakmap semantics by just derefencing the weakmap

    // WEAKMAP POLYFILL AND DEBUG
    // tracks lastRef and lastRenderedIn per rendered object and key during a transaction
    // since lastRef retains a lot of app state (will have a ref to the Container)
    // if the object rendered is retained (like a immutable POJO in module state)
    // during acceptance tests this adds up and obfuscates finding other leaks.

    // WEAKMAP POLYFILL AND RELEASE
    // tracks transactionId per rendered object and key during a transaction
    // leaks it because small and likely not worth tracking it since it will only
    // be leaked if the object is retained

    TransactionRunner = function () {
      function TransactionRunner() {

        this.transactionId = 0;
        this.inTransaction = false;
        this.shouldReflush = false;
        this.weakMap = new WeakMap$1();
        {
          // track templates
          this.debugStack = undefined;

          if (!emberUtils.HAS_NATIVE_WEAKMAP) {
            // DEBUG AND POLYFILL
            // needs obj tracking
            this.objs = [];
          }
        }
      }

      TransactionRunner.prototype.runInTransaction = function (context$$1, methodName) {
        this.before(context$$1);
        try {
          context$$1[methodName]();
        } finally {
          this.after();
        }
        return this.shouldReflush;
      };

      TransactionRunner.prototype.didRender = function (object, key, reference) {
        if (!this.inTransaction) {
          return;
        }
        {
          this.setKey(object, key, {
            lastRef: reference,
            lastRenderedIn: this.debugStack.peek()
          });
        }
      };

      TransactionRunner.prototype.assertNotRendered = function (object, key) {
        var _getKey, lastRef, lastRenderedIn, currentlyIn, parts, label, message;

        if (!this.inTransaction) {
          return;
        }
        if (this.hasRendered(object, key)) {
          {
            _getKey = this.getKey(object, key), lastRef = _getKey.lastRef, lastRenderedIn = _getKey.lastRenderedIn;
            currentlyIn = this.debugStack.peek();
            parts = [];
            label = void 0;


            if (lastRef !== undefined) {
              while (lastRef && lastRef._propertyKey) {
                parts.unshift(lastRef._propertyKey);
                lastRef = lastRef._parentReference;
              }

              label = parts.join('.');
            } else {
              label = 'the same value';
            }

            message = 'You modified "' + label + '" twice on ' + object + ' in a single render. It was rendered in ' + lastRenderedIn + ' and modified in ' + currentlyIn + '. This was unreliable and slow in Ember 1.x and';


            if (ember_features.EMBER_GLIMMER_ALLOW_BACKTRACKING_RERENDER) {
              true && !false && emberDebug.deprecate(message + ' will be removed in Ember 3.0.', false, { id: 'ember-views.render-double-modify', until: '3.0.0' });
            } else {
              true && !false && emberDebug.assert(message + ' is no longer supported. See https://github.com/emberjs/ember.js/issues/13948 for more details.', false);
            }
          }

          this.shouldReflush = true;
        }
      };

      TransactionRunner.prototype.hasRendered = function (object, key) {
        if (!this.inTransaction) {
          return false;
        }
        {
          return this.getKey(object, key) !== undefined;
        }
        return this.getKey(object, key) === this.transactionId;
      };

      TransactionRunner.prototype.before = function (context$$1) {
        this.inTransaction = true;
        this.shouldReflush = false;
        {
          this.debugStack = context$$1.env.debugStack;
        }
      };

      TransactionRunner.prototype.after = function () {
        this.transactionId++;
        this.inTransaction = false;
        {
          this.debugStack = undefined;
        }
        this.clearObjectMap();
      };

      TransactionRunner.prototype.createMap = function (object) {
        var map = Object.create(null);
        this.weakMap.set(object, map);
        if (true && !emberUtils.HAS_NATIVE_WEAKMAP) {
          // POLYFILL AND DEBUG
          // requires tracking objects
          this.objs.push(object);
        }
        return map;
      };

      TransactionRunner.prototype.getOrCreateMap = function (object) {
        var map = this.weakMap.get(object);
        if (map === undefined) {
          map = this.createMap(object);
        }
        return map;
      };

      TransactionRunner.prototype.setKey = function (object, key, value) {
        var map = this.getOrCreateMap(object);
        map[key] = value;
      };

      TransactionRunner.prototype.getKey = function (object, key) {
        var map = this.weakMap.get(object);
        if (map !== undefined) {
          return map[key];
        }
      };

      TransactionRunner.prototype.clearObjectMap = function () {
        var objs, weakMap, i;

        if (emberUtils.HAS_NATIVE_WEAKMAP) {
          // NATIVE AND (DEBUG OR RELEASE)
          // if we have a real native weakmap
          // releasing the ref will allow the values to be GCed
          this.weakMap = new WeakMap$1();
        } else {
          // POLYFILL AND DEBUG
          // with a polyfill the weakmap keys must be cleared since
          // they have the last reference, acceptance tests will leak
          // the container if you render a immutable object retained
          // in module scope.
          objs = this.objs, weakMap = this.weakMap;


          this.objs = [];
          for (i = 0; i < objs.length; i++) {
            weakMap.delete(objs[i]);
          }
        }
        // POLYFILL AND RELEASE
        // we leak the key map if the object is retained but this is
        // a POJO of keys to transaction ids
      };

      return TransactionRunner;
    }();
    runner = new TransactionRunner();


    exports.runInTransaction = runner.runInTransaction.bind(runner);
    exports.didRender = runner.didRender.bind(runner);
    exports.assertNotRendered = runner.assertNotRendered.bind(runner);
  } else {
    // in production do nothing to detect reflushes
    exports.runInTransaction = function (context$$1, methodName) {
      context$$1[methodName]();
      return false;
    };
  }

  /**
   @module ember
   @private
   */

  var PROPERTY_DID_CHANGE = emberUtils.symbol('PROPERTY_DID_CHANGE');

  var beforeObserverSet = new ObserverSet();
  var observerSet = new ObserverSet();
  var deferred = 0;

  // ..........................................................
  // PROPERTY CHANGES
  //

  /**
    This function is called just before an object property is about to change.
    It will notify any before observers and prepare caches among other things.
  
    Normally you will not need to call this method directly but if for some
    reason you can't directly watch a property you can invoke this method
    manually along with `Ember.propertyDidChange()` which you should call just
    after the property value changes.
  
    @method propertyWillChange
    @for Ember
    @param {Object} obj The object with the property that will change
    @param {String} keyName The property key (or path) that will change.
    @return {void}
    @private
  */
  function propertyWillChange(obj, keyName, _meta) {
    var meta$$1 = _meta === undefined ? exports.peekMeta(obj) : _meta;
    if (meta$$1 !== undefined && !meta$$1.isInitialized(obj)) {
      return;
    }

    var watching = meta$$1 !== undefined && meta$$1.peekWatching(keyName) > 0;
    var possibleDesc = obj[keyName];
    var isDescriptor = possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor;

    if (isDescriptor && possibleDesc.willChange) {
      possibleDesc.willChange(obj, keyName);
    }

    if (watching) {
      dependentKeysWillChange(obj, keyName, meta$$1);
      chainsWillChange(obj, keyName, meta$$1);
      notifyBeforeObservers(obj, keyName, meta$$1);
    }
  }

  /**
    This function is called just after an object property has changed.
    It will notify any observers and clear caches among other things.
  
    Normally you will not need to call this method directly but if for some
    reason you can't directly watch a property you can invoke this method
    manually along with `Ember.propertyWillChange()` which you should call just
    before the property value changes.
  
    @method propertyDidChange
    @for Ember
    @param {Object} obj The object with the property that will change
    @param {String} keyName The property key (or path) that will change.
    @param {Meta} meta The objects meta.
    @return {void}
    @private
  */
  function propertyDidChange(obj, keyName, _meta) {
    var meta$$1 = _meta === undefined ? exports.peekMeta(obj) : _meta;
    var hasMeta = meta$$1 !== undefined;

    if (hasMeta && !meta$$1.isInitialized(obj)) {
      return;
    }

    var possibleDesc = obj[keyName];
    var isDescriptor = possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor;

    // shouldn't this mean that we're watching this key?
    if (isDescriptor && possibleDesc.didChange) {
      possibleDesc.didChange(obj, keyName);
    }

    if (hasMeta && meta$$1.peekWatching(keyName) > 0) {
      dependentKeysDidChange(obj, keyName, meta$$1);
      chainsDidChange(obj, keyName, meta$$1);
      notifyObservers(obj, keyName, meta$$1);
    }

    if (obj[PROPERTY_DID_CHANGE]) {
      obj[PROPERTY_DID_CHANGE](keyName);
    }

    if (hasMeta) {
      if (meta$$1.isSourceDestroying()) {
        return;
      }
      markObjectAsDirty(meta$$1, keyName);
    }

    if (ember_features.EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER || ember_features.EMBER_GLIMMER_ALLOW_BACKTRACKING_RERENDER) {
      exports.assertNotRendered(obj, keyName, meta$$1);
    }
  }

  var WILL_SEEN = void 0;
  var DID_SEEN = void 0;
  // called whenever a property is about to change to clear the cache of any dependent keys (and notify those properties of changes, etc...)
  function dependentKeysWillChange(obj, depKey, meta$$1) {
    if (meta$$1.isSourceDestroying() || !meta$$1.hasDeps(depKey)) {
      return;
    }
    var seen = WILL_SEEN;
    var top = !seen;

    if (top) {
      seen = WILL_SEEN = {};
    }

    iterDeps(propertyWillChange, obj, depKey, seen, meta$$1);

    if (top) {
      WILL_SEEN = null;
    }
  }

  // called whenever a property has just changed to update dependent keys
  function dependentKeysDidChange(obj, depKey, meta$$1) {
    if (meta$$1.isSourceDestroying() || !meta$$1.hasDeps(depKey)) {
      return;
    }
    var seen = DID_SEEN;
    var top = !seen;

    if (top) {
      seen = DID_SEEN = {};
    }

    iterDeps(propertyDidChange, obj, depKey, seen, meta$$1);

    if (top) {
      DID_SEEN = null;
    }
  }

  function iterDeps(method, obj, depKey, seen, meta$$1) {
    var possibleDesc = void 0,
        isDescriptor = void 0;
    var guid = emberUtils.guidFor(obj);
    var current = seen[guid];

    if (!current) {
      current = seen[guid] = {};
    }

    if (current[depKey]) {
      return;
    }

    current[depKey] = true;

    meta$$1.forEachInDeps(depKey, function (key, value) {
      if (!value) {
        return;
      }

      possibleDesc = obj[key];
      isDescriptor = possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor;

      if (isDescriptor && possibleDesc._suspended === obj) {
        return;
      }

      method(obj, key, meta$$1);
    });
  }

  function chainsWillChange(obj, keyName, meta$$1) {
    var chainWatchers = meta$$1.readableChainWatchers();
    if (chainWatchers !== undefined) {
      chainWatchers.notify(keyName, false, propertyWillChange);
    }
  }

  function chainsDidChange(obj, keyName, meta$$1) {
    var chainWatchers = meta$$1.readableChainWatchers();
    if (chainWatchers !== undefined) {
      chainWatchers.notify(keyName, true, propertyDidChange);
    }
  }

  function overrideChains(obj, keyName, meta$$1) {
    var chainWatchers = meta$$1.readableChainWatchers();
    if (chainWatchers !== undefined) {
      chainWatchers.revalidate(keyName);
    }
  }

  /**
    @method beginPropertyChanges
    @chainable
    @private
  */
  function beginPropertyChanges() {
    deferred++;
  }

  /**
    @method endPropertyChanges
    @private
  */
  function endPropertyChanges() {
    deferred--;
    if (deferred <= 0) {
      beforeObserverSet.clear();
      observerSet.flush();
    }
  }

  /**
    Make a series of property changes together in an
    exception-safe way.
  
    ```javascript
    Ember.changeProperties(function() {
      obj1.set('foo', mayBlowUpWhenSet);
      obj2.set('bar', baz);
    });
    ```
  
    @method changeProperties
    @param {Function} callback
    @param [binding]
    @private
  */
  function changeProperties(callback, binding) {
    beginPropertyChanges();
    try {
      callback.call(binding);
    } finally {
      endPropertyChanges();
    }
  }

  function indexOf(array, target, method) {
    var index = -1,
        i;
    // hashes are added to the end of the event array
    // so it makes sense to start searching at the end
    // of the array and search in reverse
    for (i = array.length - 3; i >= 0; i -= 3) {
      if (target === array[i] && method === array[i + 1]) {
        index = i;
        break;
      }
    }
    return index;
  }

  function accumulateListeners(obj, eventName, otherActions, meta$$1) {
    var actions = meta$$1.matchingListeners(eventName),
        i,
        target,
        method,
        flags,
        actionIndex;
    if (actions === undefined) {
      return;
    }
    var newActions = [];

    for (i = actions.length - 3; i >= 0; i -= 3) {
      target = actions[i];
      method = actions[i + 1];
      flags = actions[i + 2];
      actionIndex = indexOf(otherActions, target, method);


      if (actionIndex === -1) {
        otherActions.push(target, method, flags);
        newActions.push(target, method, flags);
      }
    }

    return newActions;
  }

  function notifyBeforeObservers(obj, keyName, meta$$1) {
    if (meta$$1.isSourceDestroying()) {
      return;
    }

    var eventName = keyName + ':before';
    var listeners = void 0,
        added = void 0;
    if (deferred > 0) {
      listeners = beforeObserverSet.add(obj, keyName, eventName);
      added = accumulateListeners(obj, eventName, listeners, meta$$1);
    }
    sendEvent(obj, eventName, [obj, keyName], added);
  }

  function notifyObservers(obj, keyName, meta$$1) {
    if (meta$$1.isSourceDestroying()) {
      return;
    }

    var eventName = keyName + ':change';
    var listeners = void 0;
    if (deferred > 0) {
      listeners = observerSet.add(obj, keyName, eventName);
      accumulateListeners(obj, eventName, listeners, meta$$1);
    } else {
      sendEvent(obj, eventName, [obj, keyName]);
    }
  }

  /**
  @module @ember/object
  */

  // ..........................................................
  // DESCRIPTOR
  //

  /**
    Objects of this type can implement an interface to respond to requests to
    get and set. The default implementation handles simple properties.
  
    @class Descriptor
    @private
  */
  function Descriptor() {
    this.isDescriptor = true;
  }

  var REDEFINE_SUPPORTED = function () {
    // https://github.com/spalger/kibana/commit/b7e35e6737df585585332857a4c397dc206e7ff9
    var a = Object.create(Object.prototype, {
      prop: {
        configurable: true,
        value: 1
      }
    });

    Object.defineProperty(a, 'prop', {
      configurable: true,
      value: 2
    });

    return a.prop === 2;
  }();
  // ..........................................................
  // DEFINING PROPERTIES API
  //

  function MANDATORY_SETTER_FUNCTION(name) {
    function SETTER_FUNCTION(value) {
      var m = exports.peekMeta(this);
      if (!m.isInitialized(this)) {
        m.writeValues(name, value);
      } else {
        true && !false && emberDebug.assert('You must use set() to set the `' + name + '` property (of ' + this + ') to `' + value + '`.', false);
      }
    }

    SETTER_FUNCTION.isMandatorySetter = true;
    return SETTER_FUNCTION;
  }

  function DEFAULT_GETTER_FUNCTION(name) {
    return function () {
      var meta$$1 = exports.peekMeta(this);
      if (meta$$1 !== undefined) {
        return meta$$1.peekValues(name);
      }
    };
  }

  function INHERITING_GETTER_FUNCTION(name) {
    function IGETTER_FUNCTION() {
      var meta$$1 = exports.peekMeta(this),
          proto;
      var val = void 0;
      if (meta$$1 !== undefined) {
        val = meta$$1.readInheritedValue('values', name);
      }

      if (val === UNDEFINED) {
        proto = Object.getPrototypeOf(this);

        return proto && proto[name];
      } else {
        return val;
      }
    }

    IGETTER_FUNCTION.isInheritingGetter = true;
    return IGETTER_FUNCTION;
  }

  /**
    NOTE: This is a low-level method used by other parts of the API. You almost
    never want to call this method directly. Instead you should use
    `mixin()` to define new properties.
  
    Defines a property on an object. This method works much like the ES5
    `Object.defineProperty()` method except that it can also accept computed
    properties and other special descriptors.
  
    Normally this method takes only three parameters. However if you pass an
    instance of `Descriptor` as the third param then you can pass an
    optional value as the fourth parameter. This is often more efficient than
    creating new descriptor hashes for each property.
  
    ## Examples
  
    ```javascript
    import { defineProperty, computed } from '@ember/object';
  
    // ES5 compatible mode
    defineProperty(contact, 'firstName', {
      writable: true,
      configurable: false,
      enumerable: true,
      value: 'Charles'
    });
  
    // define a simple property
    defineProperty(contact, 'lastName', undefined, 'Jolley');
  
    // define a computed property
    defineProperty(contact, 'fullName', computed('firstName', 'lastName', function() {
      return this.firstName+' '+this.lastName;
    }));
    ```
  
    @private
    @method defineProperty
    @for @ember/object
    @param {Object} obj the object to define this property on. This may be a prototype.
    @param {String} keyName the name of the property
    @param {Descriptor} [desc] an instance of `Descriptor` (typically a
      computed property) or an ES5 descriptor.
      You must provide this or `data` but not both.
    @param {*} [data] something other than a descriptor, that will
      become the explicit value of this property.
  */
  function defineProperty(obj, keyName, desc, data, meta$$1) {
    if (meta$$1 === undefined) {
      meta$$1 = meta(obj);
    }

    var watchEntry = meta$$1.peekWatching(keyName),
        defaultDescriptor;
    var watching = watchEntry !== undefined && watchEntry > 0;
    var possibleDesc = obj[keyName];
    var isDescriptor = possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor;

    if (isDescriptor) {
      possibleDesc.teardown(obj, keyName, meta$$1);
    }

    var value = void 0;
    if (desc instanceof Descriptor) {
      value = desc;
      if (ember_features.MANDATORY_SETTER) {
        if (watching) {
          Object.defineProperty(obj, keyName, {
            configurable: true,
            enumerable: true,
            writable: true,
            value: value
          });
        } else {
          obj[keyName] = value;
        }
      } else {
        obj[keyName] = value;
      }

      didDefineComputedProperty(obj.constructor);

      if (typeof desc.setup === 'function') {
        desc.setup(obj, keyName);
      }
    } else if (desc === undefined || desc === null) {
      value = data;

      if (ember_features.MANDATORY_SETTER) {
        if (watching) {
          meta$$1.writeValues(keyName, data);

          defaultDescriptor = {
            configurable: true,
            enumerable: true,
            set: MANDATORY_SETTER_FUNCTION(keyName),
            get: DEFAULT_GETTER_FUNCTION(keyName)
          };


          if (REDEFINE_SUPPORTED) {
            Object.defineProperty(obj, keyName, defaultDescriptor);
          } else {
            handleBrokenPhantomDefineProperty(obj, keyName, defaultDescriptor);
          }
        } else {
          obj[keyName] = data;
        }
      } else {
        obj[keyName] = data;
      }
    } else {
      value = desc;

      // fallback to ES5
      Object.defineProperty(obj, keyName, desc);
    }

    // if key is being watched, override chains that
    // were initialized with the prototype
    if (watching) {
      overrideChains(obj, keyName, meta$$1);
    }

    // The `value` passed to the `didDefineProperty` hook is
    // either the descriptor or data, whichever was passed.
    if (typeof obj.didDefineProperty === 'function') {
      obj.didDefineProperty(obj, keyName, value);
    }

    return this;
  }

  var hasCachedComputedProperties = false;


  function didDefineComputedProperty(constructor) {
    if (hasCachedComputedProperties === false) {
      return;
    }
    var cache = meta(constructor).readableCache();

    if (cache && cache._computedProperties !== undefined) {
      cache._computedProperties = undefined;
    }
  }

  function handleBrokenPhantomDefineProperty(obj, keyName, desc) {
    // https://github.com/ariya/phantomjs/issues/11856
    Object.defineProperty(obj, keyName, { configurable: true, writable: true, value: 'iCry' });
    Object.defineProperty(obj, keyName, desc);
  }

  var handleMandatorySetter = void 0;

  function watchKey(obj, keyName, _meta) {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    var meta$$1 = _meta === undefined ? meta(obj) : _meta,
        possibleDesc,
        isDescriptor;
    var count = meta$$1.peekWatching(keyName) || 0;
    meta$$1.writeWatching(keyName, count + 1);

    if (count === 0) {
      // activate watching first time
      possibleDesc = obj[keyName];
      isDescriptor = possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor;

      if (isDescriptor && possibleDesc.willWatch) {
        possibleDesc.willWatch(obj, keyName, meta$$1);
      }

      if (typeof obj.willWatchProperty === 'function') {
        obj.willWatchProperty(keyName);
      }

      if (ember_features.MANDATORY_SETTER) {
        // NOTE: this is dropped for prod + minified builds
        handleMandatorySetter(meta$$1, obj, keyName);
      }
    }
  }

  if (ember_features.MANDATORY_SETTER) {
    _hasOwnProperty = function (obj, key) {
      return Object.prototype.hasOwnProperty.call(obj, key);
    };
    _propertyIsEnumerable = function (obj, key) {
      return Object.prototype.propertyIsEnumerable.call(obj, key);
    };

    // Future traveler, although this code looks scary. It merely exists in
    // development to aid in development asertions. Production builds of
    // ember strip this entire block out

    handleMandatorySetter = function (m, obj, keyName) {
      var descriptor = emberUtils.lookupDescriptor(obj, keyName),
          desc;
      var hasDescriptor = descriptor !== null;
      var configurable = hasDescriptor ? descriptor.configurable : true;
      var isWritable = hasDescriptor ? descriptor.writable : true;
      var hasValue = hasDescriptor ? 'value' in descriptor : true;
      var possibleDesc = hasDescriptor && descriptor.value;
      var isDescriptor = possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor;

      if (isDescriptor) {
        return;
      }

      // this x in Y deopts, so keeping it in this function is better;
      if (configurable && isWritable && hasValue && keyName in obj) {
        desc = {
          configurable: true,
          set: MANDATORY_SETTER_FUNCTION(keyName),
          enumerable: _propertyIsEnumerable(obj, keyName),
          get: undefined
        };


        if (_hasOwnProperty(obj, keyName)) {
          m.writeValues(keyName, obj[keyName]);
          desc.get = DEFAULT_GETTER_FUNCTION(keyName);
        } else {
          desc.get = INHERITING_GETTER_FUNCTION(keyName);
        }

        Object.defineProperty(obj, keyName, desc);
      }
    };
  }

  function unwatchKey(obj, keyName, _meta) {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }
    var meta$$1 = _meta === undefined ? exports.peekMeta(obj) : _meta,
        possibleDesc,
        isDescriptor,
        maybeMandatoryDescriptor,
        possibleValue;

    // do nothing of this object has already been destroyed
    if (meta$$1 === undefined || meta$$1.isSourceDestroyed()) {
      return;
    }

    var count = meta$$1.peekWatching(keyName);
    if (count === 1) {
      meta$$1.writeWatching(keyName, 0);

      possibleDesc = obj[keyName];
      isDescriptor = possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor;


      if (isDescriptor && possibleDesc.didUnwatch) {
        possibleDesc.didUnwatch(obj, keyName, meta$$1);
      }

      if (typeof obj.didUnwatchProperty === 'function') {
        obj.didUnwatchProperty(keyName);
      }

      if (ember_features.MANDATORY_SETTER) {
        // It is true, the following code looks quite WAT. But have no fear, It
        // exists purely to improve development ergonomics and is removed from
        // ember.min.js and ember.prod.js builds.
        //
        // Some further context: Once a property is watched by ember, bypassing `set`
        // for mutation, will bypass observation. This code exists to assert when
        // that occurs, and attempt to provide more helpful feedback. The alternative
        // is tricky to debug partially observable properties.
        if (!isDescriptor && keyName in obj) {
          maybeMandatoryDescriptor = emberUtils.lookupDescriptor(obj, keyName);


          if (maybeMandatoryDescriptor.set && maybeMandatoryDescriptor.set.isMandatorySetter) {
            if (maybeMandatoryDescriptor.get && maybeMandatoryDescriptor.get.isInheritingGetter) {
              possibleValue = meta$$1.readInheritedValue('values', keyName);

              if (possibleValue === UNDEFINED) {
                delete obj[keyName];
                return;
              }
            }

            Object.defineProperty(obj, keyName, {
              configurable: true,
              enumerable: Object.prototype.propertyIsEnumerable.call(obj, keyName),
              writable: true,
              value: meta$$1.peekValues(keyName)
            });
            meta$$1.deleteFromValues(keyName);
          }
        }
      }
    } else if (count > 1) {
      meta$$1.writeWatching(keyName, count - 1);
    }
  }

  function makeChainNode(obj) {
    return new ChainNode(null, null, obj);
  }

  function watchPath(obj, keyPath, meta$$1) {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }
    var m = meta$$1 === undefined ? meta(obj) : meta$$1;
    var counter = m.peekWatching(keyPath) || 0;

    m.writeWatching(keyPath, counter + 1);
    if (counter === 0) {
      // activate watching first time
      m.writableChains(makeChainNode).add(keyPath);
    }
  }

  function unwatchPath(obj, keyPath, meta$$1) {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }
    var m = meta$$1 === undefined ? exports.peekMeta(obj) : meta$$1;

    if (m === undefined) {
      return;
    }
    var counter = m.peekWatching(keyPath) || 0;

    if (counter === 1) {
      m.writeWatching(keyPath, 0);
      m.writableChains(makeChainNode).remove(keyPath);
    } else if (counter > 1) {
      m.writeWatching(keyPath, counter - 1);
    }
  }

  var FIRST_KEY = /^([^\.]+)/;

  function firstKey(path) {
    return path.match(FIRST_KEY)[0];
  }

  function isObject(obj) {
    return typeof obj === 'object' && obj !== null;
  }

  function isVolatile(obj) {
    return !(isObject(obj) && obj.isDescriptor && obj._volatile === false);
  }

  var ChainWatchers = function () {
    function ChainWatchers() {

      // chain nodes that reference a key in this obj by key
      // we only create ChainWatchers when we are going to add them
      // so create this upfront
      this.chains = Object.create(null);
    }

    ChainWatchers.prototype.add = function (key, node) {
      var nodes = this.chains[key];
      if (nodes === undefined) {
        this.chains[key] = [node];
      } else {
        nodes.push(node);
      }
    };

    ChainWatchers.prototype.remove = function (key, node) {
      var nodes = this.chains[key],
          i;
      if (nodes !== undefined) {
        for (i = 0; i < nodes.length; i++) {
          if (nodes[i] === node) {
            nodes.splice(i, 1);
            break;
          }
        }
      }
    };

    ChainWatchers.prototype.has = function (key, node) {
      var nodes = this.chains[key],
          i;
      if (nodes !== undefined) {
        for (i = 0; i < nodes.length; i++) {
          if (nodes[i] === node) {
            return true;
          }
        }
      }
      return false;
    };

    ChainWatchers.prototype.revalidateAll = function () {
      for (var key in this.chains) {
        this.notify(key, true, undefined);
      }
    };

    ChainWatchers.prototype.revalidate = function (key) {
      this.notify(key, true, undefined);
    };

    // key: the string key that is part of a path changed
    // revalidate: boolean; the chains that are watching this value should revalidate
    // callback: function that will be called with the object and path that
    //           will be/are invalidated by this key change, depending on
    //           whether the revalidate flag is passed


    ChainWatchers.prototype.notify = function (key, revalidate, callback) {
      var nodes = this.chains[key],
          i,
          _i,
          obj,
          path;
      if (nodes === undefined || nodes.length === 0) {
        return;
      }

      var affected = void 0;

      if (callback) {
        affected = [];
      }

      for (i = 0; i < nodes.length; i++) {
        nodes[i].notify(revalidate, affected);
      }

      if (callback === undefined) {
        return;
      }

      // we gather callbacks so we don't notify them during revalidation
      for (_i = 0; _i < affected.length; _i += 2) {
        obj = affected[_i];
        path = affected[_i + 1];

        callback(obj, path);
      }
    };

    return ChainWatchers;
  }();

  function makeChainWatcher() {
    return new ChainWatchers();
  }

  function addChainWatcher(obj, keyName, node) {
    var m = meta(obj);
    m.writableChainWatchers(makeChainWatcher).add(keyName, node);
    watchKey(obj, keyName, m);
  }

  function removeChainWatcher(obj, keyName, node, _meta) {
    if (!isObject(obj)) {
      return;
    }

    var meta$$1 = _meta === undefined ? exports.peekMeta(obj) : _meta;

    if (meta$$1 === undefined || meta$$1.readableChainWatchers() === undefined) {
      return;
    }

    // make meta writable
    meta$$1 = meta(obj);

    meta$$1.readableChainWatchers().remove(keyName, node);

    unwatchKey(obj, keyName, meta$$1);
  }

  // A ChainNode watches a single key on an object. If you provide a starting
  // value for the key then the node won't actually watch it. For a root node
  // pass null for parent and key and object for value.

  var ChainNode = function () {
    function ChainNode(parent, key, value) {

      this._parent = parent;
      this._key = key;

      // _watching is true when calling get(this._parent, this._key) will
      // return the value of this node.
      //
      // It is false for the root of a chain (because we have no parent)
      // and for global paths (because the parent node is the object with
      // the observer on it)
      var isWatching = this._watching = value === undefined,
          obj;

      this._chains = undefined;
      this._object = undefined;
      this.count = 0;

      this._value = value;
      this._paths = undefined;
      if (isWatching) {
        obj = parent.value();


        if (!isObject(obj)) {
          return;
        }

        this._object = obj;

        addChainWatcher(this._object, this._key, this);
      }
    }

    ChainNode.prototype.value = function () {
      var obj;

      if (this._value === undefined && this._watching) {
        obj = this._parent.value();

        this._value = lazyGet(obj, this._key);
      }
      return this._value;
    };

    ChainNode.prototype.destroy = function () {
      if (this._watching) {
        removeChainWatcher(this._object, this._key, this);
        this._watching = false; // so future calls do nothing
      }
    };

    // copies a top level object only


    ChainNode.prototype.copy = function (obj) {
      var ret = new ChainNode(null, null, obj),
          path;
      var paths = this._paths;
      if (paths !== undefined) {
        path = void 0;

        for (path in paths) {
          if (paths[path] > 0) {
            ret.add(path);
          }
        }
      }
      return ret;
    };

    // called on the root node of a chain to setup watchers on the specified
    // path.


    ChainNode.prototype.add = function (path) {
      var paths = this._paths || (this._paths = {});
      paths[path] = (paths[path] || 0) + 1;

      var key = firstKey(path);
      var tail = path.slice(key.length + 1);

      this.chain(key, tail);
    };

    // called on the root node of a chain to teardown watcher on the specified
    // path


    ChainNode.prototype.remove = function (path) {
      var paths = this._paths;
      if (paths === undefined) {
        return;
      }
      if (paths[path] > 0) {
        paths[path]--;
      }

      var key = firstKey(path);
      var tail = path.slice(key.length + 1);

      this.unchain(key, tail);
    };

    ChainNode.prototype.chain = function (key, path) {
      var chains = this._chains;
      var node = void 0;
      if (chains === undefined) {
        chains = this._chains = Object.create(null);
      } else {
        node = chains[key];
      }

      if (node === undefined) {
        node = chains[key] = new ChainNode(this, key, undefined);
      }

      node.count++; // count chains...

      // chain rest of path if there is one
      if (path) {
        key = firstKey(path);
        path = path.slice(key.length + 1);
        node.chain(key, path);
      }
    };

    ChainNode.prototype.unchain = function (key, path) {
      var chains = this._chains,
          nextKey,
          nextPath;
      var node = chains[key];

      // unchain rest of path first...
      if (path && path.length > 1) {
        nextKey = firstKey(path);
        nextPath = path.slice(nextKey.length + 1);

        node.unchain(nextKey, nextPath);
      }

      // delete node if needed.
      node.count--;
      if (node.count <= 0) {
        chains[node._key] = undefined;
        node.destroy();
      }
    };

    ChainNode.prototype.notify = function (revalidate, affected) {
      if (revalidate && this._watching) {
        parentValue = this._parent.value();


        if (parentValue !== this._object) {
          removeChainWatcher(this._object, this._key, this);

          if (isObject(parentValue)) {
            this._object = parentValue;
            addChainWatcher(parentValue, this._key, this);
          } else {
            this._object = undefined;
          }
        }
        this._value = undefined;
      }

      // then notify chains...
      var chains = this._chains,
          parentValue,
          node;
      if (chains !== undefined) {
        node = void 0;

        for (var key in chains) {
          node = chains[key];
          if (node !== undefined) {
            node.notify(revalidate, affected);
          }
        }
      }

      if (affected && this._parent) {
        this._parent.populateAffected(this._key, 1, affected);
      }
    };

    ChainNode.prototype.populateAffected = function (path, depth, affected) {
      if (this._key) {
        path = this._key + '.' + path;
      }

      if (this._parent) {
        this._parent.populateAffected(path, depth + 1, affected);
      } else if (depth > 1) {
        affected.push(this.value(), path);
      }
    };

    return ChainNode;
  }();

  function lazyGet(obj, key) {
    if (!isObject(obj)) {
      return;
    }

    var meta$$1 = exports.peekMeta(obj),
        cache;

    // check if object meant only to be a prototype
    if (meta$$1 !== undefined && meta$$1.proto === obj) {
      return;
    }

    // Use `get` if the return value is an EachProxy or an uncacheable value.
    if (isVolatile(obj[key])) {
      return get(obj, key);
      // Otherwise attempt to get the cached value of the computed property
    } else {
      cache = meta$$1.readableCache();

      if (cache !== undefined) {
        return cacheFor.get(cache, key);
      }
    }
  }

  var counters = void 0;
  {
    counters = {
      peekCalls: 0,
      peekParentCalls: 0,
      peekPrototypeWalks: 0,
      setCalls: 0,
      deleteCalls: 0,
      metaCalls: 0,
      metaInstantiated: 0
    };
  }

  /**
  @module ember
  */

  var UNDEFINED = emberUtils.symbol('undefined');

  // FLAGS
  var SOURCE_DESTROYING = 1 << 1;
  var SOURCE_DESTROYED = 1 << 2;
  var META_DESTROYED = 1 << 3;
  var IS_PROXY = 1 << 4;

  var META_FIELD = '__ember_meta__';
  var NODE_STACK = [];

  var Meta = function () {
    function Meta(obj, parentMeta) {

      {
        counters.metaInstantiated++;
      }

      this._cache = undefined;
      this._weak = undefined;
      this._watching = undefined;
      this._mixins = undefined;
      this._bindings = undefined;
      this._values = undefined;
      this._deps = undefined;
      this._chainWatchers = undefined;
      this._chains = undefined;
      this._tag = undefined;
      this._tags = undefined;
      this._factory = undefined;

      // initial value for all flags right now is false
      // see FLAGS const for detailed list of flags used
      this._flags = 0;

      // used only internally
      this.source = obj;

      // when meta(obj).proto === obj, the object is intended to be only a
      // prototype and doesn't need to actually be observable itself
      this.proto = undefined;

      // The next meta in our inheritance chain. We (will) track this
      // explicitly instead of using prototypical inheritance because we
      // have detailed knowledge of how each property should really be
      // inherited, and we can optimize it much better than JS runtimes.
      this.parent = parentMeta;

      this._listeners = undefined;
      this._listenersFinalized = false;
      this._suspendedListeners = undefined;
    }

    Meta.prototype.isInitialized = function (obj) {
      return this.proto !== obj;
    };

    Meta.prototype.destroy = function () {
      if (this.isMetaDestroyed()) {
        return;
      }

      // remove chainWatchers to remove circular references that would prevent GC
      var nodes = void 0,
          key = void 0,
          nodeObject = void 0,
          foreignMeta;
      var node = this.readableChains();
      if (node !== undefined) {
        NODE_STACK.push(node);
        // process tree
        while (NODE_STACK.length > 0) {
          node = NODE_STACK.pop();
          // push children
          nodes = node._chains;
          if (nodes !== undefined) {
            for (key in nodes) {
              if (nodes[key] !== undefined) {
                NODE_STACK.push(nodes[key]);
              }
            }
          }

          // remove chainWatcher in node object
          if (node._watching) {
            nodeObject = node._object;
            if (nodeObject !== undefined) {
              foreignMeta = exports.peekMeta(nodeObject);
              // avoid cleaning up chain watchers when both current and
              // foreign objects are being destroyed
              // if both are being destroyed manual cleanup is not needed
              // as they will be GC'ed and no non-destroyed references will
              // be remaining

              if (foreignMeta && !foreignMeta.isSourceDestroying()) {
                removeChainWatcher(nodeObject, node._key, node, foreignMeta);
              }
            }
          }
        }
      }

      this.setMetaDestroyed();
    };

    Meta.prototype.isSourceDestroying = function () {
      return (this._flags & SOURCE_DESTROYING) !== 0;
    };

    Meta.prototype.setSourceDestroying = function () {
      this._flags |= SOURCE_DESTROYING;
    };

    Meta.prototype.isSourceDestroyed = function () {
      return (this._flags & SOURCE_DESTROYED) !== 0;
    };

    Meta.prototype.setSourceDestroyed = function () {
      this._flags |= SOURCE_DESTROYED;
    };

    Meta.prototype.isMetaDestroyed = function () {
      return (this._flags & META_DESTROYED) !== 0;
    };

    Meta.prototype.setMetaDestroyed = function () {
      this._flags |= META_DESTROYED;
    };

    Meta.prototype.isProxy = function () {
      return (this._flags & IS_PROXY) !== 0;
    };

    Meta.prototype.setProxy = function () {
      this._flags |= IS_PROXY;
    };

    Meta.prototype._getOrCreateOwnMap = function (key) {
      return this[key] || (this[key] = Object.create(null));
    };

    Meta.prototype._getInherited = function (key) {
      var pointer = this,
          map;
      while (pointer !== undefined) {
        map = pointer[key];

        if (map !== undefined) {
          return map;
        }
        pointer = pointer.parent;
      }
    };

    Meta.prototype._findInherited = function (key, subkey) {
      var pointer = this,
          map,
          value;
      while (pointer !== undefined) {
        map = pointer[key];

        if (map !== undefined) {
          value = map[subkey];

          if (value !== undefined) {
            return value;
          }
        }
        pointer = pointer.parent;
      }
    };

    // Implements a member that provides a lazily created map of maps,
    // with inheritance at both levels.


    Meta.prototype.writeDeps = function (subkey, itemkey, value) {
      true && !!this.isMetaDestroyed() && emberDebug.assert('Cannot modify dependent keys for `' + itemkey + '` on `' + emberUtils.toString(this.source) + '` after it has been destroyed.', !this.isMetaDestroyed());

      var outerMap = this._getOrCreateOwnMap('_deps');
      var innerMap = outerMap[subkey];
      if (innerMap === undefined) {
        innerMap = outerMap[subkey] = Object.create(null);
      }
      innerMap[itemkey] = value;
    };

    Meta.prototype.peekDeps = function (subkey, itemkey) {
      var pointer = this,
          map,
          value,
          itemvalue;
      while (pointer !== undefined) {
        map = pointer._deps;

        if (map !== undefined) {
          value = map[subkey];

          if (value !== undefined) {
            itemvalue = value[itemkey];

            if (itemvalue !== undefined) {
              return itemvalue;
            }
          }
        }
        pointer = pointer.parent;
      }
    };

    Meta.prototype.hasDeps = function (subkey) {
      var pointer = this,
          deps;
      while (pointer !== undefined) {
        deps = pointer._deps;

        if (deps !== undefined && deps[subkey] !== undefined) {
          return true;
        }
        pointer = pointer.parent;
      }
      return false;
    };

    Meta.prototype.forEachInDeps = function (subkey, fn) {
      return this._forEachIn('_deps', subkey, fn);
    };

    Meta.prototype._forEachIn = function (key, subkey, fn) {
      var pointer = this,
          map,
          innerMap,
          i;
      var seen = void 0;
      var calls = void 0;
      while (pointer !== undefined) {
        map = pointer[key];

        if (map !== undefined) {
          innerMap = map[subkey];

          if (innerMap !== undefined) {
            for (var innerKey in innerMap) {
              seen = seen || Object.create(null);
              if (seen[innerKey] === undefined) {
                seen[innerKey] = true;
                calls = calls || [];
                calls.push(innerKey, innerMap[innerKey]);
              }
            }
          }
        }
        pointer = pointer.parent;
      }

      if (calls !== undefined) {
        for (i = 0; i < calls.length; i += 2) {
          fn(calls[i], calls[i + 1]);
        }
      }
    };

    Meta.prototype.writableCache = function () {
      return this._getOrCreateOwnMap('_cache');
    };

    Meta.prototype.readableCache = function () {
      return this._cache;
    };

    Meta.prototype.writableWeak = function () {
      return this._getOrCreateOwnMap('_weak');
    };

    Meta.prototype.readableWeak = function () {
      return this._weak;
    };

    Meta.prototype.writableTags = function () {
      return this._getOrCreateOwnMap('_tags');
    };

    Meta.prototype.readableTags = function () {
      return this._tags;
    };

    Meta.prototype.writableTag = function (create) {
      true && !!this.isMetaDestroyed() && emberDebug.assert('Cannot create a new tag for `' + emberUtils.toString(this.source) + '` after it has been destroyed.', !this.isMetaDestroyed());

      var ret = this._tag;
      if (ret === undefined) {
        ret = this._tag = create(this.source);
      }
      return ret;
    };

    Meta.prototype.readableTag = function () {
      return this._tag;
    };

    Meta.prototype.writableChainWatchers = function (create) {
      true && !!this.isMetaDestroyed() && emberDebug.assert('Cannot create a new chain watcher for `' + emberUtils.toString(this.source) + '` after it has been destroyed.', !this.isMetaDestroyed());

      var ret = this._chainWatchers;
      if (ret === undefined) {
        ret = this._chainWatchers = create(this.source);
      }
      return ret;
    };

    Meta.prototype.readableChainWatchers = function () {
      return this._chainWatchers;
    };

    Meta.prototype.writableChains = function (create) {
      true && !!this.isMetaDestroyed() && emberDebug.assert('Cannot create a new chains for `' + emberUtils.toString(this.source) + '` after it has been destroyed.', !this.isMetaDestroyed());

      var ret = this._chains;
      if (ret === undefined) {
        if (this.parent === undefined) {
          ret = create(this.source);
        } else {
          ret = this.parent.writableChains(create).copy(this.source);
        }
        this._chains = ret;
      }
      return ret;
    };

    Meta.prototype.readableChains = function () {
      return this._getInherited('_chains');
    };

    Meta.prototype.writeWatching = function (subkey, value) {
      true && !!this.isMetaDestroyed() && emberDebug.assert('Cannot update watchers for `' + subkey + '` on `' + emberUtils.toString(this.source) + '` after it has been destroyed.', !this.isMetaDestroyed());

      var map = this._getOrCreateOwnMap('_watching');
      map[subkey] = value;
    };

    Meta.prototype.peekWatching = function (subkey) {
      return this._findInherited('_watching', subkey);
    };

    Meta.prototype.writeMixins = function (subkey, value) {
      true && !!this.isMetaDestroyed() && emberDebug.assert('Cannot add mixins for `' + subkey + '` on `' + emberUtils.toString(this.source) + '` call writeMixins after it has been destroyed.', !this.isMetaDestroyed());

      var map = this._getOrCreateOwnMap('_mixins');
      map[subkey] = value;
    };

    Meta.prototype.peekMixins = function (subkey) {
      return this._findInherited('_mixins', subkey);
    };

    Meta.prototype.forEachMixins = function (fn) {
      var pointer = this,
          map;
      var seen = void 0;
      while (pointer !== undefined) {
        map = pointer._mixins;

        if (map !== undefined) {
          for (var key in map) {
            seen = seen || Object.create(null);
            if (seen[key] === undefined) {
              seen[key] = true;
              fn(key, map[key]);
            }
          }
        }
        pointer = pointer.parent;
      }
    };

    Meta.prototype.writeBindings = function (subkey, value) {
      true && !!this.isMetaDestroyed() && emberDebug.assert('Cannot add a binding for `' + subkey + '` on `' + emberUtils.toString(this.source) + '` after it has been destroyed.', !this.isMetaDestroyed());

      var map = this._getOrCreateOwnMap('_bindings');
      map[subkey] = value;
    };

    Meta.prototype.peekBindings = function (subkey) {
      return this._findInherited('_bindings', subkey);
    };

    Meta.prototype.forEachBindings = function (fn) {
      var pointer = this,
          map;
      var seen = void 0;
      while (pointer !== undefined) {
        map = pointer._bindings;

        if (map !== undefined) {
          for (var key in map) {
            seen = seen || Object.create(null);
            if (seen[key] === undefined) {
              seen[key] = true;
              fn(key, map[key]);
            }
          }
        }
        pointer = pointer.parent;
      }
    };

    Meta.prototype.clearBindings = function () {
      true && !!this.isMetaDestroyed() && emberDebug.assert('Cannot clear bindings on `' + emberUtils.toString(this.source) + '` after it has been destroyed.', !this.isMetaDestroyed());

      this._bindings = undefined;
    };

    Meta.prototype.writeValues = function (subkey, value) {
      true && !!this.isMetaDestroyed() && emberDebug.assert('Cannot set the value of `' + subkey + '` on `' + emberUtils.toString(this.source) + '` after it has been destroyed.', !this.isMetaDestroyed());

      var map = this._getOrCreateOwnMap('_values');
      map[subkey] = value;
    };

    Meta.prototype.peekValues = function (subkey) {
      return this._findInherited('_values', subkey);
    };

    Meta.prototype.deleteFromValues = function (subkey) {
      delete this._getOrCreateOwnMap('_values')[subkey];
    };

    emberBabel.createClass(Meta, [{
      key: 'factory',
      set: function (factory) {
        this._factory = factory;
      },
      get: function () {
        return this._factory;
      }
    }]);

    return Meta;
  }();

  for (var name in protoMethods) {
    Meta.prototype[name] = protoMethods[name];
  }

  var META_DESC = {
    writable: true,
    configurable: true,
    enumerable: false,
    value: null
  };

  var EMBER_META_PROPERTY = {
    name: META_FIELD,
    descriptor: META_DESC
  };

  if (ember_features.MANDATORY_SETTER) {
    Meta.prototype.readInheritedValue = function (key, subkey) {

      var pointer = this,
          map,
          value;

      while (pointer !== undefined) {
        map = pointer['_' + key];

        if (map !== undefined) {
          value = map[subkey];

          if (value !== undefined || subkey in map) {
            return value;
          }
        }
        pointer = pointer.parent;
      }

      return UNDEFINED;
    };

    Meta.prototype.writeValue = function (obj, key, value) {
      var descriptor = emberUtils.lookupDescriptor(obj, key);
      var isMandatorySetter = descriptor !== null && descriptor.set && descriptor.set.isMandatorySetter;

      if (isMandatorySetter) {
        this.writeValues(key, value);
      } else {
        obj[key] = value;
      }
    };
  }

  var setMeta = void 0;
  exports.peekMeta = void 0;

  // choose the one appropriate for given platform
  if (emberUtils.HAS_NATIVE_WEAKMAP) {
    getPrototypeOf = Object.getPrototypeOf;
    metaStore = new WeakMap();


    setMeta = function (obj, meta) {
      {
        counters.setCalls++;
      }
      metaStore.set(obj, meta);
    };

    exports.peekMeta = function (obj) {
      var pointer = obj;
      var meta = void 0;
      while (pointer !== undefined && pointer !== null) {
        meta = metaStore.get(pointer);
        // jshint loopfunc:true
        {
          counters.peekCalls++;
        }
        if (meta !== undefined) {
          return meta;
        }

        pointer = getPrototypeOf(pointer);
        {
          counters.peekPrototypeWalks++;
        }
      }
    };
  } else {
    setMeta = function (obj, meta) {
      if (obj.__defineNonEnumerable) {
        obj.__defineNonEnumerable(EMBER_META_PROPERTY);
      } else {
        Object.defineProperty(obj, META_FIELD, META_DESC);
      }

      obj[META_FIELD] = meta;
    };

    exports.peekMeta = function (obj) {
      return obj[META_FIELD];
    };
  }

  /**
    Tears down the meta on an object so that it can be garbage collected.
    Multiple calls will have no effect.
  
    @method deleteMeta
    @for Ember
    @param {Object} obj  the object to destroy
    @return {void}
    @private
  */


  /**
    Retrieves the meta hash for an object. If `writable` is true ensures the
    hash is writable for this object as well.
  
    The meta object contains information about computed property descriptors as
    well as any watched properties and other information. You generally will
    not access this information directly but instead work with higher level
    methods that manipulate this hash indirectly.
  
    @method meta
    @for Ember
    @private
  
    @param {Object} obj The object to retrieve meta for
    @param {Boolean} [writable=true] Pass `false` if you do not intend to modify
      the meta hash, allowing the method to avoid making an unnecessary copy.
    @return {Object} the meta hash for an object
  */
  function meta(obj) {
    {
      counters.metaCalls++;
    }

    var maybeMeta = exports.peekMeta(obj);
    var parent = void 0;

    // remove this code, in-favor of explicit parent
    if (maybeMeta !== undefined) {
      if (maybeMeta.source === obj) {
        return maybeMeta;
      }
      parent = maybeMeta;
    }

    var newMeta = new Meta(obj, parent);
    setMeta(obj, newMeta);
    return newMeta;
  }

  var Cache = function () {
    function Cache(limit, func, key, store) {

      this.size = 0;
      this.misses = 0;
      this.hits = 0;
      this.limit = limit;
      this.func = func;
      this.key = key;
      this.store = store || new DefaultStore();
    }

    Cache.prototype.get = function (obj) {
      var key = this.key === undefined ? obj : this.key(obj);
      var value = this.store.get(key);
      if (value === undefined) {
        this.misses++;
        value = this._set(key, this.func(obj));
      } else if (value === UNDEFINED) {
        this.hits++;
        value = undefined;
      } else {
        this.hits++;
        // nothing to translate
      }

      return value;
    };

    Cache.prototype.set = function (obj, value) {
      var key = this.key === undefined ? obj : this.key(obj);
      return this._set(key, value);
    };

    Cache.prototype._set = function (key, value) {
      if (this.limit > this.size) {
        this.size++;
        if (value === undefined) {
          this.store.set(key, UNDEFINED);
        } else {
          this.store.set(key, value);
        }
      }

      return value;
    };

    Cache.prototype.purge = function () {
      this.store.clear();
      this.size = 0;
      this.hits = 0;
      this.misses = 0;
    };

    return Cache;
  }();

  var DefaultStore = function () {
    function DefaultStore() {

      this.data = Object.create(null);
    }

    DefaultStore.prototype.get = function (key) {
      return this.data[key];
    };

    DefaultStore.prototype.set = function (key, value) {
      this.data[key] = value;
    };

    DefaultStore.prototype.clear = function () {
      this.data = Object.create(null);
    };

    return DefaultStore;
  }();

  var IS_GLOBAL_PATH = /^[A-Z$].*[\.]/;

  var isGlobalPathCache = new Cache(1000, function (key) {
    return IS_GLOBAL_PATH.test(key);
  });
  var firstDotIndexCache = new Cache(1000, function (key) {
    return key.indexOf('.');
  });

  var firstKeyCache = new Cache(1000, function (path) {
    var index = firstDotIndexCache.get(path);
    return index === -1 ? path : path.slice(0, index);
  });

  var tailPathCache = new Cache(1000, function (path) {
    var index = firstDotIndexCache.get(path);
    return index === -1 ? undefined : path.slice(index + 1);
  });

  function isGlobalPath(path) {
    return isGlobalPathCache.get(path);
  }

  function isPath(path) {
    return firstDotIndexCache.get(path) !== -1;
  }

  function getFirstKey(path) {
    return firstKeyCache.get(path);
  }

  function getTailPath(path) {
    return tailPathCache.get(path);
  }

  /**
  @module @ember/object
  */

  var ALLOWABLE_TYPES = {
    object: true,
    function: true,
    string: true
  };

  // ..........................................................
  // GET AND SET
  //
  // If we are on a platform that supports accessors we can use those.
  // Otherwise simulate accessors by looking up the property directly on the
  // object.

  /**
    Gets the value of a property on an object. If the property is computed,
    the function will be invoked. If the property is not defined but the
    object implements the `unknownProperty` method then that will be invoked.
  
    ```javascript
    Ember.get(obj, "name");
    ```
  
    If you plan to run on IE8 and older browsers then you should use this
    method anytime you want to retrieve a property on an object that you don't
    know for sure is private. (Properties beginning with an underscore '_'
    are considered private.)
  
    On all newer browsers, you only need to use this method to retrieve
    properties if the property might not be defined on the object and you want
    to respect the `unknownProperty` handler. Otherwise you can ignore this
    method.
  
    Note that if the object itself is `undefined`, this method will throw
    an error.
  
    @method get
    @for @ember/object
    @static
    @param {Object} obj The object to retrieve from.
    @param {String} keyName The property key to retrieve
    @return {Object} the property value or `null`.
    @public
  */
  function get(obj, keyName) {
    true && !(arguments.length === 2) && emberDebug.assert('Get must be called with two arguments; an object and a property key', arguments.length === 2);
    true && !(obj !== undefined && obj !== null) && emberDebug.assert('Cannot call get with \'' + keyName + '\' on an undefined object.', obj !== undefined && obj !== null);
    true && !(typeof keyName === 'string') && emberDebug.assert('The key provided to get must be a string, you passed ' + keyName, typeof keyName === 'string');
    true && !(keyName.lastIndexOf('this.', 0) !== 0) && emberDebug.assert('\'this\' in paths is not supported', keyName.lastIndexOf('this.', 0) !== 0);
    true && !(keyName !== '') && emberDebug.assert('Cannot call `Ember.get` with an empty string', keyName !== '');

    var value = obj[keyName];
    var isDescriptor = value !== null && typeof value === 'object' && value.isDescriptor;

    if (isDescriptor) {
      return value.get(obj, keyName);
    } else if (isPath(keyName)) {
      return _getPath(obj, keyName);
    } else if (value === undefined && 'object' === typeof obj && !(keyName in obj) && typeof obj.unknownProperty === 'function') {
      return obj.unknownProperty(keyName);
    } else {
      return value;
    }
  }

  function _getPath(root, path, forSet) {
    var obj = root,
        i,
        part;
    var parts = path.split('.');

    for (i = 0; i < parts.length; i++) {
      if (!isGettable(obj)) {
        return undefined;
      }

      part = parts[i];

      if (forSet && (part === '__proto__' || part === 'constructor')) {
        return;
      }

      obj = get(obj, part);

      if (obj && obj.isDestroyed) {
        return undefined;
      }
    }

    return obj;
  }

  function isGettable(obj) {
    return obj !== undefined && obj !== null && ALLOWABLE_TYPES[typeof obj];
  }

  /**
    Retrieves the value of a property from an Object, or a default value in the
    case that the property returns `undefined`.
  
    ```javascript
    Ember.getWithDefault(person, 'lastName', 'Doe');
    ```
  
    @method getWithDefault
    @for @ember/object
    @static
    @param {Object} obj The object to retrieve from.
    @param {String} keyName The name of the property to retrieve
    @param {Object} defaultValue The value to return if the property value is undefined
    @return {Object} The property value or the defaultValue.
    @public
  */


  /**
   @module @ember/object
  */
  /**
    Sets the value of a property on an object, respecting computed properties
    and notifying observers and other listeners of the change. If the
    property is not defined but the object implements the `setUnknownProperty`
    method then that will be invoked as well.
  
    ```javascript
    Ember.set(obj, "name", value);
    ```
  
    @method set
    @static
    @for @ember/object
    @param {Object} obj The object to modify.
    @param {String} keyName The property key to set
    @param {Object} value The value to set
    @return {Object} the passed value.
    @public
  */
  function set(obj, keyName, value, tolerant) {
    true && !(arguments.length === 3 || arguments.length === 4) && emberDebug.assert('Set must be called with three or four arguments; an object, a property key, a value and tolerant true/false', arguments.length === 3 || arguments.length === 4);
    true && !(obj && typeof obj === 'object' || typeof obj === 'function') && emberDebug.assert('Cannot call set with \'' + keyName + '\' on an undefined object.', obj && typeof obj === 'object' || typeof obj === 'function');
    true && !(typeof keyName === 'string') && emberDebug.assert('The key provided to set must be a string, you passed ' + keyName, typeof keyName === 'string');
    true && !(keyName.lastIndexOf('this.', 0) !== 0) && emberDebug.assert('\'this\' in paths is not supported', keyName.lastIndexOf('this.', 0) !== 0);
    true && !!obj.isDestroyed && emberDebug.assert('calling set on destroyed object: ' + emberUtils.toString(obj) + '.' + keyName + ' = ' + emberUtils.toString(value), !obj.isDestroyed);

    if (isPath(keyName)) {
      return setPath(obj, keyName, value, tolerant);
    }

    var currentValue = obj[keyName],
        meta$$1;
    var isDescriptor = currentValue !== null && typeof currentValue === 'object' && currentValue.isDescriptor;

    if (isDescriptor) {
      /* computed property */
      currentValue.set(obj, keyName, value);
    } else if (currentValue === undefined && 'object' === typeof obj && !(keyName in obj) && typeof obj.setUnknownProperty === 'function') {
      /* unknown property */
      obj.setUnknownProperty(keyName, value);
    } else if (!(currentValue === value)) {
      meta$$1 = exports.peekMeta(obj);

      propertyWillChange(obj, keyName, meta$$1);

      if (ember_features.MANDATORY_SETTER) {
        setWithMandatorySetter(meta$$1, obj, keyName, value);
      } else {
        obj[keyName] = value;
      }

      propertyDidChange(obj, keyName, meta$$1);
    }

    return value;
  }

  if (ember_features.MANDATORY_SETTER) {
    setWithMandatorySetter = function (meta$$1, obj, keyName, value) {
      if (meta$$1 !== undefined && meta$$1.peekWatching(keyName) > 0) {
        makeEnumerable(obj, keyName);
        meta$$1.writeValue(obj, keyName, value);
      } else {
        obj[keyName] = value;
      }
    };
    makeEnumerable = function (obj, key) {
      var desc = Object.getOwnPropertyDescriptor(obj, key);

      if (desc && desc.set && desc.set.isMandatorySetter) {
        desc.enumerable = true;
        Object.defineProperty(obj, key, desc);
      }
    };
  }

  function setPath(root, path, value, tolerant) {
    var parts = path.split('.');
    var keyName = parts.pop();

    true && !(keyName.trim().length > 0) && emberDebug.assert('Property set failed: You passed an empty path', keyName.trim().length > 0);

    var newPath = parts.join('.');

    var newRoot = _getPath(root, newPath, true);

    if (newRoot) {
      return set(newRoot, keyName, value);
    } else if (!tolerant) {
      throw new emberDebug.Error('Property set failed: object in path "' + newPath + '" could not be found or was destroyed.');
    }
  }

  /**
    Error-tolerant form of `Ember.set`. Will not blow up if any part of the
    chain is `undefined`, `null`, or destroyed.
  
    This is primarily used when syncing bindings, which may try to update after
    an object has been destroyed.
  
    @method trySet
    @static
    @for @ember/object
    @param {Object} root The object to modify.
    @param {String} path The property path to set
    @param {Object} value The value to set
    @public
  */
  function trySet(root, path, value) {
    return set(root, path, value, true);
  }

  /**
  @module @ember/object
  */

  var END_WITH_EACH_REGEX = /\.@each$/;

  /**
    Expands `pattern`, invoking `callback` for each expansion.
  
    The only pattern supported is brace-expansion, anything else will be passed
    once to `callback` directly.
  
    Example
  
    ```js
    import { expandProperties } from '@ember/object/computed';
  
    function echo(arg){ console.log(arg); }
  
    expandProperties('foo.bar', echo);              //=> 'foo.bar'
    expandProperties('{foo,bar}', echo);            //=> 'foo', 'bar'
    expandProperties('foo.{bar,baz}', echo);        //=> 'foo.bar', 'foo.baz'
    expandProperties('{foo,bar}.baz', echo);        //=> 'foo.baz', 'bar.baz'
    expandProperties('foo.{bar,baz}.[]', echo)      //=> 'foo.bar.[]', 'foo.baz.[]'
    expandProperties('{foo,bar}.{spam,eggs}', echo) //=> 'foo.spam', 'foo.eggs', 'bar.spam', 'bar.eggs'
    expandProperties('{foo}.bar.{baz}')             //=> 'foo.bar.baz'
    ```
  
    @method expandProperties
    @static
    @for @ember/object
    @public
    @param {String} pattern The property pattern to expand.
    @param {Function} callback The callback to invoke.  It is invoked once per
    expansion, and is passed the expansion.
  */
  function expandProperties(pattern, callback) {
    true && !(typeof pattern === 'string') && emberDebug.assert('A computed property key must be a string, you passed ' + typeof pattern + ' ' + pattern, typeof pattern === 'string');
    true && !(pattern.indexOf(' ') === -1) && emberDebug.assert('Brace expanded properties cannot contain spaces, e.g. "user.{firstName, lastName}" should be "user.{firstName,lastName}"', pattern.indexOf(' ') === -1);
    // regex to look for double open, double close, or unclosed braces

    true && !(pattern.match(/\{[^}{]*\{|\}[^}{]*\}|\{[^}]*$/g) === null) && emberDebug.assert('Brace expanded properties have to be balanced and cannot be nested, pattern: ' + pattern, pattern.match(/\{[^}{]*\{|\}[^}{]*\}|\{[^}]*$/g) === null);

    var start = pattern.indexOf('{');
    if (start < 0) {
      callback(pattern.replace(END_WITH_EACH_REGEX, '.[]'));
    } else {
      dive('', pattern, start, callback);
    }
  }

  function dive(prefix, pattern, start, callback) {
    var end = pattern.indexOf('}'),
        i = 0,
        newStart = void 0,
        arrayLength = void 0;
    var tempArr = pattern.substring(start + 1, end).split(',');
    var after = pattern.substring(end + 1);
    prefix = prefix + pattern.substring(0, start);

    arrayLength = tempArr.length;
    while (i < arrayLength) {
      newStart = after.indexOf('{');
      if (newStart < 0) {
        callback((prefix + tempArr[i++] + after).replace(END_WITH_EACH_REGEX, '.[]'));
      } else {
        dive(prefix + tempArr[i++], after, newStart, callback);
      }
    }
  }

  /**
  @module ember
  */
  /**
    Starts watching a property on an object. Whenever the property changes,
    invokes `Ember.propertyWillChange` and `Ember.propertyDidChange`. This is the
    primitive used by observers and dependent keys; usually you will never call
    this method directly but instead use higher level methods like
    `Ember.addObserver()`
  
    @private
    @method watch
    @for Ember
    @param obj
    @param {String} _keyPath
  */
  function watch(obj, _keyPath, m) {
    if (isPath(_keyPath)) {
      watchPath(obj, _keyPath, m);
    } else {
      watchKey(obj, _keyPath, m);
    }
  }

  function watcherCount(obj, key) {
    var meta$$1 = exports.peekMeta(obj);
    return meta$$1 !== undefined && meta$$1.peekWatching(key) || 0;
  }

  function unwatch(obj, _keyPath, m) {
    if (isPath(_keyPath)) {
      unwatchPath(obj, _keyPath, m);
    } else {
      unwatchKey(obj, _keyPath, m);
    }
  }

  // ..........................................................
  // DEPENDENT KEYS
  //

  function addDependentKeys(desc, obj, keyName, meta) {
    // the descriptor has a list of dependent keys, so
    // add all of its dependent keys.
    var depKeys = desc._dependentKeys,
        idx,
        depKey;
    if (depKeys === null || depKeys === undefined) {
      return;
    }

    for (idx = 0; idx < depKeys.length; idx++) {
      depKey = depKeys[idx];
      // Increment the number of times depKey depends on keyName.

      meta.writeDeps(depKey, keyName, (meta.peekDeps(depKey, keyName) || 0) + 1);
      // Watch the depKey
      watch(obj, depKey, meta);
    }
  }

  function removeDependentKeys(desc, obj, keyName, meta) {
    // the descriptor has a list of dependent keys, so
    // remove all of its dependent keys.
    var depKeys = desc._dependentKeys,
        idx,
        depKey;
    if (depKeys === null || depKeys === undefined) {
      return;
    }

    for (idx = 0; idx < depKeys.length; idx++) {
      depKey = depKeys[idx];
      // Decrement the number of times depKey depends on keyName.

      meta.writeDeps(depKey, keyName, (meta.peekDeps(depKey, keyName) || 0) - 1);
      // Unwatch the depKey
      unwatch(obj, depKey, meta);
    }
  }

  /**
  @module @ember/object
  */

  var DEEP_EACH_REGEX = /\.@each\.[^.]+\./;

  /**
    A computed property transforms an object literal with object's accessor function(s) into a property.
  
    By default the function backing the computed property will only be called
    once and the result will be cached. You can specify various properties
    that your computed property depends on. This will force the cached
    result to be recomputed if the dependencies are modified.
  
    In the following example we declare a computed property - `fullName` - by calling
    `computed` with property dependencies (`firstName` and `lastName`) as leading arguments and getter accessor function. The `fullName` getter function
    will be called once (regardless of how many times it is accessed) as long
    as its dependencies have not changed. Once `firstName` or `lastName` are updated
    any future calls (or anything bound) to `fullName` will incorporate the new
    values.
  
    ```javascript
    import EmberObject, { computed } from '@ember/object';
  
    let Person = EmberObject.extend({
      // these will be supplied by `create`
      firstName: null,
      lastName: null,
  
      fullName: computed('firstName', 'lastName', function() {
        let firstName = this.get('firstName'),
            lastName  = this.get('lastName');
  
        return `${firstName} ${lastName}`;
      })
    });
  
    let tom = Person.create({
      firstName: 'Tom',
      lastName: 'Dale'
    });
  
    tom.get('fullName') // 'Tom Dale'
    ```
  
    You can also define what Ember should do when setting a computed property by providing additional function (`set`) in hash argument.
    If you try to set a computed property, it will try to invoke setter accessor function with the key and
    value you want to set it to as arguments.
  
    ```javascript
    import EmberObject, { computed } from '@ember/object';
  
    let Person = EmberObject.extend({
      // these will be supplied by `create`
      firstName: null,
      lastName: null,
  
      fullName: computed('firstName', 'lastName', {
        get(key) {
          let firstName = this.get('firstName'),
              lastName  = this.get('lastName');
  
          return firstName + ' ' + lastName;
        },
        set(key, value) {
          let [firstName, lastName] = value.split(' ');
  
          this.set('firstName', firstName);
          this.set('lastName', lastName);
  
          return value;
        }
      })
    });
  
    let person = Person.create();
  
    person.set('fullName', 'Peter Wagenet');
    person.get('firstName'); // 'Peter'
    person.get('lastName');  // 'Wagenet'
    ```
  
    You can overwrite computed property with normal property (no longer computed), that won't change if dependencies change, if you set computed property and it won't have setter accessor function defined.
  
    You can also mark computed property as `.readOnly()` and block all attempts to set it.
  
    ```javascript
    import EmberObject, { computed } from '@ember/object';
  
    let Person = EmberObject.extend({
      // these will be supplied by `create`
      firstName: null,
      lastName: null,
  
      fullName: computed('firstName', 'lastName', {
        get(key) {
          let firstName = this.get('firstName');
          let lastName  = this.get('lastName');
  
          return firstName + ' ' + lastName;
        }
      }).readOnly()
    });
  
    let person = Person.create();
    person.set('fullName', 'Peter Wagenet'); // Uncaught Error: Cannot set read-only property "fullName" on object: <(...):emberXXX>
    ```
  
    Additional resources:
    - [New CP syntax RFC](https://github.com/emberjs/rfcs/blob/master/text/0011-improved-cp-syntax.md)
    - [New computed syntax explained in "Ember 1.12 released" ](https://emberjs.com/blog/2015/05/13/ember-1-12-released.html#toc_new-computed-syntax)
  
    @class ComputedProperty
    @public
  */
  function ComputedProperty(config, opts) {
    this.isDescriptor = true;
    var hasGetterOnly = typeof config === 'function';
    if (hasGetterOnly) {
      this._getter = config;
    } else {
      true && !(typeof config === 'object' && !Array.isArray(config)) && emberDebug.assert('computed expects a function or an object as last argument.', typeof config === 'object' && !Array.isArray(config));
      true && !Object.keys(config).every(function (key) {
        return key === 'get' || key === 'set';
      }) && emberDebug.assert('Config object passed to computed can only contain `get` or `set` keys.', Object.keys(config).every(function (key) {
        return key === 'get' || key === 'set';
      }));

      this._getter = config.get;
      this._setter = config.set;
    }
    true && !(!!this._getter || !!this._setter) && emberDebug.assert('Computed properties must receive a getter or a setter, you passed none.', !!this._getter || !!this._setter);

    this._suspended = undefined;
    this._meta = undefined;
    this._volatile = false;

    this._dependentKeys = opts && opts.dependentKeys;
    this._readOnly = opts && hasGetterOnly && opts.readOnly === true;
  }

  ComputedProperty.prototype = new Descriptor();
  ComputedProperty.prototype.constructor = ComputedProperty;

  var ComputedPropertyPrototype = ComputedProperty.prototype;

  /**
    Call on a computed property to set it into non-cached mode. When in this
    mode the computed property will not automatically cache the return value.
  
    It also does not automatically fire any change events. You must manually notify
    any changes if you want to observe this property.
  
    Dependency keys have no effect on volatile properties as they are for cache
    invalidation and notification when cached value is invalidated.
  
    ```javascript
    import EmberObject, { computed } from '@ember/object';
  
    let outsideService = EmberObject.extend({
      value: computed(function() {
        return OutsideService.getValue();
      }).volatile()
    }).create();
    ```
  
    @method volatile
    @return {ComputedProperty} this
    @chainable
    @public
  */
  ComputedPropertyPrototype.volatile = function () {
    this._volatile = true;
    return this;
  };

  /**
    Call on a computed property to set it into read-only mode. When in this
    mode the computed property will throw an error when set.
  
    ```javascript
    import EmberObject, { computed } from '@ember/object';
  
    let Person = EmberObject.extend({
      guid: computed(function() {
        return 'guid-guid-guid';
      }).readOnly()
    });
  
    let person = Person.create();
  
    person.set('guid', 'new-guid'); // will throw an exception
    ```
  
    @method readOnly
    @return {ComputedProperty} this
    @chainable
    @public
  */
  ComputedPropertyPrototype.readOnly = function () {
    this._readOnly = true;
    true && !!(this._readOnly && this._setter && this._setter !== this._getter) && emberDebug.assert('Computed properties that define a setter using the new syntax cannot be read-only', !(this._readOnly && this._setter && this._setter !== this._getter));

    return this;
  };

  /**
    Sets the dependent keys on this computed property. Pass any number of
    arguments containing key paths that this computed property depends on.
  
    ```javascript
    import EmberObject, { computed } from '@ember/object';
  
    let President = EmberObject.extend({
      fullName: computed('firstName', 'lastName', function() {
        return this.get('firstName') + ' ' + this.get('lastName');
  
        // Tell Ember that this computed property depends on firstName
        // and lastName
      })
    });
  
    let president = President.create({
      firstName: 'Barack',
      lastName: 'Obama'
    });
  
    president.get('fullName'); // 'Barack Obama'
    ```
  
    @method property
    @param {String} path* zero or more property paths
    @return {ComputedProperty} this
    @chainable
    @public
  */
  ComputedPropertyPrototype.property = function () {
    var args = [],
        i;

    function addArg(property) {
      true && emberDebug.warn('Dependent keys containing @each only work one level deep. ' + ('You used the key "' + property + '" which is invalid. ') + 'Please create an intermediary computed property.', DEEP_EACH_REGEX.test(property) === false, { id: 'ember-metal.computed-deep-each' });

      args.push(property);
    }

    for (i = 0; i < arguments.length; i++) {
      expandProperties(arguments[i], addArg);
    }

    this._dependentKeys = args;
    return this;
  };

  /**
    In some cases, you may want to annotate computed properties with additional
    metadata about how they function or what values they operate on. For example,
    computed property functions may close over variables that are then no longer
    available for introspection.
  
    You can pass a hash of these values to a computed property like this:
  
    ```
    import { computed } from '@ember/object';
    import Person from 'my-app/utils/person';
  
    person: computed(function() {
      let personId = this.get('personId');
      return Person.create({ id: personId });
    }).meta({ type: Person })
    ```
  
    The hash that you pass to the `meta()` function will be saved on the
    computed property descriptor under the `_meta` key. Ember runtime
    exposes a public API for retrieving these values from classes,
    via the `metaForProperty()` function.
  
    @method meta
    @param {Object} meta
    @chainable
    @public
  */
  ComputedPropertyPrototype.meta = function (meta$$1) {
    if (arguments.length === 0) {
      return this._meta || {};
    } else {
      this._meta = meta$$1;
      return this;
    }
  };

  // invalidate cache when CP key changes
  ComputedPropertyPrototype.didChange = function (obj, keyName) {
    // _suspended is set via a CP.set to ensure we don't clear
    // the cached value set by the setter
    if (this._volatile || this._suspended === obj) {
      return;
    }

    // don't create objects just to invalidate
    var meta$$1 = exports.peekMeta(obj);
    if (meta$$1 === undefined || meta$$1.source !== obj) {
      return;
    }

    var cache = meta$$1.readableCache();
    if (cache !== undefined && cache[keyName] !== undefined) {
      cache[keyName] = undefined;
      removeDependentKeys(this, obj, keyName, meta$$1);
    }
  };

  ComputedPropertyPrototype.get = function (obj, keyName) {
    if (this._volatile) {
      return this._getter.call(obj, keyName);
    }

    var meta$$1 = meta(obj);
    var cache = meta$$1.writableCache();

    var result = cache[keyName];
    if (result === UNDEFINED) {
      return undefined;
    } else if (result !== undefined) {
      return result;
    }

    var ret = this._getter.call(obj, keyName);

    cache[keyName] = ret === undefined ? UNDEFINED : ret;

    var chainWatchers = meta$$1.readableChainWatchers();
    if (chainWatchers !== undefined) {
      chainWatchers.revalidate(keyName);
    }
    addDependentKeys(this, obj, keyName, meta$$1);

    return ret;
  };

  ComputedPropertyPrototype.set = function (obj, keyName, value) {
    if (this._readOnly) {
      this._throwReadOnlyError(obj, keyName);
    }

    if (!this._setter) {
      return this.clobberSet(obj, keyName, value);
    }

    if (this._volatile) {
      return this.volatileSet(obj, keyName, value);
    }

    return this.setWithSuspend(obj, keyName, value);
  };

  ComputedPropertyPrototype._throwReadOnlyError = function (obj, keyName) {
    throw new emberDebug.Error('Cannot set read-only property "' + keyName + '" on object: ' + emberUtils.inspect(obj));
  };

  ComputedPropertyPrototype.clobberSet = function (obj, keyName, value) {
    var cachedValue = cacheFor(obj, keyName);
    defineProperty(obj, keyName, null, cachedValue);
    set(obj, keyName, value);
    return value;
  };

  ComputedPropertyPrototype.volatileSet = function (obj, keyName, value) {
    return this._setter.call(obj, keyName, value);
  };

  ComputedPropertyPrototype.setWithSuspend = function (obj, keyName, value) {
    var oldSuspended = this._suspended;
    this._suspended = obj;
    try {
      return this._set(obj, keyName, value);
    } finally {
      this._suspended = oldSuspended;
    }
  };

  ComputedPropertyPrototype._set = function (obj, keyName, value) {
    var meta$$1 = meta(obj);
    var cache = meta$$1.writableCache();

    var val = cache[keyName];
    var hadCachedValue = val !== undefined;

    var cachedValue = void 0;
    if (hadCachedValue && val !== UNDEFINED) {
      cachedValue = val;
    }

    var ret = this._setter.call(obj, keyName, value, cachedValue);

    // allows setter to return the same value that is cached already
    if (hadCachedValue && cachedValue === ret) {
      return ret;
    }

    propertyWillChange(obj, keyName, meta$$1);

    if (!hadCachedValue) {
      addDependentKeys(this, obj, keyName, meta$$1);
    }

    cache[keyName] = ret === undefined ? UNDEFINED : ret;

    propertyDidChange(obj, keyName, meta$$1);

    return ret;
  };

  /* called before property is overridden */
  ComputedPropertyPrototype.teardown = function (obj, keyName, meta$$1) {
    if (this._volatile) {
      return;
    }
    var cache = meta$$1.readableCache();
    if (cache !== undefined && cache[keyName] !== undefined) {
      removeDependentKeys(this, obj, keyName, meta$$1);
      cache[keyName] = undefined;
    }
  };

  /**
    This helper returns a new property descriptor that wraps the passed
    computed property function. You can use this helper to define properties
    with mixins or via `defineProperty()`.
  
    If you pass a function as an argument, it will be used as a getter. A computed
    property defined in this way might look like this:
  
    ```js
    import EmberObject, { computed } from '@ember/object';
  
    let Person = EmberObject.extend({
      init() {
        this._super(...arguments);
  
        this.firstName = 'Betty';
        this.lastName = 'Jones';
      },
  
      fullName: computed('firstName', 'lastName', function() {
        return `${this.get('firstName')} ${this.get('lastName')}`;
      })
    });
  
    let client = Person.create();
  
    client.get('fullName'); // 'Betty Jones'
  
    client.set('lastName', 'Fuller');
    client.get('fullName'); // 'Betty Fuller'
    ```
  
    You can pass a hash with two functions, `get` and `set`, as an
    argument to provide both a getter and setter:
  
    ```js
    import EmberObject, { computed } from '@ember/object';
  
    let Person = EmberObject.extend({
      init() {
        this._super(...arguments);
  
        this.firstName = 'Betty';
        this.lastName = 'Jones';
      },
  
      fullName: computed('firstName', 'lastName', {
        get(key) {
          return `${this.get('firstName')} ${this.get('lastName')}`;
        },
        set(key, value) {
          let [firstName, lastName] = value.split(/\s+/);
          this.setProperties({ firstName, lastName });
          return value;
        }
      })
    });
  
    let client = Person.create();
    client.get('firstName'); // 'Betty'
  
    client.set('fullName', 'Carroll Fuller');
    client.get('firstName'); // 'Carroll'
    ```
  
    The `set` function should accept two parameters, `key` and `value`. The value
    returned from `set` will be the new value of the property.
  
    _Note: This is the preferred way to define computed properties when writing third-party
    libraries that depend on or use Ember, since there is no guarantee that the user
    will have [prototype Extensions](https://emberjs.com/guides/configuring-ember/disabling-prototype-extensions/) enabled._
  
    The alternative syntax, with prototype extensions, might look like:
  
    ```js
    fullName: function() {
      return this.get('firstName') + ' ' + this.get('lastName');
    }.property('firstName', 'lastName')
    ```
  
    @method computed
    @for @ember/object
    @static
    @param {String} [dependentKeys*] Optional dependent keys that trigger this computed property.
    @param {Function} func The computed property function.
    @return {ComputedProperty} property descriptor instance
    @public
  */


  /**
    Returns the cached value for a property, if one exists.
    This can be useful for peeking at the value of a computed
    property that is generated lazily, without accidentally causing
    it to be created.
  
    @method cacheFor
    @static
    @for @ember/object/internals
    @param {Object} obj the object whose property you want to check
    @param {String} key the name of the property whose cached value you want
      to return
    @return {Object} the cached value
    @public
  */
  function cacheFor(obj, key) {
    var meta$$1 = exports.peekMeta(obj);
    var cache = meta$$1 !== undefined ? meta$$1.source === obj && meta$$1.readableCache() : undefined;
    var ret = cache !== undefined ? cache[key] : undefined;

    if (ret === UNDEFINED) {
      return undefined;
    }
    return ret;
  }

  cacheFor.set = function (cache, key, value) {
    if (value === undefined) {
      cache[key] = UNDEFINED;
    } else {
      cache[key] = value;
    }
  };

  cacheFor.get = function (cache, key) {
    var ret = cache[key];
    if (ret === UNDEFINED) {
      return undefined;
    }
    return ret;
  };

  cacheFor.remove = function (cache, key) {
    cache[key] = undefined;
  };

  var CONSUMED = {};

  var AliasedProperty = function (_Descriptor) {
    emberBabel.inherits(AliasedProperty, _Descriptor);

    function AliasedProperty(altKey) {

      var _this = emberBabel.possibleConstructorReturn(this, _Descriptor.call(this));

      _this.isDescriptor = true;
      _this.altKey = altKey;
      _this._dependentKeys = [altKey];
      return _this;
    }

    AliasedProperty.prototype.setup = function (obj, keyName) {
      true && !(this.altKey !== keyName) && emberDebug.assert('Setting alias \'' + keyName + '\' on self', this.altKey !== keyName);

      var meta$$1 = meta(obj);
      if (meta$$1.peekWatching(keyName)) {
        addDependentKeys(this, obj, keyName, meta$$1);
      }
    };

    AliasedProperty.prototype.teardown = function (obj, keyName, meta$$1) {
      if (meta$$1.peekWatching(keyName)) {
        removeDependentKeys(this, obj, keyName, meta$$1);
      }
    };

    AliasedProperty.prototype.willWatch = function (obj, keyName, meta$$1) {
      addDependentKeys(this, obj, keyName, meta$$1);
    };

    AliasedProperty.prototype.didUnwatch = function (obj, keyName, meta$$1) {
      removeDependentKeys(this, obj, keyName, meta$$1);
    };

    AliasedProperty.prototype.get = function (obj, keyName) {
      var ret = get(obj, this.altKey);
      var meta$$1 = meta(obj);
      var cache = meta$$1.writableCache();
      if (cache[keyName] !== CONSUMED) {
        cache[keyName] = CONSUMED;
        addDependentKeys(this, obj, keyName, meta$$1);
      }
      return ret;
    };

    AliasedProperty.prototype.set = function (obj, keyName, value) {
      return set(obj, this.altKey, value);
    };

    AliasedProperty.prototype.readOnly = function () {
      this.set = AliasedProperty_readOnlySet;
      return this;
    };

    AliasedProperty.prototype.oneWay = function () {
      this.set = AliasedProperty_oneWaySet;
      return this;
    };

    return AliasedProperty;
  }(Descriptor);

  function AliasedProperty_readOnlySet(obj, keyName) {
    throw new emberDebug.Error('Cannot set read-only property \'' + keyName + '\' on object: ' + emberUtils.inspect(obj));
  }

  function AliasedProperty_oneWaySet(obj, keyName, value) {
    defineProperty(obj, keyName, null);
    return set(obj, keyName, value);
  }

  // Backwards compatibility with Ember Data.
  AliasedProperty.prototype._meta = undefined;
  AliasedProperty.prototype.meta = ComputedProperty.prototype.meta;

  /**
   @module @ember/polyfills
  */
  /**
    Merge the contents of two objects together into the first object.
  
    ```javascript
    import { merge } from '@ember/polyfills';
  
    merge({ first: 'Tom' }, { last: 'Dale' }); // { first: 'Tom', last: 'Dale' }
    var a = { first: 'Yehuda' };
    var b = { last: 'Katz' };
    merge(a, b); // a == { first: 'Yehuda', last: 'Katz' }, b == { last: 'Katz' }
    ```
  
    @method merge
    @static
    @for @ember/polyfills
    @param {Object} original The object to merge into
    @param {Object} updates The object to copy properties from
    @return {Object}
    @public
  */


  /**
  @module ember
  */

  /**
    Used internally to allow changing properties in a backwards compatible way, and print a helpful
    deprecation warning.
  
    @method deprecateProperty
    @param {Object} object The object to add the deprecated property to.
    @param {String} deprecatedKey The property to add (and print deprecation warnings upon accessing).
    @param {String} newKey The property that will be aliased.
    @private
    @since 1.7.0
  */

  /* eslint no-console:off */
  /* global console */

  /**
  @module @ember/instrumentation
  @private
  */

  /**
    The purpose of the Ember Instrumentation module is
    to provide efficient, general-purpose instrumentation
    for Ember.
  
    Subscribe to a listener by using `subscribe`:
  
    ```javascript
    import { subscribe } from '@ember/instrumentation';
  
    subscribe("render", {
      before(name, timestamp, payload) {
  
      },
  
      after(name, timestamp, payload) {
  
      }
    });
    ```
  
    If you return a value from the `before` callback, that same
    value will be passed as a fourth parameter to the `after`
    callback.
  
    Instrument a block of code by using `instrument`:
  
    ```javascript
    import { instrument } from '@ember/instrumentation';
  
    instrument("render.handlebars", payload, function() {
      // rendering logic
    }, binding);
    ```
  
    Event names passed to `instrument` are namespaced
    by periods, from more general to more specific. Subscribers
    can listen for events by whatever level of granularity they
    are interested in.
  
    In the above example, the event is `render.handlebars`,
    and the subscriber listened for all events beginning with
    `render`. It would receive callbacks for events named
    `render`, `render.handlebars`, `render.container`, or
    even `render.handlebars.layout`.
  
    @class Instrumentation
    @static
    @private
  */
  var subscribers = [];
  var cache = {};

  function populateListeners(name) {
    var listeners = [],
        i;
    var subscriber = void 0;

    for (i = 0; i < subscribers.length; i++) {
      subscriber = subscribers[i];
      if (subscriber.regex.test(name)) {
        listeners.push(subscriber.object);
      }
    }

    cache[name] = listeners;
    return listeners;
  }

  var time = function () {
    var perf = 'undefined' !== typeof window ? window.performance || {} : {};
    var fn = perf.now || perf.mozNow || perf.webkitNow || perf.msNow || perf.oNow;
    // fn.bind will be available in all the browsers that support the advanced window.performance... ;-)
    return fn ? fn.bind(perf) : function () {
      return +new Date();
    };
  }();

  /**
    Notifies event's subscribers, calls `before` and `after` hooks.
  
    @method instrument
    @for @ember/instrumentation
    @static
    @param {String} [name] Namespaced event name.
    @param {Object} _payload
    @param {Function} callback Function that you're instrumenting.
    @param {Object} binding Context that instrument function is called with.
    @private
  */
  function instrument(name, _payload, callback, binding) {
    if (arguments.length <= 3 && typeof _payload === 'function') {
      binding = callback;
      callback = _payload;
      _payload = undefined;
    }
    if (subscribers.length === 0) {
      return callback.call(binding);
    }
    var payload = _payload || {};
    var finalizer = _instrumentStart(name, function () {
      return payload;
    });

    if (finalizer) {
      return withFinalizer(callback, finalizer, payload, binding);
    } else {
      return callback.call(binding);
    }
  }

  exports.flaggedInstrument = void 0;
  if (ember_features.EMBER_IMPROVED_INSTRUMENTATION) {
    exports.flaggedInstrument = instrument;
  } else {
    exports.flaggedInstrument = function (name, payload, callback) {
      return callback();
    };
  }
  function withFinalizer(callback, finalizer, payload, binding) {
    var result = void 0;
    try {
      result = callback.call(binding);
    } catch (e) {
      payload.exception = e;
      result = payload;
    } finally {
      finalizer();
    }
    return result;
  }

  function NOOP() {}

  // private for now
  function _instrumentStart(name, _payload, _payloadParam) {
    if (subscribers.length === 0) {
      return NOOP;
    }

    var listeners = cache[name];

    if (!listeners) {
      listeners = populateListeners(name);
    }

    if (listeners.length === 0) {
      return NOOP;
    }

    var payload = _payload(_payloadParam);

    var STRUCTURED_PROFILE = emberEnvironment.ENV.STRUCTURED_PROFILE;
    var timeName = void 0;
    if (STRUCTURED_PROFILE) {
      timeName = name + ': ' + payload.object;
      console.time(timeName);
    }

    var beforeValues = new Array(listeners.length);
    var i = void 0,
        listener = void 0;
    var timestamp = time();
    for (i = 0; i < listeners.length; i++) {
      listener = listeners[i];
      beforeValues[i] = listener.before(name, timestamp, payload);
    }

    return function () {
      var i = void 0,
          listener = void 0;
      var timestamp = time();
      for (i = 0; i < listeners.length; i++) {
        listener = listeners[i];
        if (typeof listener.after === 'function') {
          listener.after(name, timestamp, payload, beforeValues[i]);
        }
      }

      if (STRUCTURED_PROFILE) {
        console.timeEnd(timeName);
      }
    };
  }

  /**
    Subscribes to a particular event or instrumented block of code.
  
    @method subscribe
    @for @ember/instrumentation
    @static
  
    @param {String} [pattern] Namespaced event name.
    @param {Object} [object] Before and After hooks.
  
    @return {Subscriber}
    @private
  */


  /**
    Unsubscribes from a particular event or instrumented block of code.
  
    @method unsubscribe
    @for @ember/instrumentation
    @static
  
    @param {Object} [subscriber]
    @private
  */


  /**
    Resets `Instrumentation` by flushing list of subscribers.
  
    @method reset
    @for @ember/instrumentation
    @static
    @private
  */


  var onerror = void 0;
  var onErrorTarget = {
    get onerror() {
      return onerror;
    }
  };

  // Ember.onerror getter

  // Ember.onerror setter


  var dispatchOverride = void 0;

  // allows testing adapter to override dispatch


  /**
   @module @ember/utils
  */
  /**
    Returns true if the passed value is null or undefined. This avoids errors
    from JSLint complaining about use of ==, which can be technically
    confusing.
  
    ```javascript
    isNone();              // true
    isNone(null);          // true
    isNone(undefined);     // true
    isNone('');            // false
    isNone([]);            // false
    isNone(function() {}); // false
    ```
  
    @method isNone
    @static
    @for @ember/utils
    @param {Object} obj Value to test
    @return {Boolean}
    @public
  */
  function isNone(obj) {
    return obj === null || obj === undefined;
  }

  /**
   @module @ember/utils
  */
  /**
    Verifies that a value is `null` or `undefined`, an empty string, or an empty
    array.
  
    Constrains the rules on `isNone` by returning true for empty strings and
    empty arrays.
  
    ```javascript
    isEmpty();                // true
    isEmpty(null);            // true
    isEmpty(undefined);       // true
    isEmpty('');              // true
    isEmpty([]);              // true
    isEmpty({});              // false
    isEmpty('Adam Hawkins');  // false
    isEmpty([0,1,2]);         // false
    isEmpty('\n\t');          // false
    isEmpty('  ');            // false
    ```
  
    @method isEmpty
    @static
    @for @ember/utils
    @param {Object} obj Value to test
    @return {Boolean}
    @public
  */
  function isEmpty(obj) {
    var none = isNone(obj),
        size,
        length;
    if (none) {
      return none;
    }

    if (typeof obj.size === 'number') {
      return !obj.size;
    }

    var objectType = typeof obj;

    if (objectType === 'object') {
      size = get(obj, 'size');

      if (typeof size === 'number') {
        return !size;
      }
    }

    if (typeof obj.length === 'number' && objectType !== 'function') {
      return !obj.length;
    }

    if (objectType === 'object') {
      length = get(obj, 'length');

      if (typeof length === 'number') {
        return !length;
      }
    }

    return false;
  }

  /**
   @module @ember/utils
  */
  /**
    A value is blank if it is empty or a whitespace string.
  
    ```javascript
    import { isBlank } from '@ember/utils';
  
    isBlank();                // true
    isBlank(null);            // true
    isBlank(undefined);       // true
    isBlank('');              // true
    isBlank([]);              // true
    isBlank('\n\t');          // true
    isBlank('  ');            // true
    isBlank({});              // false
    isBlank('\n\t Hello');    // false
    isBlank('Hello world');   // false
    isBlank([1,2,3]);         // false
    ```
  
    @method isBlank
    @static
    @for @ember/utils
    @param {Object} obj Value to test
    @return {Boolean}
    @since 1.5.0
    @public
  */
  function isBlank(obj) {
    return isEmpty(obj) || typeof obj === 'string' && /\S/.test(obj) === false;
  }

  /**
   @module @ember/utils
  */
  /**
    A value is present if it not `isBlank`.
  
    ```javascript
    isPresent();                // false
    isPresent(null);            // false
    isPresent(undefined);       // false
    isPresent('');              // false
    isPresent('  ');            // false
    isPresent('\n\t');          // false
    isPresent([]);              // false
    isPresent({ length: 0 })    // false
    isPresent(false);           // true
    isPresent(true);            // true
    isPresent('string');        // true
    isPresent(0);               // true
    isPresent(function() {})    // true
    isPresent({});              // true
    isPresent(false);           // true
    isPresent('\n\t Hello');    // true
    isPresent([1,2,3]);         // true
    ```
  
    @method isPresent
    @static
    @for @ember/utils
    @param {Object} obj Value to test
    @return {Boolean}
    @since 1.8.0
    @public
  */


  var backburner$1 = new Backburner(['sync', 'actions', 'destroy'], {
    GUID_KEY: emberUtils.GUID_KEY,
    sync: {
      before: beginPropertyChanges,
      after: endPropertyChanges
    },
    defaultQueue: 'actions',
    onBegin: function (current) {
      run.currentRunLoop = current;
    },
    onEnd: function (current, next) {
      run.currentRunLoop = next;
    },
    onErrorTarget: onErrorTarget,
    onErrorMethod: 'onerror'
  });

  /**
   @module @ember/runloop
  */
  // ..........................................................
  // run - this is ideally the only public API the dev sees
  //

  /**
    Runs the passed target and method inside of a RunLoop, ensuring any
    deferred actions including bindings and views updates are flushed at the
    end.
  
    Normally you should not need to invoke this method yourself. However if
    you are implementing raw event handlers when interfacing with other
    libraries or plugins, you should probably wrap all of your code inside this
    call.
  
    ```javascript
    import { run } from '@ember/runloop';
  
    run(function() {
      // code to be executed within a RunLoop
    });
    ```
    @method run
    @for @ember/runloop
    @static
    @param {Object} [target] target of method to call
    @param {Function|String} method Method to invoke.
      May be a function or a string. If you pass a string
      then it will be looked up on the passed target.
    @param {Object} [args*] Any additional arguments you wish to pass to the method.
    @return {Object} return value from invoking the passed function.
    @public
  */
  function run() {
    return backburner$1.run.apply(backburner$1, arguments);
  }

  /**
    If no run-loop is present, it creates a new one. If a run loop is
    present it will queue itself to run on the existing run-loops action
    queue.
  
    Please note: This is not for normal usage, and should be used sparingly.
  
    If invoked when not within a run loop:
  
    ```javascript
    import { join } from '@ember/runloop';
  
    join(function() {
      // creates a new run-loop
    });
    ```
  
    Alternatively, if called within an existing run loop:
  
    ```javascript
    import { run, join } from '@ember/runloop';
  
    run(function() {
      // creates a new run-loop
  
      join(function() {
        // joins with the existing run-loop, and queues for invocation on
        // the existing run-loops action queue.
      });
    });
    ```
  
    @method join
    @static
    @for @ember/runloop
    @param {Object} [target] target of method to call
    @param {Function|String} method Method to invoke.
      May be a function or a string. If you pass a string
      then it will be looked up on the passed target.
    @param {Object} [args*] Any additional arguments you wish to pass to the method.
    @return {Object} Return value from invoking the passed function. Please note,
    when called within an existing loop, no return value is possible.
    @public
  */
  run.join = function () {
    return backburner$1.join.apply(backburner$1, arguments);
  };

  /**
    Allows you to specify which context to call the specified function in while
    adding the execution of that function to the Ember run loop. This ability
    makes this method a great way to asynchronously integrate third-party libraries
    into your Ember application.
  
    `bind` takes two main arguments, the desired context and the function to
    invoke in that context. Any additional arguments will be supplied as arguments
    to the function that is passed in.
  
    Let's use the creation of a TinyMCE component as an example. Currently,
    TinyMCE provides a setup configuration option we can use to do some processing
    after the TinyMCE instance is initialized but before it is actually rendered.
    We can use that setup option to do some additional setup for our component.
    The component itself could look something like the following:
  
    ```app/components/rich-text-editor.js
    import Component from '@ember/component';
    import { on } from '@ember/object/evented';
    import { bind } from '@ember/runloop';
  
    export default Component.extend({
      initializeTinyMCE: on('didInsertElement', function() {
        tinymce.init({
          selector: '#' + this.$().prop('id'),
          setup: Ember.run.bind(this, this.setupEditor)
        });
      }),
      
      didInsertElement() {
        tinymce.init({
          selector: '#' + this.$().prop('id'),
          setup: Ember.run.bind(this, this.setupEditor)
        });
      }
  
      setupEditor(editor) {
        this.set('editor', editor);
  
        editor.on('change', function() {
          console.log('content changed!');
        });
      }
    });
    ```
  
    In this example, we use Ember.run.bind to bind the setupEditor method to the
    context of the RichTextEditor component and to have the invocation of that
    method be safely handled and executed by the Ember run loop.
  
    @method bind
    @static
    @for @ember/runloop
    @param {Object} [target] target of method to call
    @param {Function|String} method Method to invoke.
      May be a function or a string. If you pass a string
      then it will be looked up on the passed target.
    @param {Object} [args*] Any additional arguments you wish to pass to the method.
    @return {Function} returns a new function that will always have a particular context
    @since 1.4.0
    @public
  */
  run.bind = function () {
    var _len, curried, _key;

    for (_len = arguments.length, curried = Array(_len), _key = 0; _key < _len; _key++) {
      curried[_key] = arguments[_key];
    }

    return function () {
      var _len2, args, _key2;

      for (_len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      return run.join.apply(run, curried.concat(args));
    };
  };

  run.backburner = backburner$1;
  run.currentRunLoop = null;
  run.queues = backburner$1.queueNames;

  /**
    Begins a new RunLoop. Any deferred actions invoked after the begin will
    be buffered until you invoke a matching call to `run.end()`. This is
    a lower-level way to use a RunLoop instead of using `run()`.
  
    ```javascript
    import { begin, end } from '@ember/runloop';
  
    begin();
    // code to be executed within a RunLoop
    end();
    ```
  
    @method begin
    @static
    @for @ember/runloop
    @return {void}
    @public
  */
  run.begin = function () {
    backburner$1.begin();
  };

  /**
    Ends a RunLoop. This must be called sometime after you call
    `run.begin()` to flush any deferred actions. This is a lower-level way
    to use a RunLoop instead of using `run()`.
  
    ```javascript
    import { begin, end } from '@ember/runloop';
  
    begin();
    // code to be executed within a RunLoop
    end();
    ```
  
    @method end
    @static
    @for @ember/runloop
    @return {void}
    @public
  */
  run.end = function () {
    backburner$1.end();
  };

  /**
    Array of named queues. This array determines the order in which queues
    are flushed at the end of the RunLoop. You can define your own queues by
    simply adding the queue name to this array. Normally you should not need
    to inspect or modify this property.
  
    @property queues
    @type Array
    @default ['sync', 'actions', 'destroy']
    @private
  */

  /**
    Adds the passed target/method and any optional arguments to the named
    queue to be executed at the end of the RunLoop. If you have not already
    started a RunLoop when calling this method one will be started for you
    automatically.
  
    At the end of a RunLoop, any methods scheduled in this way will be invoked.
    Methods will be invoked in an order matching the named queues defined in
    the `run.queues` property.
  
    ```javascript
    import { schedule } from '@ember/runloop';
  
    schedule('sync', this, function() {
      // this will be executed in the first RunLoop queue, when bindings are synced
      console.log('scheduled on sync queue');
    });
  
    schedule('actions', this, function() {
      // this will be executed in the 'actions' queue, after bindings have synced.
      console.log('scheduled on actions queue');
    });
  
    // Note the functions will be run in order based on the run queues order.
    // Output would be:
    //   scheduled on sync queue
    //   scheduled on actions queue
    ```
  
    @method schedule
    @static
    @for @ember/runloop
    @param {String} queue The name of the queue to schedule against.
      Default queues are 'sync' and 'actions'
    @param {Object} [target] target object to use as the context when invoking a method.
    @param {String|Function} method The method to invoke. If you pass a string it
      will be resolved on the target object at the time the scheduled item is
      invoked allowing you to change the target function.
    @param {Object} [arguments*] Optional arguments to be passed to the queued method.
    @return {*} Timer information for use in canceling, see `run.cancel`.
    @public
  */
  run.schedule = function () /* queue, target, method */{
    true && !(run.currentRunLoop || !emberDebug.isTesting()) && emberDebug.assert('You have turned on testing mode, which disabled the run-loop\'s autorun. ' + 'You will need to wrap any code with asynchronous side-effects in a run', run.currentRunLoop || !emberDebug.isTesting());

    return backburner$1.schedule.apply(backburner$1, arguments);
  };

  // Used by global test teardown
  run.hasScheduledTimers = function () {
    return backburner$1.hasTimers();
  };

  // Used by global test teardown
  run.cancelTimers = function () {
    backburner$1.cancelTimers();
  };

  /**
    Immediately flushes any events scheduled in the 'sync' queue. Bindings
    use this queue so this method is a useful way to immediately force all
    bindings in the application to sync.
  
    You should call this method anytime you need any changed state to propagate
    throughout the app immediately without repainting the UI (which happens
    in the later 'render' queue added by the `ember-views` package).
  
    ```javascript
    run.sync();
    ```
  
    @method sync
    @static
    @for @ember/runloop
    @return {void}
    @private
  */
  run.sync = function () {
    if (backburner$1.currentInstance) {
      backburner$1.currentInstance.queues.sync.flush();
    }
  };

  /**
    Invokes the passed target/method and optional arguments after a specified
    period of time. The last parameter of this method must always be a number
    of milliseconds.
  
    You should use this method whenever you need to run some action after a
    period of time instead of using `setTimeout()`. This method will ensure that
    items that expire during the same script execution cycle all execute
    together, which is often more efficient than using a real setTimeout.
  
    ```javascript
    import { later } from '@ember/runloop';
  
    later(myContext, function() {
      // code here will execute within a RunLoop in about 500ms with this == myContext
    }, 500);
    ```
  
    @method later
    @static
    @for @ember/runloop
    @param {Object} [target] target of method to invoke
    @param {Function|String} method The method to invoke.
      If you pass a string it will be resolved on the
      target at the time the method is invoked.
    @param {Object} [args*] Optional arguments to pass to the timeout.
    @param {Number} wait Number of milliseconds to wait.
    @return {*} Timer information for use in canceling, see `run.cancel`.
    @public
  */
  run.later = function () /*target, method*/{
    return backburner$1.later.apply(backburner$1, arguments);
  };

  /**
    Schedule a function to run one time during the current RunLoop. This is equivalent
    to calling `scheduleOnce` with the "actions" queue.
  
    @method once
    @static
    @for @ember/runloop
    @param {Object} [target] The target of the method to invoke.
    @param {Function|String} method The method to invoke.
      If you pass a string it will be resolved on the
      target at the time the method is invoked.
    @param {Object} [args*] Optional arguments to pass to the timeout.
    @return {Object} Timer information for use in canceling, see `run.cancel`.
    @public
  */
  run.once = function () {
    var _len3, args, _key3;

    true && !(run.currentRunLoop || !emberDebug.isTesting()) && emberDebug.assert('You have turned on testing mode, which disabled the run-loop\'s autorun. ' + 'You will need to wrap any code with asynchronous side-effects in a run', run.currentRunLoop || !emberDebug.isTesting());

    for (_len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      args[_key3] = arguments[_key3];
    }

    args.unshift('actions');
    return backburner$1.scheduleOnce.apply(backburner$1, args);
  };

  /**
    Schedules a function to run one time in a given queue of the current RunLoop.
    Calling this method with the same queue/target/method combination will have
    no effect (past the initial call).
  
    Note that although you can pass optional arguments these will not be
    considered when looking for duplicates. New arguments will replace previous
    calls.
  
    ```javascript
    import { run, scheduleOnce } from '@ember/runloop';
  
    function sayHi() {
      console.log('hi');
    }
  
    run(function() {
      scheduleOnce('afterRender', myContext, sayHi);
      scheduleOnce('afterRender', myContext, sayHi);
      // sayHi will only be executed once, in the afterRender queue of the RunLoop
    });
    ```
  
    Also note that for `run.scheduleOnce` to prevent additional calls, you need to
    pass the same function instance. The following case works as expected:
  
    ```javascript
    function log() {
      console.log('Logging only once');
    }
  
    function scheduleIt() {
      scheduleOnce('actions', myContext, log);
    }
  
    scheduleIt();
    scheduleIt();
    ```
  
    But this other case will schedule the function multiple times:
  
    ```javascript
    import { scheduleOnce } from '@ember/runloop';
  
    function scheduleIt() {
      scheduleOnce('actions', myContext, function() {
        console.log('Closure');
      });
    }
  
    scheduleIt();
    scheduleIt();
  
    // "Closure" will print twice, even though we're using `run.scheduleOnce`,
    // because the function we pass to it won't match the
    // previously scheduled operation.
    ```
  
    Available queues, and their order, can be found at `run.queues`
  
    @method scheduleOnce
    @static
    @for @ember/runloop
    @param {String} [queue] The name of the queue to schedule against. Default queues are 'sync' and 'actions'.
    @param {Object} [target] The target of the method to invoke.
    @param {Function|String} method The method to invoke.
      If you pass a string it will be resolved on the
      target at the time the method is invoked.
    @param {Object} [args*] Optional arguments to pass to the timeout.
    @return {Object} Timer information for use in canceling, see `run.cancel`.
    @public
  */
  run.scheduleOnce = function () /*queue, target, method*/{
    true && !(run.currentRunLoop || !emberDebug.isTesting()) && emberDebug.assert('You have turned on testing mode, which disabled the run-loop\'s autorun. ' + 'You will need to wrap any code with asynchronous side-effects in a run', run.currentRunLoop || !emberDebug.isTesting());

    return backburner$1.scheduleOnce.apply(backburner$1, arguments);
  };

  /**
    Schedules an item to run from within a separate run loop, after
    control has been returned to the system. This is equivalent to calling
    `run.later` with a wait time of 1ms.
  
    ```javascript
    import { next } from '@ember/runloop';
  
    next(myContext, function() {
      // code to be executed in the next run loop,
      // which will be scheduled after the current one
    });
    ```
  
    Multiple operations scheduled with `run.next` will coalesce
    into the same later run loop, along with any other operations
    scheduled by `run.later` that expire right around the same
    time that `run.next` operations will fire.
  
    Note that there are often alternatives to using `run.next`.
    For instance, if you'd like to schedule an operation to happen
    after all DOM element operations have completed within the current
    run loop, you can make use of the `afterRender` run loop queue (added
    by the `ember-views` package, along with the preceding `render` queue
    where all the DOM element operations happen).
  
    Example:
  
    ```app/components/my-component.js
    import Component from '@ember/component';
    import { scheduleOnce } from '@ember/runloop';
  
    export Component.extend({
      didInsertElement() {
        this._super(...arguments);
        scheduleOnce('afterRender', this, 'processChildElements');
      },
  
      processChildElements() {
        // ... do something with component's child component
        // elements after they've finished rendering, which
        // can't be done within this component's
        // `didInsertElement` hook because that gets run
        // before the child elements have been added to the DOM.
      }
    });
    ```
  
    One benefit of the above approach compared to using `run.next` is
    that you will be able to perform DOM/CSS operations before unprocessed
    elements are rendered to the screen, which may prevent flickering or
    other artifacts caused by delaying processing until after rendering.
  
    The other major benefit to the above approach is that `run.next`
    introduces an element of non-determinism, which can make things much
    harder to test, due to its reliance on `setTimeout`; it's much harder
    to guarantee the order of scheduled operations when they are scheduled
    outside of the current run loop, i.e. with `run.next`.
  
    @method next
    @static
    @for @ember/runloop
    @param {Object} [target] target of method to invoke
    @param {Function|String} method The method to invoke.
      If you pass a string it will be resolved on the
      target at the time the method is invoked.
    @param {Object} [args*] Optional arguments to pass to the timeout.
    @return {Object} Timer information for use in canceling, see `run.cancel`.
    @public
  */
  run.next = function () {
    var _len4, args, _key4;

    for (_len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
      args[_key4] = arguments[_key4];
    }

    args.push(1);
    return backburner$1.later.apply(backburner$1, args);
  };

  /**
    Cancels a scheduled item. Must be a value returned by `later()`,
    `once()`, `scheduleOnce()`, `next()`, `debounce()`, or
    `throttle()`.
  
    ```javascript
    import {
      next,
      cancel,
      later,
      scheduleOnce,
      once,
      throttle,
      debounce
    } from '@ember/runloop';
  
    let runNext = next(myContext, function() {
      // will not be executed
    });
  
    cancel(runNext);
  
    let runLater = later(myContext, function() {
      // will not be executed
    }, 500);
  
    cancel(runLater);
  
    let runScheduleOnce = scheduleOnce('afterRender', myContext, function() {
      // will not be executed
    });
  
    cancel(runScheduleOnce);
  
    let runOnce = once(myContext, function() {
      // will not be executed
    });
  
    cancel(runOnce);
  
    let throttle = throttle(myContext, function() {
      // will not be executed
    }, 1, false);
  
    cancel(throttle);
  
    let debounce = debounce(myContext, function() {
      // will not be executed
    }, 1);
  
    cancel(debounce);
  
    let debounceImmediate = debounce(myContext, function() {
      // will be executed since we passed in true (immediate)
    }, 100, true);
  
    // the 100ms delay until this method can be called again will be canceled
    cancel(debounceImmediate);
    ```
  
    @method cancel
    @static
    @for @ember/runloop
    @param {Object} timer Timer object to cancel
    @return {Boolean} true if canceled or false/undefined if it wasn't found
    @public
  */
  run.cancel = function (timer) {
    return backburner$1.cancel(timer);
  };

  /**
    Delay calling the target method until the debounce period has elapsed
    with no additional debounce calls. If `debounce` is called again before
    the specified time has elapsed, the timer is reset and the entire period
    must pass again before the target method is called.
  
    This method should be used when an event may be called multiple times
    but the action should only be called once when the event is done firing.
    A common example is for scroll events where you only want updates to
    happen once scrolling has ceased.
  
    ```javascript
    import { debounce } from '@ember/runloop';
  
    function whoRan() {
      console.log(this.name + ' ran.');
    }
  
    let myContext = { name: 'debounce' };
  
    debounce(myContext, whoRan, 150);
  
    // less than 150ms passes
    debounce(myContext, whoRan, 150);
  
    // 150ms passes
    // whoRan is invoked with context myContext
    // console logs 'debounce ran.' one time.
    ```
  
    Immediate allows you to run the function immediately, but debounce
    other calls for this function until the wait time has elapsed. If
    `debounce` is called again before the specified time has elapsed,
    the timer is reset and the entire period must pass again before
    the method can be called again.
  
    ```javascript
    import { debounce } from '@ember/runloop';
  
    function whoRan() {
      console.log(this.name + ' ran.');
    }
  
    let myContext = { name: 'debounce' };
  
    debounce(myContext, whoRan, 150, true);
  
    // console logs 'debounce ran.' one time immediately.
    // 100ms passes
    debounce(myContext, whoRan, 150, true);
  
    // 150ms passes and nothing else is logged to the console and
    // the debouncee is no longer being watched
    debounce(myContext, whoRan, 150, true);
  
    // console logs 'debounce ran.' one time immediately.
    // 150ms passes and nothing else is logged to the console and
    // the debouncee is no longer being watched
    ```
  
    @method debounce
    @static
    @for @ember/runloop
    @param {Object} [target] target of method to invoke
    @param {Function|String} method The method to invoke.
      May be a function or a string. If you pass a string
      then it will be looked up on the passed target.
    @param {Object} [args*] Optional arguments to pass to the timeout.
    @param {Number} wait Number of milliseconds to wait.
    @param {Boolean} immediate Trigger the function on the leading instead
      of the trailing edge of the wait interval. Defaults to false.
    @return {Array} Timer information for use in canceling, see `run.cancel`.
    @public
  */
  run.debounce = function () {
    return backburner$1.debounce.apply(backburner$1, arguments);
  };

  /**
    Ensure that the target method is never called more frequently than
    the specified spacing period. The target method is called immediately.
  
    ```javascript
    import { throttle } from '@ember/runloop';
  
    function whoRan() {
      console.log(this.name + ' ran.');
    }
  
    let myContext = { name: 'throttle' };
  
    throttle(myContext, whoRan, 150);
    // whoRan is invoked with context myContext
    // console logs 'throttle ran.'
  
    // 50ms passes
    throttle(myContext, whoRan, 150);
  
    // 50ms passes
    throttle(myContext, whoRan, 150);
  
    // 150ms passes
    throttle(myContext, whoRan, 150);
    // whoRan is invoked with context myContext
    // console logs 'throttle ran.'
    ```
  
    @method throttle
    @static
    @for @ember/runloop
    @param {Object} [target] target of method to invoke
    @param {Function|String} method The method to invoke.
      May be a function or a string. If you pass a string
      then it will be looked up on the passed target.
    @param {Object} [args*] Optional arguments to pass to the timeout.
    @param {Number} spacing Number of milliseconds to space out requests.
    @param {Boolean} immediate Trigger the function on the leading instead
      of the trailing edge of the wait interval. Defaults to true.
    @return {Array} Timer information for use in canceling, see `run.cancel`.
    @public
  */
  run.throttle = function () {
    return backburner$1.throttle.apply(backburner$1, arguments);
  };

  /**
    Add a new named queue after the specified queue.
  
    The queue to add will only be added once.
  
    @method _addQueue
    @param {String} name the name of the queue to add.
    @param {String} after the name of the queue to add after.
    @private
  */
  run._addQueue = function (name, after) {
    if (run.queues.indexOf(name) === -1) {
      run.queues.splice(run.queues.indexOf(after) + 1, 0, name);
    }
  };

  /**
   @module ember
  */
  /**
    Helper class that allows you to register your library with Ember.
  
    Singleton created at `Ember.libraries`.
  
    @class Libraries
    @constructor
    @private
  */
  var Libraries = function () {
    function Libraries() {

      this._registry = [];
      this._coreLibIndex = 0;
    }

    Libraries.prototype._getLibraryByName = function (name) {
      var libs = this._registry,
          i;
      var count = libs.length;

      for (i = 0; i < count; i++) {
        if (libs[i].name === name) {
          return libs[i];
        }
      }
    };

    Libraries.prototype.register = function (name, version, isCoreLibrary) {
      var index = this._registry.length;

      if (!this._getLibraryByName(name)) {
        if (isCoreLibrary) {
          index = this._coreLibIndex++;
        }
        this._registry.splice(index, 0, { name: name, version: version });
      } else {
        true && emberDebug.warn('Library "' + name + '" is already registered with Ember.', false, { id: 'ember-metal.libraries-register' });
      }
    };

    Libraries.prototype.registerCoreLibrary = function (name, version) {
      this.register(name, version, true);
    };

    Libraries.prototype.deRegister = function (name) {
      var lib = this._getLibraryByName(name);
      var index = void 0;

      if (lib) {
        index = this._registry.indexOf(lib);
        this._registry.splice(index, 1);
      }
    };

    return Libraries;
  }();

  if (ember_features.EMBER_LIBRARIES_ISREGISTERED) {
    Libraries.prototype.isRegistered = function (name) {
      return !!this._getLibraryByName(name);
    };
  }

  var libraries = new Libraries();

  /**
  @module ember
  */

  /*
    JavaScript (before ES6) does not have a Map implementation. Objects,
    which are often used as dictionaries, may only have Strings as keys.
  
    Because Ember has a way to get a unique identifier for every object
    via `guidFor`, we can implement a performant Map with arbitrary
    keys. Because it is commonly used in low-level bookkeeping, Map is
    implemented as a pure JavaScript object for performance.
  
    This implementation follows the current iteration of the ES6 proposal for
    maps (http://wiki.ecmascript.org/doku.php?id=harmony:simple_maps_and_sets),
    with one exception:  as we do not have the luxury of in-VM iteration, we implement a
    forEach method for iteration.
  
    Map is mocked out to look like an Ember object, so you can do
    `EmberMap.create()` for symmetry with other Ember classes.
  */

  function copyNull(obj) {
    var output = Object.create(null);

    for (var prop in obj) {
      // hasOwnPropery is not needed because obj is Object.create(null);
      output[prop] = obj[prop];
    }

    return output;
  }

  function copyMap(original, newObject) {
    var keys = original._keys.copy();
    var values = copyNull(original._values);

    newObject._keys = keys;
    newObject._values = values;
    newObject.size = original.size;

    return newObject;
  }

  /**
    This class is used internally by Ember and Ember Data.
    Please do not use it at this time. We plan to clean it up
    and add many tests soon.
  
    @class OrderedSet
    @namespace Ember
    @constructor
    @private
  */

  var OrderedSet = function () {
    function OrderedSet() {

      this.clear();
    }

    /**
      @method create
      @static
      @return {Ember.OrderedSet}
      @private
    */

    OrderedSet.create = function () {
      var Constructor = this;
      return new Constructor();
    };

    /**
      @method clear
      @private
    */

    OrderedSet.prototype.clear = function () {
      this.presenceSet = Object.create(null);
      this.list = [];
      this.size = 0;
    };

    /**
      @method add
      @param obj
      @param guid (optional, and for internal use)
      @return {Ember.OrderedSet}
      @private
    */

    OrderedSet.prototype.add = function (obj, _guid) {
      var guid = _guid || emberUtils.guidFor(obj);
      var presenceSet = this.presenceSet;
      var list = this.list;

      if (presenceSet[guid] !== true) {
        presenceSet[guid] = true;
        this.size = list.push(obj);
      }

      return this;
    };

    /**
      @since 1.8.0
      @method delete
      @param obj
      @param _guid (optional and for internal use only)
      @return {Boolean}
      @private
    */

    OrderedSet.prototype.delete = function (obj, _guid) {
      var guid = _guid || emberUtils.guidFor(obj),
          index;
      var presenceSet = this.presenceSet;
      var list = this.list;

      if (presenceSet[guid] === true) {
        delete presenceSet[guid];
        index = list.indexOf(obj);

        if (index > -1) {
          list.splice(index, 1);
        }
        this.size = list.length;
        return true;
      } else {
        return false;
      }
    };

    /**
      @method isEmpty
      @return {Boolean}
      @private
    */

    OrderedSet.prototype.isEmpty = function () {
      return this.size === 0;
    };

    /**
      @method has
      @param obj
      @return {Boolean}
      @private
    */

    OrderedSet.prototype.has = function (obj) {
      if (this.size === 0) {
        return false;
      }

      var guid = emberUtils.guidFor(obj);
      var presenceSet = this.presenceSet;

      return presenceSet[guid] === true;
    };

    /**
      @method forEach
      @param {Function} fn
      @param self
      @private
    */

    OrderedSet.prototype.forEach = function (fn /*, ...thisArg*/) {
      true && !(typeof fn === 'function') && emberDebug.assert(Object.prototype.toString.call(fn) + ' is not a function', typeof fn === 'function');

      if (this.size === 0) {
        return;
      }

      var list = this.list,
          i,
          _i;

      if (arguments.length === 2) {
        for (i = 0; i < list.length; i++) {
          fn.call(arguments[1], list[i]);
        }
      } else {
        for (_i = 0; _i < list.length; _i++) {
          fn(list[_i]);
        }
      }
    };

    /**
      @method toArray
      @return {Array}
      @private
    */

    OrderedSet.prototype.toArray = function () {
      return this.list.slice();
    };

    /**
      @method copy
      @return {Ember.OrderedSet}
      @private
    */

    OrderedSet.prototype.copy = function () {
      var Constructor = this.constructor;
      var set = new Constructor();

      set.presenceSet = copyNull(this.presenceSet);
      set.list = this.toArray();
      set.size = this.size;

      return set;
    };

    return OrderedSet;
  }();

  /**
    A Map stores values indexed by keys. Unlike JavaScript's
    default Objects, the keys of a Map can be any JavaScript
    object.
  
    Internally, a Map has two data structures:
  
    1. `keys`: an OrderedSet of all of the existing keys
    2. `values`: a JavaScript Object indexed by the `guidFor(key)`
  
    When a key/value pair is added for the first time, we
    add the key to the `keys` OrderedSet, and create or
    replace an entry in `values`. When an entry is deleted,
    we delete its entry in `keys` and `values`.
  
    @class Map
    @namespace Ember
    @private
    @constructor
  */

  var Map = function () {
    function Map() {

      this._keys = new OrderedSet();
      this._values = Object.create(null);
      this.size = 0;
    }

    /**
      @method create
      @static
      @private
    */

    Map.create = function () {
      var Constructor = this;
      return new Constructor();
    };

    /**
      Retrieve the value associated with a given key.
       @method get
      @param {*} key
      @return {*} the value associated with the key, or `undefined`
      @private
    */

    Map.prototype.get = function (key) {
      if (this.size === 0) {
        return;
      }

      var values = this._values;
      var guid = emberUtils.guidFor(key);

      return values[guid];
    };

    /**
      Adds a value to the map. If a value for the given key has already been
      provided, the new value will replace the old value.
       @method set
      @param {*} key
      @param {*} value
      @return {Ember.Map}
      @private
    */

    Map.prototype.set = function (key, value) {
      var keys = this._keys;
      var values = this._values;
      var guid = emberUtils.guidFor(key);

      // ensure we don't store -0
      var k = key === -0 ? 0 : key;

      keys.add(k, guid);

      values[guid] = value;

      this.size = keys.size;

      return this;
    };

    /**
      Removes a value from the map for an associated key.
       @since 1.8.0
      @method delete
      @param {*} key
      @return {Boolean} true if an item was removed, false otherwise
      @private
    */

    Map.prototype.delete = function (key) {
      if (this.size === 0) {
        return false;
      }
      // don't use ES6 "delete" because it will be annoying
      // to use in browsers that are not ES6 friendly;
      var keys = this._keys;
      var values = this._values;
      var guid = emberUtils.guidFor(key);

      if (keys.delete(key, guid)) {
        delete values[guid];
        this.size = keys.size;
        return true;
      } else {
        return false;
      }
    };

    /**
      Check whether a key is present.
       @method has
      @param {*} key
      @return {Boolean} true if the item was present, false otherwise
      @private
    */

    Map.prototype.has = function (key) {
      return this._keys.has(key);
    };

    /**
      Iterate over all the keys and values. Calls the function once
      for each key, passing in value, key, and the map being iterated over,
      in that order.
       The keys are guaranteed to be iterated over in insertion order.
       @method forEach
      @param {Function} callback
      @param {*} self if passed, the `this` value inside the
        callback. By default, `this` is the map.
      @private
    */

    Map.prototype.forEach = function (callback /*, ...thisArg*/) {
      true && !(typeof callback === 'function') && emberDebug.assert(Object.prototype.toString.call(callback) + ' is not a function', typeof callback === 'function');

      if (this.size === 0) {
        return;
      }

      var map = this;
      var cb = void 0,
          thisArg = void 0;

      if (arguments.length === 2) {
        thisArg = arguments[1];
        cb = function (key) {
          return callback.call(thisArg, map.get(key), key, map);
        };
      } else {
        cb = function (key) {
          return callback(map.get(key), key, map);
        };
      }

      this._keys.forEach(cb);
    };

    /**
      @method clear
      @private
    */

    Map.prototype.clear = function () {
      this._keys.clear();
      this._values = Object.create(null);
      this.size = 0;
    };

    /**
      @method copy
      @return {Ember.Map}
      @private
    */

    Map.prototype.copy = function () {
      return copyMap(this, new Map());
    };

    return Map;
  }();

  /**
    @class MapWithDefault
    @namespace Ember
    @extends Ember.Map
    @private
    @constructor
    @param [options]
      @param {*} [options.defaultValue]
  */

  var MapWithDefault = function (_Map) {
    emberBabel.inherits(MapWithDefault, _Map);

    function MapWithDefault(options) {

      var _this = emberBabel.possibleConstructorReturn(this, _Map.call(this));

      _this.defaultValue = options.defaultValue;
      return _this;
    }

    /**
      @method create
      @static
      @param [options]
        @param {*} [options.defaultValue]
      @return {Ember.MapWithDefault|Ember.Map} If options are passed, returns
        `MapWithDefault` otherwise returns `EmberMap`
      @private
    */

    MapWithDefault.create = function (options) {
      if (options) {
        return new MapWithDefault(options);
      } else {
        return new Map();
      }
    };

    /**
      Retrieve the value associated with a given key.
       @method get
      @param {*} key
      @return {*} the value associated with the key, or the default value
      @private
    */

    MapWithDefault.prototype.get = function (key) {
      var hasValue = this.has(key),
          defaultValue;

      if (hasValue) {
        return _Map.prototype.get.call(this, key);
      } else {
        defaultValue = this.defaultValue(key);

        this.set(key, defaultValue);
        return defaultValue;
      }
    };

    /**
      @method copy
      @return {Ember.MapWithDefault}
      @private
    */

    MapWithDefault.prototype.copy = function () {
      var Constructor = this.constructor;
      return copyMap(this, new Constructor({
        defaultValue: this.defaultValue
      }));
    };

    return MapWithDefault;
  }(Map);

  /**
   @module @ember/object
  */

  /**
    To get multiple properties at once, call `getProperties`
    with an object followed by a list of strings or an array:
  
    ```javascript
    import { getProperties } from '@ember/object';
  
    getProperties(record, 'firstName', 'lastName', 'zipCode');
    // { firstName: 'John', lastName: 'Doe', zipCode: '10011' }
    ```
  
    is equivalent to:
  
    ```javascript
    import { getProperties } from '@ember/object';
  
    getProperties(record, ['firstName', 'lastName', 'zipCode']);
    // { firstName: 'John', lastName: 'Doe', zipCode: '10011' }
    ```
  
    @method getProperties
    @static
    @for @ember/object
    @param {Object} obj
    @param {String...|Array} list of keys to get
    @return {Object}
    @public
  */


  /**
   @module @ember/object
  */
  /**
    Set a list of properties on an object. These properties are set inside
    a single `beginPropertyChanges` and `endPropertyChanges` batch, so
    observers will be buffered.
  
    ```javascript
    let anObject = Ember.Object.create();
  
    anObject.setProperties({
      firstName: 'Stanley',
      lastName: 'Stuart',
      age: 21
    });
    ```
  
    @method setProperties
    @static
    @for @ember/object
    @param obj
    @param {Object} properties
    @return properties
    @public
  */


  /**
  @module @ember/object
  */

  function changeEvent(keyName) {
    return keyName + ':change';
  }

  function beforeEvent(keyName) {
    return keyName + ':before';
  }

  /**
    @method addObserver
    @static
    @for @ember/object/observers
    @param obj
    @param {String} _path
    @param {Object|Function} target
    @param {Function|String} [method]
    @public
  */
  function addObserver(obj, _path, target, method) {
    addListener(obj, changeEvent(_path), target, method);
    watch(obj, _path);

    return this;
  }

  /**
    @method removeObserver
    @static
    @for @ember/object/observers
    @param obj
    @param {String} path
    @param {Object|Function} target
    @param {Function|String} [method]
    @public
  */
  function removeObserver(obj, path, target, method) {
    unwatch(obj, path);
    removeListener(obj, changeEvent(path), target, method);

    return this;
  }

  /**
    @method _addBeforeObserver
    @static
    @for @ember/object/observers
    @param obj
    @param {String} path
    @param {Object|Function} target
    @param {Function|String} [method]
    @deprecated
    @private
  */
  function _addBeforeObserver(obj, path, target, method) {
    addListener(obj, beforeEvent(path), target, method);
    watch(obj, path);

    return this;
  }

  // Suspend observer during callback.
  //
  // This should only be used by the target of the observer
  // while it is setting the observed path.
  function _suspendObserver(obj, path, target, method, callback) {
    return suspendListener(obj, changeEvent(path), target, method, callback);
  }

  /**
    @method removeBeforeObserver
    @static
    @for @ember/object/observers
    @param obj
    @param {String} path
    @param {Object|Function} target
    @param {Function|String} [method]
    @deprecated
    @private
  */
  function _removeBeforeObserver(obj, path, target, method) {
    unwatch(obj, path);
    removeListener(obj, beforeEvent(path), target, method);

    return this;
  }

  /**
  @module ember
  */

  // ..........................................................
  // BINDING
  //

  var Binding = function () {
    function Binding(toPath, fromPath) {

      // Configuration
      this._from = fromPath;
      this._to = toPath;
      this._oneWay = undefined;

      // State
      this._direction = undefined;
      this._readyToSync = undefined;
      this._fromObj = undefined;
      this._fromPath = undefined;
      this._toObj = undefined;
    }

    /**
      @class Binding
      @namespace Ember
      @deprecated See https://emberjs.com/deprecations/v2.x#toc_ember-binding
      @public
    */

    /**
      This copies the Binding so it can be connected to another object.
       @method copy
      @return {Ember.Binding} `this`
      @public
    */

    Binding.prototype.copy = function () {
      var copy = new Binding(this._to, this._from);
      if (this._oneWay) {
        copy._oneWay = true;
      }
      return copy;
    };

    // ..........................................................
    // CONFIG
    //

    /**
      This will set `from` property path to the specified value. It will not
      attempt to resolve this property path to an actual object until you
      connect the binding.
       The binding will search for the property path starting at the root object
      you pass when you `connect()` the binding. It follows the same rules as
      `get()` - see that method for more information.
       @method from
      @param {String} path The property path to connect to.
      @return {Ember.Binding} `this`
      @public
    */

    Binding.prototype.from = function (path) {
      this._from = path;
      return this;
    };

    /**
      This will set the `to` property path to the specified value. It will not
      attempt to resolve this property path to an actual object until you
      connect the binding.
       The binding will search for the property path starting at the root object
      you pass when you `connect()` the binding. It follows the same rules as
      `get()` - see that method for more information.
       @method to
      @param {String|Tuple} path A property path or tuple.
      @return {Ember.Binding} `this`
      @public
    */

    Binding.prototype.to = function (path) {
      this._to = path;
      return this;
    };

    /**
      Configures the binding as one way. A one-way binding will relay changes
      on the `from` side to the `to` side, but not the other way around. This
      means that if you change the `to` side directly, the `from` side may have
      a different value.
       @method oneWay
      @return {Ember.Binding} `this`
      @public
    */

    Binding.prototype.oneWay = function () {
      this._oneWay = true;
      return this;
    };

    /**
      @method toString
      @return {String} string representation of binding
      @public
    */

    Binding.prototype.toString = function () {
      var oneWay = this._oneWay ? '[oneWay]' : '';
      return 'Ember.Binding<' + emberUtils.guidFor(this) + '>(' + this._from + ' -> ' + this._to + ')' + oneWay;
    };

    // ..........................................................
    // CONNECT AND SYNC
    //

    /**
      Attempts to connect this binding instance so that it can receive and relay
      changes. This method will raise an exception if you have not set the
      from/to properties yet.
       @method connect
      @param {Object} obj The root object for this binding.
      @return {Ember.Binding} `this`
      @public
    */

    Binding.prototype.connect = function (obj) {
      true && !!!obj && emberDebug.assert('Must pass a valid object to Ember.Binding.connect()', !!obj);

      var fromObj = void 0,
          fromPath = void 0,
          possibleGlobal = void 0,
          name;

      // If the binding's "from" path could be interpreted as a global, verify
      // whether the path refers to a global or not by consulting `Ember.lookup`.
      if (isGlobalPath(this._from)) {
        name = getFirstKey(this._from);

        possibleGlobal = emberEnvironment.context.lookup[name];

        if (possibleGlobal) {
          fromObj = possibleGlobal;
          fromPath = getTailPath(this._from);
        }
      }

      if (fromObj === undefined) {
        fromObj = obj;
        fromPath = this._from;
      }

      trySet(obj, this._to, get(fromObj, fromPath));

      // Add an observer on the object to be notified when the binding should be updated.
      addObserver(fromObj, fromPath, this, 'fromDidChange');

      // If the binding is a two-way binding, also set up an observer on the target.
      if (!this._oneWay) {
        addObserver(obj, this._to, this, 'toDidChange');
      }

      addListener(obj, 'willDestroy', this, 'disconnect');

      fireDeprecations(obj, this._to, this._from, possibleGlobal, this._oneWay, !possibleGlobal && !this._oneWay);

      this._readyToSync = true;
      this._fromObj = fromObj;
      this._fromPath = fromPath;
      this._toObj = obj;

      return this;
    };

    /**
      Disconnects the binding instance. Changes will no longer be relayed. You
      will not usually need to call this method.
       @method disconnect
      @return {Ember.Binding} `this`
      @public
    */

    Binding.prototype.disconnect = function () {
      true && !!!this._toObj && emberDebug.assert('Must pass a valid object to Ember.Binding.disconnect()', !!this._toObj);

      // Remove an observer on the object so we're no longer notified of
      // changes that should update bindings.

      removeObserver(this._fromObj, this._fromPath, this, 'fromDidChange');

      // If the binding is two-way, remove the observer from the target as well.
      if (!this._oneWay) {
        removeObserver(this._toObj, this._to, this, 'toDidChange');
      }

      this._readyToSync = false; // Disable scheduled syncs...
      return this;
    };

    // ..........................................................
    // PRIVATE
    //

    /* Called when the from side changes. */

    Binding.prototype.fromDidChange = function () {
      this._scheduleSync('fwd');
    };

    /* Called when the to side changes. */

    Binding.prototype.toDidChange = function () {
      this._scheduleSync('back');
    };

    Binding.prototype._scheduleSync = function (dir) {
      var existingDir = this._direction;

      // If we haven't scheduled the binding yet, schedule it.
      if (existingDir === undefined) {
        run.schedule('sync', this, '_sync');
        this._direction = dir;
      }

      // If both a 'back' and 'fwd' sync have been scheduled on the same object,
      // default to a 'fwd' sync so that it remains deterministic.
      if (existingDir === 'back' && dir === 'fwd') {
        this._direction = 'fwd';
      }
    };

    Binding.prototype._sync = function () {
      var log = emberEnvironment.ENV.LOG_BINDINGS,
          fromValue,
          toValue;

      var toObj = this._toObj;

      // Don't synchronize destroyed objects or disconnected bindings.
      if (toObj.isDestroyed || !this._readyToSync) {
        return;
      }

      // Get the direction of the binding for the object we are
      // synchronizing from.
      var direction = this._direction;

      var fromObj = this._fromObj;
      var fromPath = this._fromPath;

      this._direction = undefined;

      // If we're synchronizing from the remote object...
      if (direction === 'fwd') {
        fromValue = get(fromObj, fromPath);

        if (log) {
          Logger.log(' ', this.toString(), '->', fromValue, fromObj);
        }
        if (this._oneWay) {
          trySet(toObj, this._to, fromValue);
        } else {
          _suspendObserver(toObj, this._to, this, 'toDidChange', function () {
            trySet(toObj, this._to, fromValue);
          });
        }
        // If we're synchronizing *to* the remote object.
      } else if (direction === 'back') {
        toValue = get(toObj, this._to);

        if (log) {
          Logger.log(' ', this.toString(), '<-', toValue, toObj);
        }
        _suspendObserver(fromObj, fromPath, this, 'fromDidChange', function () {
          trySet(fromObj, fromPath, toValue);
        });
      }
    };

    return Binding;
  }();

  function fireDeprecations(obj, toPath, fromPath, deprecateGlobal, deprecateOneWay, deprecateAlias) {

    var objectInfo = 'The `' + toPath + '` property of `' + obj + '` is an `Ember.Binding` connected to `' + fromPath + '`, but ';
    true && !!deprecateGlobal && emberDebug.deprecate(objectInfo + ('`Ember.Binding` is deprecated. Since you' + ' are binding to a global consider using a service instead.'), !deprecateGlobal, {
      id: 'ember-metal.binding',
      until: '3.0.0',
      url: 'https://emberjs.com/deprecations/v2.x#toc_ember-binding'
    });
    true && !!deprecateOneWay && emberDebug.deprecate(objectInfo + ('`Ember.Binding` is deprecated. Since you' + ' are using a `oneWay` binding consider using a `readOnly` computed' + ' property instead.'), !deprecateOneWay, {
      id: 'ember-metal.binding',
      until: '3.0.0',
      url: 'https://emberjs.com/deprecations/v2.x#toc_ember-binding'
    });
    true && !!deprecateAlias && emberDebug.deprecate(objectInfo + ('`Ember.Binding` is deprecated. Consider' + ' using an `alias` computed property instead.'), !deprecateAlias, {
      id: 'ember-metal.binding',
      until: '3.0.0',
      url: 'https://emberjs.com/deprecations/v2.x#toc_ember-binding'
    });
  }

  (function (to, from) {
    for (var key in from) {
      if (from.hasOwnProperty(key)) {
        to[key] = from[key];
      }
    }
  })(Binding, {

    /*
      See `Ember.Binding.from`.
       @method from
      @static
    */
    from: function (from) {
      var C = this;
      return new C(undefined, from);
    },

    /*
      See `Ember.Binding.to`.
       @method to
      @static
    */
    to: function (to) {
      var C = this;
      return new C(to, undefined);
    }
  });
  /**
    An `Ember.Binding` connects the properties of two objects so that whenever
    the value of one property changes, the other property will be changed also.
  
    ## Automatic Creation of Bindings with `/^*Binding/`-named Properties.
  
    You do not usually create Binding objects directly but instead describe
    bindings in your class or object definition using automatic binding
    detection.
  
    Properties ending in a `Binding` suffix will be converted to `Ember.Binding`
    instances. The value of this property should be a string representing a path
    to another object or a custom binding instance created using Binding helpers
    (see "One Way Bindings"):
  
    ```
    valueBinding: "MyApp.someController.title"
    ```
  
    This will create a binding from `MyApp.someController.title` to the `value`
    property of your object instance automatically. Now the two values will be
    kept in sync.
  
    ## One Way Bindings
  
    One especially useful binding customization you can use is the `oneWay()`
    helper. This helper tells Ember that you are only interested in
    receiving changes on the object you are binding from. For example, if you
    are binding to a preference and you want to be notified if the preference
    has changed, but your object will not be changing the preference itself, you
    could do:
  
    ```
    bigTitlesBinding: Ember.Binding.oneWay("MyApp.preferencesController.bigTitles")
    ```
  
    This way if the value of `MyApp.preferencesController.bigTitles` changes the
    `bigTitles` property of your object will change also. However, if you
    change the value of your `bigTitles` property, it will not update the
    `preferencesController`.
  
    One way bindings are almost twice as fast to setup and twice as fast to
    execute because the binding only has to worry about changes to one side.
  
    You should consider using one way bindings anytime you have an object that
    may be created frequently and you do not intend to change a property; only
    to monitor it for changes (such as in the example above).
  
    ## Adding Bindings Manually
  
    All of the examples above show you how to configure a custom binding, but the
    result of these customizations will be a binding template, not a fully active
    Binding instance. The binding will actually become active only when you
    instantiate the object the binding belongs to. It is useful, however, to
    understand what actually happens when the binding is activated.
  
    For a binding to function it must have at least a `from` property and a `to`
    property. The `from` property path points to the object/key that you want to
    bind from while the `to` path points to the object/key you want to bind to.
  
    When you define a custom binding, you are usually describing the property
    you want to bind from (such as `MyApp.someController.value` in the examples
    above). When your object is created, it will automatically assign the value
    you want to bind `to` based on the name of your binding key. In the
    examples above, during init, Ember objects will effectively call
    something like this on your binding:
  
    ```javascript
    binding = Ember.Binding.from("valueBinding").to("value");
    ```
  
    This creates a new binding instance based on the template you provide, and
    sets the to path to the `value` property of the new object. Now that the
    binding is fully configured with a `from` and a `to`, it simply needs to be
    connected to become active. This is done through the `connect()` method:
  
    ```javascript
    binding.connect(this);
    ```
  
    Note that when you connect a binding you pass the object you want it to be
    connected to. This object will be used as the root for both the from and
    to side of the binding when inspecting relative paths. This allows the
    binding to be automatically inherited by subclassed objects as well.
  
    This also allows you to bind between objects using the paths you declare in
    `from` and `to`:
  
    ```javascript
    // Example 1
    binding = Ember.Binding.from("App.someObject.value").to("value");
    binding.connect(this);
  
    // Example 2
    binding = Ember.Binding.from("parentView.value").to("App.someObject.value");
    binding.connect(this);
    ```
  
    Now that the binding is connected, it will observe both the from and to side
    and relay changes.
  
    If you ever needed to do so (you almost never will, but it is useful to
    understand this anyway), you could manually create an active binding by
    using the `Ember.bind()` helper method. (This is the same method used by
    to setup your bindings on objects):
  
    ```javascript
    Ember.bind(MyApp.anotherObject, "value", "MyApp.someController.value");
    ```
  
    Both of these code fragments have the same effect as doing the most friendly
    form of binding creation like so:
  
    ```javascript
    MyApp.anotherObject = Ember.Object.create({
      valueBinding: "MyApp.someController.value",
  
      // OTHER CODE FOR THIS OBJECT...
    });
    ```
  
    Ember's built in binding creation method makes it easy to automatically
    create bindings for you. You should always use the highest-level APIs
    available, even if you understand how it works underneath.
  
    @class Binding
    @namespace Ember
    @since Ember 0.9
    @public
  */
  // Ember.Binding = Binding; ES6TODO: where to put this?


  /**
    Global helper method to create a new binding. Just pass the root object
    along with a `to` and `from` path to create and connect the binding.
  
    @method bind
    @for Ember
    @param {Object} obj The root object of the transform.
    @param {String} to The path to the 'to' side of the binding.
      Must be relative to obj.
    @param {String} from The path to the 'from' side of the binding.
      Must be relative to obj or a global path.
    @return {Ember.Binding} binding instance
    @public
  */


  /**
  @module @ember/object
  */
  var a_concat = Array.prototype.concat;
  var isArray = Array.isArray;

  function isMethod(obj) {
    return 'function' === typeof obj && obj.isMethod !== false && obj !== Boolean && obj !== Object && obj !== Number && obj !== Array && obj !== Date && obj !== String;
  }

  var CONTINUE = {};

  function mixinProperties(mixinsMeta, mixin) {
    var guid = void 0;

    if (mixin instanceof Mixin) {
      guid = emberUtils.guidFor(mixin);
      if (mixinsMeta.peekMixins(guid)) {
        return CONTINUE;
      }
      mixinsMeta.writeMixins(guid, mixin);
      return mixin.properties;
    } else {
      return mixin; // apply anonymous mixin properties
    }
  }

  function concatenatedMixinProperties(concatProp, props, values, base) {
    // reset before adding each new mixin to pickup concats from previous
    var concats = values[concatProp] || base[concatProp];
    if (props[concatProp]) {
      concats = concats ? a_concat.call(concats, props[concatProp]) : props[concatProp];
    }
    return concats;
  }

  function giveDescriptorSuper(meta$$1, key, property, values, descs, base) {
    var superProperty = void 0,
        possibleDesc,
        superDesc;

    // Computed properties override methods, and do not call super to them
    if (values[key] === undefined) {
      // Find the original descriptor in a parent mixin
      superProperty = descs[key];
    }

    // If we didn't find the original descriptor in a parent mixin, find
    // it on the original object.
    if (!superProperty) {
      possibleDesc = base[key];
      superDesc = possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor ? possibleDesc : undefined;


      superProperty = superDesc;
    }

    if (superProperty === undefined || !(superProperty instanceof ComputedProperty)) {
      return property;
    }

    // Since multiple mixins may inherit from the same parent, we need
    // to clone the computed property so that other mixins do not receive
    // the wrapped version.
    property = Object.create(property);
    property._getter = emberUtils.wrap(property._getter, superProperty._getter);
    if (superProperty._setter) {
      if (property._setter) {
        property._setter = emberUtils.wrap(property._setter, superProperty._setter);
      } else {
        property._setter = superProperty._setter;
      }
    }

    return property;
  }

  function giveMethodSuper(obj, key, method, values, descs) {
    var superMethod = void 0;

    // Methods overwrite computed properties, and do not call super to them.
    if (descs[key] === undefined) {
      // Find the original method in a parent mixin
      superMethod = values[key];
    }

    // If we didn't find the original value in a parent mixin, find it in
    // the original object
    superMethod = superMethod || obj[key];

    // Only wrap the new method if the original method was a function
    if (superMethod === undefined || 'function' !== typeof superMethod) {
      return method;
    }

    return emberUtils.wrap(method, superMethod);
  }

  function applyConcatenatedProperties(obj, key, value, values) {
    var baseValue = values[key] || obj[key];
    var ret = void 0;

    if (baseValue === null || baseValue === undefined) {
      ret = emberUtils.makeArray(value);
    } else if (isArray(baseValue)) {
      if (value === null || value === undefined) {
        ret = baseValue;
      } else {
        ret = a_concat.call(baseValue, value);
      }
    } else {
      ret = a_concat.call(emberUtils.makeArray(baseValue), value);
    }

    {
      // it is possible to use concatenatedProperties with strings (which cannot be frozen)
      // only freeze objects...
      if (typeof ret === 'object' && ret !== null) {
        // prevent mutating `concatenatedProperties` array after it is applied
        Object.freeze(ret);
      }
    }

    return ret;
  }

  function applyMergedProperties(obj, key, value, values) {
    var baseValue = values[key] || obj[key],
        propValue;

    true && !!isArray(value) && emberDebug.assert('You passed in `' + JSON.stringify(value) + '` as the value for `' + key + '` but `' + key + '` cannot be an Array', !isArray(value));

    if (!baseValue) {
      return value;
    }

    var newBase = emberUtils.assign({}, baseValue);
    var hasFunction = false;

    for (var prop in value) {
      if (!value.hasOwnProperty(prop)) {
        continue;
      }

      propValue = value[prop];

      if (isMethod(propValue)) {
        // TODO: support for Computed Properties, etc?
        hasFunction = true;
        newBase[prop] = giveMethodSuper(obj, prop, propValue, baseValue, {});
      } else {
        newBase[prop] = propValue;
      }
    }

    if (hasFunction) {
      newBase._super = emberUtils.ROOT;
    }

    return newBase;
  }

  function addNormalizedProperty(base, key, value, meta$$1, descs, values, concats, mergings) {
    if (value instanceof Descriptor) {
      if (value === REQUIRED && descs[key]) {
        return CONTINUE;
      }

      // Wrap descriptor function to implement
      // _super() if needed
      if (value._getter) {
        value = giveDescriptorSuper(meta$$1, key, value, values, descs, base);
      }

      descs[key] = value;
      values[key] = undefined;
    } else {
      if (concats && concats.indexOf(key) >= 0 || key === 'concatenatedProperties' || key === 'mergedProperties') {
        value = applyConcatenatedProperties(base, key, value, values);
      } else if (mergings && mergings.indexOf(key) > -1) {
        value = applyMergedProperties(base, key, value, values);
      } else if (isMethod(value)) {
        value = giveMethodSuper(base, key, value, values, descs);
      }

      descs[key] = undefined;
      values[key] = value;
    }
  }

  function mergeMixins(mixins, meta$$1, descs, values, base, keys) {
    var currentMixin = void 0,
        props = void 0,
        key = void 0,
        concats = void 0,
        mergings = void 0,
        i;

    function removeKeys(keyName) {
      delete descs[keyName];
      delete values[keyName];
    }

    for (i = 0; i < mixins.length; i++) {
      currentMixin = mixins[i];
      true && !(typeof currentMixin === 'object' && currentMixin !== null && Object.prototype.toString.call(currentMixin) !== '[object Array]') && emberDebug.assert('Expected hash or Mixin instance, got ' + Object.prototype.toString.call(currentMixin), typeof currentMixin === 'object' && currentMixin !== null && Object.prototype.toString.call(currentMixin) !== '[object Array]');

      props = mixinProperties(meta$$1, currentMixin);
      if (props === CONTINUE) {
        continue;
      }

      if (props) {
        if (base.willMergeMixin) {
          base.willMergeMixin(props);
        }
        concats = concatenatedMixinProperties('concatenatedProperties', props, values, base);
        mergings = concatenatedMixinProperties('mergedProperties', props, values, base);

        for (key in props) {
          if (!props.hasOwnProperty(key)) {
            continue;
          }
          keys.push(key);
          addNormalizedProperty(base, key, props[key], meta$$1, descs, values, concats, mergings);
        }

        // manually copy toString() because some JS engines do not enumerate it
        if (props.hasOwnProperty('toString')) {
          base.toString = props.toString;
        }
      } else if (currentMixin.mixins) {
        mergeMixins(currentMixin.mixins, meta$$1, descs, values, base, keys);
        if (currentMixin._without) {
          currentMixin._without.forEach(removeKeys);
        }
      }
    }
  }

  function detectBinding(key) {
    var length = key.length;

    return length > 7 && key.charCodeAt(length - 7) === 66 && key.indexOf('inding', length - 6) !== -1;
  }
  // warm both paths of above function
  detectBinding('notbound');
  detectBinding('fooBinding');

  function connectBindings(obj, meta$$1) {
    // TODO Mixin.apply(instance) should disconnect binding if exists
    meta$$1.forEachBindings(function (key, binding) {
      var to;

      if (binding) {
        to = key.slice(0, -7); // strip Binding off end

        if (binding instanceof Binding) {
          binding = binding.copy(); // copy prototypes' instance
          binding.to(to);
        } else {
          // binding is string path
          binding = new Binding(to, binding);
        }
        binding.connect(obj);
        obj[key] = binding;
      }
    });
    // mark as applied
    meta$$1.clearBindings();
  }

  function finishPartial(obj, meta$$1) {
    connectBindings(obj, meta$$1 === undefined ? meta(obj) : meta$$1);
    return obj;
  }

  function followAlias(obj, desc, descs, values) {
    var altKey = desc.methodName;
    var value = void 0;
    var possibleDesc = void 0;
    if (descs[altKey] || values[altKey]) {
      value = values[altKey];
      desc = descs[altKey];
    } else if ((possibleDesc = obj[altKey]) && possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor) {
      desc = possibleDesc;
      value = undefined;
    } else {
      desc = undefined;
      value = obj[altKey];
    }

    return { desc: desc, value: value };
  }

  function updateObserversAndListeners(obj, key, paths, updateMethod) {
    var i;

    if (paths) {
      for (i = 0; i < paths.length; i++) {
        updateMethod(obj, paths[i], null, key);
      }
    }
  }

  function replaceObserversAndListeners(obj, key, observerOrListener) {
    var prev = obj[key];

    if (typeof prev === 'function') {
      updateObserversAndListeners(obj, key, prev.__ember_observesBefore__, _removeBeforeObserver);
      updateObserversAndListeners(obj, key, prev.__ember_observes__, removeObserver);
      updateObserversAndListeners(obj, key, prev.__ember_listens__, removeListener);
    }

    if (typeof observerOrListener === 'function') {
      updateObserversAndListeners(obj, key, observerOrListener.__ember_observesBefore__, _addBeforeObserver);
      updateObserversAndListeners(obj, key, observerOrListener.__ember_observes__, addObserver);
      updateObserversAndListeners(obj, key, observerOrListener.__ember_listens__, addListener);
    }
  }

  function applyMixin(obj, mixins, partial) {
    var descs = {},
        i,
        followed;
    var values = {};
    var meta$$1 = meta(obj);
    var keys = [];
    var key = void 0,
        value = void 0,
        desc = void 0;

    obj._super = emberUtils.ROOT;

    // Go through all mixins and hashes passed in, and:
    //
    // * Handle concatenated properties
    // * Handle merged properties
    // * Set up _super wrapping if necessary
    // * Set up computed property descriptors
    // * Copying `toString` in broken browsers
    mergeMixins(mixins, meta$$1, descs, values, obj, keys);

    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      if (key === 'constructor' || !values.hasOwnProperty(key)) {
        continue;
      }

      desc = descs[key];
      value = values[key];

      if (desc === REQUIRED) {
        continue;
      }

      while (desc && desc instanceof Alias) {
        followed = followAlias(obj, desc, descs, values);

        desc = followed.desc;
        value = followed.value;
      }

      if (desc === undefined && value === undefined) {
        continue;
      }

      replaceObserversAndListeners(obj, key, value);

      if (detectBinding(key)) {
        meta$$1.writeBindings(key, value);
      }

      defineProperty(obj, key, desc, value, meta$$1);
    }

    if (!partial) {
      // don't apply to prototype
      finishPartial(obj, meta$$1);
    }

    return obj;
  }

  /**
    @method mixin
    @param obj
    @param mixins*
    @return obj
    @private
  */


  /**
    The `Mixin` class allows you to create mixins, whose properties can be
    added to other classes. For instance,
  
    ```javascript
    import Mixin from '@ember/object/mixin';
  
    const EditableMixin = Mixin.create({
      edit() {
        console.log('starting to edit');
        this.set('isEditing', true);
      },
      isEditing: false
    });
    ```
  
    ```javascript
    import EmberObject from '@ember/object';
    import EditableMixin from '../mixins/editable';
  
    // Mix mixins into classes by passing them as the first arguments to
    // `.extend.`
    const Comment = EmberObject.extend(EditableMixin, {
      post: null
    });
  
    let comment = Comment.create({
      post: somePost
    });
  
    comment.edit(); // outputs 'starting to edit'
    ```
  
    Note that Mixins are created with `Mixin.create`, not
    `Mixin.extend`.
  
    Note that mixins extend a constructor's prototype so arrays and object literals
    defined as properties will be shared amongst objects that implement the mixin.
    If you want to define a property in a mixin that is not shared, you can define
    it either as a computed property or have it be created on initialization of the object.
  
    ```javascript
    // filters array will be shared amongst any object implementing mixin
    import Mixin from '@ember/object/mixin';
    import { A } from '@ember/array';
  
    const FilterableMixin = Mixin.create({
      filters: A()
    });
    ```
  
    ```javascript
    import Mixin from '@ember/object/mixin';
    import { A } from '@ember/array';
    import { computed } from '@ember/object';
  
    // filters will be a separate array for every object implementing the mixin
    const FilterableMixin = Mixin.create({
      filters: computed(function() {
        return A();
      })
    });
    ```
  
    ```javascript
    import Mixin from '@ember/object/mixin';
    import { A } from '@ember/array';
  
    // filters will be created as a separate array during the object's initialization
    const Filterable = Mixin.create({
      filters: null,
  
      init() {
        this._super(...arguments);
        this.set("filters", A());
      }
    });
    ```
  
    @class Mixin
    @public
  */

  var Mixin = function () {
    function Mixin(mixins, properties) {

      this.properties = properties;

      var length = mixins && mixins.length,
          m,
          i,
          x;

      if (length > 0) {
        m = new Array(length);


        for (i = 0; i < length; i++) {
          x = mixins[i];

          if (x instanceof Mixin) {
            m[i] = x;
          } else {
            m[i] = new Mixin(undefined, x);
          }
        }

        this.mixins = m;
      } else {
        this.mixins = undefined;
      }
      this.ownerConstructor = undefined;
      this._without = undefined;
      this[emberUtils.GUID_KEY] = null;
      this[emberUtils.NAME_KEY] = null;
      emberDebug.debugSeal(this);
    }

    Mixin.applyPartial = function (obj) {
      var _len2, args, _key2;

      for (_len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }

      return applyMixin(obj, args, true);
    };

    /**
      @method create
      @for @ember/object/mixin
      @static
      @param arguments*
      @public
    */

    Mixin.create = function () {
      // ES6TODO: this relies on a global state?
      unprocessedFlag = true;
      var M = this,
          _len3,
          args,
          _key3;

      for (_len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        args[_key3] = arguments[_key3];
      }

      return new M(args, undefined);
    };

    // returns the mixins currently applied to the specified object
    // TODO: Make `mixin`


    Mixin.mixins = function (obj) {
      var meta$$1 = exports.peekMeta(obj);
      var ret = [];
      if (meta$$1 === undefined) {
        return ret;
      }

      meta$$1.forEachMixins(function (key, currentMixin) {
        // skip primitive mixins since these are always anonymous
        if (!currentMixin.properties) {
          ret.push(currentMixin);
        }
      });

      return ret;
    };

    /**
      @method reopen
      @param arguments*
      @private
    */

    Mixin.prototype.reopen = function () {
      var currentMixin = void 0;

      if (this.properties) {
        currentMixin = new Mixin(undefined, this.properties);
        this.properties = undefined;
        this.mixins = [currentMixin];
      } else if (!this.mixins) {
        this.mixins = [];
      }

      var mixins = this.mixins;
      var idx = void 0;

      for (idx = 0; idx < arguments.length; idx++) {
        currentMixin = arguments[idx];
        true && !(typeof currentMixin === 'object' && currentMixin !== null && Object.prototype.toString.call(currentMixin) !== '[object Array]') && emberDebug.assert('Expected hash or Mixin instance, got ' + Object.prototype.toString.call(currentMixin), typeof currentMixin === 'object' && currentMixin !== null && Object.prototype.toString.call(currentMixin) !== '[object Array]');

        if (currentMixin instanceof Mixin) {
          mixins.push(currentMixin);
        } else {
          mixins.push(new Mixin(undefined, currentMixin));
        }
      }

      return this;
    };

    /**
      @method apply
      @param obj
      @return applied object
      @private
    */

    Mixin.prototype.apply = function (obj) {
      return applyMixin(obj, [this], false);
    };

    Mixin.prototype.applyPartial = function (obj) {
      return applyMixin(obj, [this], true);
    };

    /**
      @method detect
      @param obj
      @return {Boolean}
      @private
    */

    Mixin.prototype.detect = function (obj) {
      if (typeof obj !== 'object' || obj === null) {
        return false;
      }
      if (obj instanceof Mixin) {
        return _detect(obj, this, {});
      }
      var meta$$1 = exports.peekMeta(obj);
      if (meta$$1 === undefined) {
        return false;
      }
      return !!meta$$1.peekMixins(emberUtils.guidFor(this));
    };

    Mixin.prototype.without = function () {
      var ret = new Mixin([this]),
          _len4,
          args,
          _key4;

      for (_len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
        args[_key4] = arguments[_key4];
      }

      ret._without = args;
      return ret;
    };

    Mixin.prototype.keys = function () {
      var keys = {};


      _keys(keys, this, {});
      var ret = Object.keys(keys);
      return ret;
    };

    return Mixin;
  }();

  Mixin._apply = applyMixin;
  Mixin.finishPartial = finishPartial;

  var MixinPrototype = Mixin.prototype;
  MixinPrototype.toString = Object.toString;

  emberDebug.debugSeal(MixinPrototype);

  var unprocessedFlag = false;

  function _detect(curMixin, targetMixin, seen) {
    var guid = emberUtils.guidFor(curMixin);

    if (seen[guid]) {
      return false;
    }
    seen[guid] = true;

    if (curMixin === targetMixin) {
      return true;
    }
    var mixins = curMixin.mixins;
    var loc = mixins ? mixins.length : 0;
    while (--loc >= 0) {
      if (_detect(mixins[loc], targetMixin, seen)) {
        return true;
      }
    }
    return false;
  }

  function _keys(ret, mixin, seen) {
    var props, i, key;

    if (seen[emberUtils.guidFor(mixin)]) {
      return;
    }
    seen[emberUtils.guidFor(mixin)] = true;

    if (mixin.properties) {
      props = Object.keys(mixin.properties);

      for (i = 0; i < props.length; i++) {
        key = props[i];

        ret[key] = true;
      }
    } else if (mixin.mixins) {
      mixin.mixins.forEach(function (x) {
        return _keys(ret, x, seen);
      });
    }
  }

  var REQUIRED = new Descriptor();
  REQUIRED.toString = function () {
    return '(Required Property)';
  };

  /**
    Denotes a required property for a mixin
  
    @method required
    @for Ember
    @private
  */


  function Alias(methodName) {
    this.isDescriptor = true;
    this.methodName = methodName;
  }

  Alias.prototype = new Descriptor();

  /**
    Makes a method available via an additional name.
  
    ```app/utils/person.js
    import EmberObject, {
      aliasMethod
    } from '@ember/object';
  
    export default EmberObject.extend({
      name() {
        return 'Tomhuda Katzdale';
      },
      moniker: aliasMethod('name')
    });
    ```
  
    ```javascript
    let goodGuy = Person.create();
  
    goodGuy.name();    // 'Tomhuda Katzdale'
    goodGuy.moniker(); // 'Tomhuda Katzdale'
    ```
  
    @method aliasMethod
    @static
    @for @ember/object
    @param {String} methodName name of the method to alias
    @public
  */


  // ..........................................................
  // OBSERVER HELPER
  //

  /**
    Specify a method that observes property changes.
  
    ```javascript
    import EmberObject from '@ember/object';
    import { observer } from '@ember/object';
  
    export default EmberObject.extend({
      valueObserver: observer('value', function() {
        // Executes whenever the "value" property changes
      })
    });
    ```
  
    Also available as `Function.prototype.observes` if prototype extensions are
    enabled.
  
    @method observer
    @for @ember/object
    @param {String} propertyNames*
    @param {Function} func
    @return func
    @public
    @static
  */
  function observer() {
    var _paths = void 0,
        func = void 0,
        _len5,
        args,
        _key5,
        i;

    for (_len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
      args[_key5] = arguments[_key5];
    }

    if (typeof args[args.length - 1] !== 'function') {
      // revert to old, soft-deprecated argument ordering
      true && !false && emberDebug.deprecate('Passing the dependentKeys after the callback function in observer is deprecated. Ensure the callback function is the last argument.', false, { id: 'ember-metal.observer-argument-order', until: '3.0.0' });

      func = args.shift();
      _paths = args;
    } else {
      func = args.pop();
      _paths = args;
    }

    true && !(typeof func === 'function') && emberDebug.assert('observer called without a function', typeof func === 'function');
    true && !(_paths.length > 0 && _paths.every(function (p) {
      return typeof p === 'string' && p.length;
    })) && emberDebug.assert('observer called without valid path', _paths.length > 0 && _paths.every(function (p) {
      return typeof p === 'string' && p.length;
    }));

    var paths = [];
    var addWatchedProperty = function (path) {
      return paths.push(path);
    };

    for (i = 0; i < _paths.length; ++i) {
      expandProperties(_paths[i], addWatchedProperty);
    }

    func.__ember_observes__ = paths;
    return func;
  }

  /**
    Specify a method that observes property changes.
  
    ```javascript
    import EmberObject from '@ember/object';
  
    EmberObject.extend({
      valueObserver: Ember.immediateObserver('value', function() {
        // Executes whenever the "value" property changes
      })
    });
    ```
  
    In the future, `observer` may become asynchronous. In this event,
    `immediateObserver` will maintain the synchronous behavior.
  
    Also available as `Function.prototype.observesImmediately` if prototype extensions are
    enabled.
  
    @method _immediateObserver
    @for Ember
    @param {String} propertyNames*
    @param {Function} func
    @deprecated Use `observer` instead.
    @return func
    @private
  */


  /**
    When observers fire, they are called with the arguments `obj`, `keyName`.
  
    Note, `@each.property` observer is called per each add or replace of an element
    and it's not called with a specific enumeration item.
  
    A `_beforeObserver` fires before a property changes.
  
    @method beforeObserver
    @for Ember
    @param {String} propertyNames*
    @param {Function} func
    @return func
    @deprecated
    @private
  */


  /**
   @module ember
   @private
   */

  /**
    Read-only property that returns the result of a container lookup.
  
    @class InjectedProperty
    @namespace Ember
    @constructor
    @param {String} type The container type the property will lookup
    @param {String} name (optional) The name the property will lookup, defaults
           to the property's name
    @private
  */
  function InjectedProperty(type, name) {
    this.type = type;
    this.name = name;

    this._super$Constructor(injectedPropertyGet);
    AliasedPropertyPrototype.oneWay.call(this);
  }

  function injectedPropertyGet(keyName) {
    var desc = this[keyName];
    var owner = emberUtils.getOwner(this) || this.container; // fallback to `container` for backwards compat

    true && !(desc && desc.isDescriptor && desc.type) && emberDebug.assert('InjectedProperties should be defined with the inject computed property macros.', desc && desc.isDescriptor && desc.type);
    true && !owner && emberDebug.assert('Attempting to lookup an injected property on an object without a container, ensure that the object was instantiated via a container.', owner);

    return owner.lookup(desc.type + ':' + (desc.name || keyName));
  }

  InjectedProperty.prototype = Object.create(Descriptor.prototype);

  var InjectedPropertyPrototype = InjectedProperty.prototype;
  var ComputedPropertyPrototype$1 = ComputedProperty.prototype;
  var AliasedPropertyPrototype = AliasedProperty.prototype;

  InjectedPropertyPrototype._super$Constructor = ComputedProperty;

  InjectedPropertyPrototype.get = ComputedPropertyPrototype$1.get;
  InjectedPropertyPrototype.readOnly = ComputedPropertyPrototype$1.readOnly;
  InjectedPropertyPrototype.teardown = ComputedPropertyPrototype$1.teardown;

  var splice = Array.prototype.splice;

  /**
    A wrapper for a native ES5 descriptor. In an ideal world, we wouldn't need
    this at all, however, the way we currently flatten/merge our mixins require
    a special value to denote a descriptor.
  
    @class Descriptor
    @private
  */

  var Descriptor$1 = function (_EmberDescriptor) {
    emberBabel.inherits(Descriptor$$1, _EmberDescriptor);

    function Descriptor$$1(desc) {

      var _this = emberBabel.possibleConstructorReturn(this, _EmberDescriptor.call(this));

      _this.desc = desc;
      return _this;
    }

    Descriptor$$1.prototype.setup = function (obj, key) {
      Object.defineProperty(obj, key, this.desc);
    };

    Descriptor$$1.prototype.teardown = function () {};

    return Descriptor$$1;
  }(Descriptor);

  exports['default'] = Ember;
  exports.computed = function () {
    for (_len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var func = args.pop(),
        _len,
        args,
        _key;

    var cp = new ComputedProperty(func);

    if (args.length > 0) {
      cp.property.apply(cp, args);
    }

    return cp;
  };
  exports.cacheFor = cacheFor;
  exports.ComputedProperty = ComputedProperty;
  exports.alias = function (altKey) {
    return new AliasedProperty(altKey);
  };
  exports.merge = function (original, updates) {
    if (updates === null || typeof updates !== 'object') {
      return original;
    }

    var props = Object.keys(updates),
        i;
    var prop = void 0;

    for (i = 0; i < props.length; i++) {
      prop = props[i];
      original[prop] = updates[prop];
    }

    return original;
  };
  exports.deprecateProperty = function (object, deprecatedKey, newKey, options) {
    function _deprecate() {
      true && !false && emberDebug.deprecate('Usage of `' + deprecatedKey + '` is deprecated, use `' + newKey + '` instead.', false, options);
    }

    Object.defineProperty(object, deprecatedKey, {
      configurable: true,
      enumerable: false,
      set: function (value) {
        _deprecate();
        set(this, newKey, value);
      },
      get: function () {
        _deprecate();
        return get(this, newKey);
      }
    });
  };
  exports.instrument = instrument;
  exports._instrumentStart = _instrumentStart;
  exports.instrumentationReset = function () {
    subscribers.length = 0;
    cache = {};
  };
  exports.instrumentationSubscribe = function (pattern, object) {
    var paths = pattern.split('.'),
        i;
    var path = void 0;
    var regex = [];

    for (i = 0; i < paths.length; i++) {
      path = paths[i];
      if (path === '*') {
        regex.push('[^\\.]*');
      } else {
        regex.push(path);
      }
    }

    regex = regex.join('\\.');
    regex = regex + '(\\..*)?';

    var subscriber = {
      pattern: pattern,
      regex: new RegExp('^' + regex + '$'),
      object: object
    };

    subscribers.push(subscriber);
    cache = {};

    return subscriber;
  };
  exports.instrumentationUnsubscribe = function (subscriber) {
    var index = void 0,
        i;

    for (i = 0; i < subscribers.length; i++) {
      if (subscribers[i] === subscriber) {
        index = i;
      }
    }

    subscribers.splice(index, 1);
    cache = {};
  };
  exports.getOnerror = function () {
    return onerror;
  };
  exports.setOnerror = function (handler) {
    onerror = handler;
  };
  exports.setDispatchOverride = function (handler) {
    dispatchOverride = handler;
  };
  exports.getDispatchOverride = function () {
    return dispatchOverride;
  };
  exports.META_DESC = META_DESC;
  exports.meta = meta;
  exports.deleteMeta = function (obj) {
    {
      counters.deleteCalls++;
    }

    var meta = exports.peekMeta(obj);
    if (meta !== undefined) {
      meta.destroy();
    }
  };
  exports.Cache = Cache;
  exports._getPath = _getPath;
  exports.get = get;
  exports.getWithDefault = function (root, key, defaultValue) {
    var value = get(root, key);

    if (value === undefined) {
      return defaultValue;
    }
    return value;
  };
  exports.set = set;
  exports.trySet = trySet;
  exports.WeakMap = WeakMap$1;
  exports.WeakMapPolyfill = WeakMapPolyfill;
  exports.addListener = addListener;
  exports.hasListeners = function (obj, eventName) {
    var meta$$1 = exports.peekMeta(obj);
    if (meta$$1 === undefined) {
      return false;
    }
    var matched = meta$$1.matchingListeners(eventName);
    return matched !== undefined && matched.length > 0;
  };
  exports.listenersFor = listenersFor;
  exports.on = function () {
    for (_len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var func = args.pop(),
        _len,
        args,
        _key;
    var events = args;

    true && !(typeof func === 'function') && emberDebug.assert('on expects function as last argument', typeof func === 'function');
    true && !(events.length > 0 && events.every(function (p) {
      return typeof p === 'string' && p.length;
    })) && emberDebug.assert('on called without valid event names', events.length > 0 && events.every(function (p) {
      return typeof p === 'string' && p.length;
    }));

    func.__ember_listens__ = events;
    return func;
  };
  exports.removeListener = removeListener;
  exports.sendEvent = sendEvent;
  exports.suspendListener = suspendListener;
  exports.suspendListeners = suspendListeners;
  exports.watchedEvents = function (obj) {
    var meta$$1 = exports.peekMeta(obj);
    return meta$$1 !== undefined ? meta$$1.watchedEvents() : [];
  };
  exports.isNone = isNone;
  exports.isEmpty = isEmpty;
  exports.isBlank = isBlank;
  exports.isPresent = function (obj) {
    return !isBlank(obj);
  };
  exports.run = run;
  exports.ObserverSet = ObserverSet;
  exports.beginPropertyChanges = beginPropertyChanges;
  exports.changeProperties = changeProperties;
  exports.endPropertyChanges = endPropertyChanges;
  exports.overrideChains = overrideChains;
  exports.propertyDidChange = propertyDidChange;
  exports.propertyWillChange = propertyWillChange;
  exports.PROPERTY_DID_CHANGE = PROPERTY_DID_CHANGE;
  exports.defineProperty = defineProperty;
  exports.Descriptor = Descriptor;
  exports._hasCachedComputedProperties = function () {
    hasCachedComputedProperties = true;
  };
  exports.watchKey = watchKey;
  exports.unwatchKey = unwatchKey;
  exports.ChainNode = ChainNode;
  exports.finishChains = function (meta$$1) {
    // finish any current chains node watchers that reference obj
    var chainWatchers = meta$$1.readableChainWatchers();
    if (chainWatchers !== undefined) {
      chainWatchers.revalidateAll();
    }
    // ensure that if we have inherited any chains they have been
    // copied onto our own meta.
    if (meta$$1.readableChains() !== undefined) {
      meta$$1.writableChains(makeChainNode);
    }
  };
  exports.removeChainWatcher = removeChainWatcher;
  exports.watchPath = watchPath;
  exports.unwatchPath = unwatchPath;
  exports.isWatching = function (obj, key) {
    return watcherCount(obj, key) > 0;
  };
  exports.unwatch = unwatch;
  exports.watch = watch;
  exports.watcherCount = watcherCount;
  exports.libraries = libraries;
  exports.Libraries = Libraries;
  exports.Map = Map;
  exports.MapWithDefault = MapWithDefault;
  exports.OrderedSet = OrderedSet;
  exports.getProperties = function (obj) {
    var ret = {};
    var propertyNames = arguments;
    var i = 1;

    if (arguments.length === 2 && Array.isArray(arguments[1])) {
      i = 0;
      propertyNames = arguments[1];
    }
    for (; i < propertyNames.length; i++) {
      ret[propertyNames[i]] = get(obj, propertyNames[i]);
    }
    return ret;
  };
  exports.setProperties = function (obj, properties) {
    if (properties === null || typeof properties !== 'object') {
      return properties;
    }
    changeProperties(function () {
      var props = Object.keys(properties),
          i;
      var propertyName = void 0;

      for (i = 0; i < props.length; i++) {
        propertyName = props[i];

        set(obj, propertyName, properties[propertyName]);
      }
    });
    return properties;
  };
  exports.expandProperties = expandProperties;
  exports._suspendObserver = _suspendObserver;
  exports._suspendObservers = function (obj, paths, target, method, callback) {
    var events = paths.map(changeEvent);
    return suspendListeners(obj, events, target, method, callback);
  };
  exports.addObserver = addObserver;
  exports.observersFor = function (obj, path) {
    return listenersFor(obj, changeEvent(path));
  };
  exports.removeObserver = removeObserver;
  exports._addBeforeObserver = _addBeforeObserver;
  exports._removeBeforeObserver = _removeBeforeObserver;
  exports.Mixin = Mixin;
  exports.aliasMethod = function (methodName) {
    return new Alias(methodName);
  };
  exports._immediateObserver = function () {
    var i, arg;

    true && !false && emberDebug.deprecate('Usage of `Ember.immediateObserver` is deprecated, use `observer` instead.', false, { id: 'ember-metal.immediate-observer', until: '3.0.0' });

    for (i = 0; i < arguments.length; i++) {
      arg = arguments[i];

      true && !(typeof arg !== 'string' || arg.indexOf('.') === -1) && emberDebug.assert('Immediate observers must observe internal properties only, not properties on other objects.', typeof arg !== 'string' || arg.indexOf('.') === -1);
    }

    return observer.apply(this, arguments);
  };
  exports._beforeObserver = function () {
    for (_len6 = arguments.length, args = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
      args[_key6] = arguments[_key6];
    }

    var func = args[args.length - 1],
        _len6,
        args,
        _key6,
        i;
    var paths = void 0;

    var addWatchedProperty = function (path) {
      paths.push(path);
    };

    var _paths = args.slice(0, -1);

    if (typeof func !== 'function') {
      // revert to old, soft-deprecated argument ordering

      func = args[0];
      _paths = args.slice(1);
    }

    paths = [];

    for (i = 0; i < _paths.length; ++i) {
      expandProperties(_paths[i], addWatchedProperty);
    }

    if (typeof func !== 'function') {
      throw new emberDebug.EmberError('_beforeObserver called without a function');
    }

    func.__ember_observesBefore__ = paths;
    return func;
  };
  exports.mixin = function (obj) {
    var _len, args, _key;

    for (_len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    applyMixin(obj, args, false);
    return obj;
  };
  exports.observer = observer;
  exports.required = function () {
    true && !false && emberDebug.deprecate('Ember.required is deprecated as its behavior is inconsistent and unreliable.', false, { id: 'ember-metal.required', until: '3.0.0' });

    return REQUIRED;
  };
  exports.REQUIRED = REQUIRED;
  exports.hasUnprocessedMixins = function () {
    return unprocessedFlag;
  };
  exports.clearUnprocessedMixins = function () {
    unprocessedFlag = false;
  };
  exports.detectBinding = detectBinding;
  exports.Binding = Binding;
  exports.bind = function (obj, to, from) {
    return new Binding(to, from).connect(obj);
  };
  exports.isGlobalPath = isGlobalPath;
  exports.InjectedProperty = InjectedProperty;
  exports.setHasViews = function (fn) {
    hasViews = fn;
  };
  exports.tagForProperty = function (object, propertyKey, _meta) {
    if (typeof object !== 'object' || object === null) {
      return _glimmer_reference.CONSTANT_TAG;
    }

    var meta$$1 = _meta === undefined ? meta(object) : _meta;
    if (meta$$1.isProxy()) {
      return tagFor(object, meta$$1);
    }

    var tags = meta$$1.writableTags();
    var tag = tags[propertyKey];
    if (tag) {
      return tag;
    }

    return tags[propertyKey] = makeTag();
  };
  exports.tagFor = tagFor;
  exports.markObjectAsDirty = markObjectAsDirty;
  exports.replace = function (array, idx, amt, objects) {
    var args = [].concat(objects);
    var ret = [];
    // https://code.google.com/p/chromium/issues/detail?id=56588
    var size = 60000;
    var start = idx;
    var ends = amt;
    var count = void 0,
        chunk = void 0;

    while (args.length) {
      count = ends > size ? size : ends;
      if (count <= 0) {
        count = 0;
      }

      chunk = args.splice(0, size);
      chunk = [start, count].concat(chunk);

      start += size;
      ends -= count;

      ret = ret.concat(splice.apply(array, chunk));
    }
    return ret;
  };
  exports.isProxy = function (value) {
    var meta$$1;

    if (typeof value === 'object' && value !== null) {
      meta$$1 = exports.peekMeta(value);

      return meta$$1 === undefined ? false : meta$$1.isProxy();
    }

    return false;
  };
  exports.descriptor = function (desc) {
    return new Descriptor$1(desc);
  };

  Object.defineProperty(exports, '__esModule', { value: true });
});
enifed('ember-template-compiler/compat', ['ember-metal', 'ember-template-compiler/system/precompile', 'ember-template-compiler/system/compile', 'ember-template-compiler/system/compile-options'], function (_emberMetal, _precompile, _compile, _compileOptions) {
  'use strict';

  var EmberHandlebars = _emberMetal.default.Handlebars = _emberMetal.default.Handlebars || {}; // reexports

  var EmberHTMLBars = _emberMetal.default.HTMLBars = _emberMetal.default.HTMLBars || {};

  EmberHTMLBars.precompile = EmberHandlebars.precompile = _precompile.default;
  EmberHTMLBars.compile = EmberHandlebars.compile = _compile.default;
  EmberHTMLBars.registerPlugin = _compileOptions.registerPlugin;
});
enifed('ember-template-compiler/index', ['exports', 'ember-template-compiler/system/precompile', 'ember-template-compiler/system/compile', 'ember-template-compiler/system/compile-options', 'ember-template-compiler/plugins', 'ember-metal', 'ember/features', 'ember-environment', 'ember/version', 'ember-template-compiler/compat', 'ember-template-compiler/system/bootstrap'], function (exports, _precompile, _compile, _compileOptions, _plugins, _emberMetal, _features, _emberEnvironment, _version) {
  'use strict';

  exports.defaultPlugins = exports.registerPlugin = exports.compileOptions = exports.compile = exports.precompile = exports._Ember = undefined;
  Object.defineProperty(exports, 'precompile', {
    enumerable: true,
    get: function () {
      return _precompile.default;
    }
  });
  Object.defineProperty(exports, 'compile', {
    enumerable: true,
    get: function () {
      return _compile.default;
    }
  });
  Object.defineProperty(exports, 'compileOptions', {
    enumerable: true,
    get: function () {
      return _compileOptions.default;
    }
  });
  Object.defineProperty(exports, 'registerPlugin', {
    enumerable: true,
    get: function () {
      return _compileOptions.registerPlugin;
    }
  });
  Object.defineProperty(exports, 'defaultPlugins', {
    enumerable: true,
    get: function () {
      return _plugins.default;
    }
  });

  // private API used by ember-cli-htmlbars to setup ENV and FEATURES
  if (!_emberMetal.default.ENV) {
    _emberMetal.default.ENV = _emberEnvironment.ENV;
  }
  if (!_emberMetal.default.FEATURES) {
    _emberMetal.default.FEATURES = _features.FEATURES;
  }
  if (!_emberMetal.default.VERSION) {
    _emberMetal.default.VERSION = _version.default;
  }

  exports._Ember = _emberMetal.default;
});
enifed('ember-template-compiler/plugins/assert-input-helper-without-block', ['exports', 'ember-debug', 'ember-template-compiler/system/calculate-location-display'], function (exports, _emberDebug, _calculateLocationDisplay) {
  'use strict';

  exports.default = function (env) {
    var moduleName = env.meta.moduleName;

    return {
      name: 'assert-input-helper-without-block',

      visitors: {
        BlockStatement: function (node) {
          if (node.path.original !== 'input') {
            return;
          }

          true && !false && (0, _emberDebug.assert)(assertMessage(moduleName, node));
        }
      }
    };
  };


  function assertMessage(moduleName, node) {
    var sourceInformation = (0, _calculateLocationDisplay.default)(moduleName, node.loc);

    return 'The {{input}} helper cannot be used in block form. ' + sourceInformation;
  }
});
enifed('ember-template-compiler/plugins/assert-reserved-named-arguments', ['exports', 'ember-debug', 'ember-template-compiler/system/calculate-location-display'], function (exports, _emberDebug, _calculateLocationDisplay) {
  'use strict';

  exports.default = function (env) {
    var moduleName = env.meta.moduleName;

    return {
      name: 'assert-reserved-named-arguments',

      visitors: {
        PathExpression: function (node) {
          if (node.original[0] === '@') {
            true && !false && (0, _emberDebug.assert)(assertMessage(moduleName, node));
          }
        }
      }
    };
  };


  function assertMessage(moduleName, node) {
    var path = node.original;
    var source = (0, _calculateLocationDisplay.default)(moduleName, node.loc);

    return '\'' + path + '\' is not a valid path. ' + source;
  }
});
enifed('ember-template-compiler/plugins/deprecate-render-model', ['exports', 'ember-debug', 'ember-template-compiler/system/calculate-location-display'], function (exports, _emberDebug, _calculateLocationDisplay) {
  'use strict';

  exports.default = function (env) {
    var moduleName = env.meta.moduleName;

    return {
      name: 'deprecate-render-model',

      visitors: {
        MustacheStatement: function (node) {
          if (node.path.original === 'render' && node.params.length > 1) {
            node.params.forEach(function (param) {
              if (param.type !== 'PathExpression') {
                return;
              }

              true && !false && (0, _emberDebug.deprecate)(deprecationMessage(moduleName, node, param), false, {
                id: 'ember-template-compiler.deprecate-render-model',
                until: '3.0.0',
                url: 'https://emberjs.com/deprecations/v2.x#toc_model-param-in-code-render-code-helper'
              });
            });
          }
        }
      }
    };
  };


  function deprecationMessage(moduleName, node, param) {
    var sourceInformation = (0, _calculateLocationDisplay.default)(moduleName, node.loc);
    var componentName = node.params[0].original;
    var modelName = param.original;


    return 'Please refactor `' + ('{{render "' + componentName + '" ' + modelName + '}}') + '` to a component and invoke via' + (' `' + ('{{' + componentName + ' model=' + modelName + '}}') + '`. ' + sourceInformation);
  }
});
enifed('ember-template-compiler/plugins/deprecate-render', ['exports', 'ember-debug', 'ember-template-compiler/system/calculate-location-display'], function (exports, _emberDebug, _calculateLocationDisplay) {
  'use strict';

  exports.default = function (env) {
    var moduleName = env.meta.moduleName;

    return {
      name: 'deprecate-render',

      visitors: {
        MustacheStatement: function (node) {
          if (node.path.original !== 'render') {
            return;
          }
          if (node.params.length !== 1) {
            return;
          }

          each(node.params, function (param) {
            if (param.type !== 'StringLiteral') {
              return;
            }

            true && !false && (0, _emberDebug.deprecate)(deprecationMessage(moduleName, node), false, {
              id: 'ember-template-compiler.deprecate-render',
              until: '3.0.0',
              url: 'https://emberjs.com/deprecations/v2.x#toc_code-render-code-helper'
            });
          });
        }
      }
    };
  };


  function each(list, callback) {
    var i, l;

    for (i = 0, l = list.length; i < l; i++) {
      callback(list[i]);
    }
  }

  function deprecationMessage(moduleName, node) {
    var sourceInformation = (0, _calculateLocationDisplay.default)(moduleName, node.loc);
    var componentName = node.params[0].original;


    return 'Please refactor `' + ('{{render "' + componentName + '"}}') + '` to a component and invoke via' + (' `' + ('{{' + componentName + '}}') + '`. ' + sourceInformation);
  }
});
enifed('ember-template-compiler/plugins/extract-pragma-tag', ['exports'], function (exports) {
  'use strict';

  exports.default = function (env) {
    var meta = env.meta;

    return {
      name: 'exract-pragma-tag',

      visitors: {
        MustacheStatement: {
          enter: function (node) {
            if (node.path.type === 'PathExpression' && node.path.original === PRAGMA_TAG) {
              meta.managerId = node.params[0].value;
              return null;
            }
          }
        }
      }
    };
  };
  var PRAGMA_TAG = 'use-component-manager';
});
enifed('ember-template-compiler/plugins/index', ['exports', 'ember-template-compiler/plugins/transform-old-binding-syntax', 'ember-template-compiler/plugins/transform-angle-bracket-components', 'ember-template-compiler/plugins/transform-input-on-to-onEvent', 'ember-template-compiler/plugins/transform-top-level-components', 'ember-template-compiler/plugins/transform-inline-link-to', 'ember-template-compiler/plugins/transform-old-class-binding-syntax', 'ember-template-compiler/plugins/transform-quoted-bindings-into-just-bindings', 'ember-template-compiler/plugins/deprecate-render-model', 'ember-template-compiler/plugins/deprecate-render', 'ember-template-compiler/plugins/assert-reserved-named-arguments', 'ember-template-compiler/plugins/transform-action-syntax', 'ember-template-compiler/plugins/transform-input-type-syntax', 'ember-template-compiler/plugins/transform-attrs-into-args', 'ember-template-compiler/plugins/transform-each-in-into-each', 'ember-template-compiler/plugins/transform-has-block-syntax', 'ember-template-compiler/plugins/transform-dot-component-invocation', 'ember-template-compiler/plugins/extract-pragma-tag', 'ember-template-compiler/plugins/assert-input-helper-without-block', 'ember/features'], function (exports, _transformOldBindingSyntax, _transformAngleBracketComponents, _transformInputOnToOnEvent, _transformTopLevelComponents, _transformInlineLinkTo, _transformOldClassBindingSyntax, _transformQuotedBindingsIntoJustBindings, _deprecateRenderModel, _deprecateRender, _assertReservedNamedArguments, _transformActionSyntax, _transformInputTypeSyntax, _transformAttrsIntoArgs, _transformEachInIntoEach, _transformHasBlockSyntax, _transformDotComponentInvocation, _extractPragmaTag, _assertInputHelperWithoutBlock, _features) {
  'use strict';

  var transforms = [_transformDotComponentInvocation.default, _transformOldBindingSyntax.default, _transformAngleBracketComponents.default, _transformInputOnToOnEvent.default, _transformTopLevelComponents.default, _transformInlineLinkTo.default, _transformOldClassBindingSyntax.default, _transformQuotedBindingsIntoJustBindings.default, _deprecateRenderModel.default, _deprecateRender.default, _assertReservedNamedArguments.default, _transformActionSyntax.default, _transformInputTypeSyntax.default, _transformAttrsIntoArgs.default, _transformEachInIntoEach.default, _transformHasBlockSyntax.default, _assertInputHelperWithoutBlock.default];

  if (_features.GLIMMER_CUSTOM_COMPONENT_MANAGER) {
    transforms.push(_extractPragmaTag.default);
  }

  exports.default = Object.freeze(transforms);
});
enifed('ember-template-compiler/plugins/transform-action-syntax', ['exports'], function (exports) {
  'use strict';

  exports.default =
  /**
   @module ember
  */

  /**
    A Glimmer2 AST transformation that replaces all instances of
  
    ```handlebars
   <button {{action 'foo'}}>
   <button onblur={{action 'foo'}}>
   <button onblur={{action (action 'foo') 'bar'}}>
    ```
  
    with
  
    ```handlebars
   <button {{action this 'foo'}}>
   <button onblur={{action this 'foo'}}>
   <button onblur={{action this (action this 'foo') 'bar'}}>
    ```
  
    @private
    @class TransformActionSyntax
  */

  function (_ref) {
    var syntax = _ref.syntax;
    var b = syntax.builders;

    return {
      name: 'transform-action-syntax',

      visitors: {
        ElementModifierStatement: function (node) {
          if (isAction(node)) {
            insertThisAsFirstParam(node, b);
          }
        },
        MustacheStatement: function (node) {
          if (isAction(node)) {
            insertThisAsFirstParam(node, b);
          }
        },
        SubExpression: function (node) {
          if (isAction(node)) {
            insertThisAsFirstParam(node, b);
          }
        }
      }
    };
  };

  function isAction(node) {
    return node.path.original === 'action';
  }

  function insertThisAsFirstParam(node, builders) {
    node.params.unshift(builders.path('this'));
  }
});
enifed('ember-template-compiler/plugins/transform-angle-bracket-components', ['exports'], function (exports) {
  'use strict';

  exports.default = function () {
    return {
      name: 'transform-angle-bracket-components',

      visitors: {
        ComponentNode: function (node) {
          node.tag = '<' + node.tag + '>';
        }
      }
    };
  };
});
enifed('ember-template-compiler/plugins/transform-attrs-into-args', ['exports'], function (exports) {
  'use strict';

  exports.default =
  /**
   @module ember
  */

  /**
    A Glimmer2 AST transformation that replaces all instances of
  
    ```handlebars
   {{attrs.foo.bar}}
    ```
  
    to
  
    ```handlebars
   {{@foo.bar}}
    ```
  
    as well as `{{#if attrs.foo}}`, `{{deeply (nested attrs.foobar.baz)}}`,
    `{{this.attrs.foo}}` etc
  
    @private
    @class TransformAttrsToProps
  */

  function (env) {
    var b = env.syntax.builders;

    var stack = [[]];

    return {
      name: 'transform-attrs-into-args',

      visitors: {
        Program: {
          enter: function (node) {
            var parent = stack[stack.length - 1];
            stack.push(parent.concat(node.blockParams));
          },
          exit: function () {
            stack.pop();
          }
        },

        PathExpression: function (node) {
          var path;

          if (isAttrs(node, stack[stack.length - 1])) {
            path = b.path(node.original.substr(6));

            path.original = '@' + path.original;
            path.data = true;
            return path;
          }
        }
      }
    };
  };

  function isAttrs(node, symbols) {
    var name = node.parts[0];

    if (symbols.indexOf(name) !== -1) {
      return false;
    }

    if (name === 'attrs') {
      if (node.this === true) {
        node.parts.shift();
        node.original = node.original.slice(5);
      }

      return true;
    }

    return false;
  }
});
enifed('ember-template-compiler/plugins/transform-dot-component-invocation', ['exports'], function (exports) {
  'use strict';

  exports.default =

  /**
    Transforms dot invocation of closure components to be wrapped
    with the component helper. This allows for a more static invocation
    of the component.
  
    ```handlebars
   {{#my-component as |comps|}}
    {{comp.dropdown isOpen=false}}
   {{/my-component}}
    ```
  
    with
  
    ```handlebars
    {{#my-component as |comps|}}
      {{component comp.dropdown isOpen=false}}
    {{/my-component}}
    ```
    and
  
    ```handlebars
   {{#my-component as |comps|}}
    {{comp.dropdown isOpen}}
   {{/my-component}}
    ```
  
    with
  
    ```handlebars
    {{#my-component as |comps|}}
      {{component comp.dropdown isOpen}}
    {{/my-component}}
    ```
  
    and
  
    ```handlebars
    {{#my-component as |comps|}}
      {{#comp.dropdown}}Open{{/comp.dropdown}}
    {{/my-component}}
    ```
  
    with
  
    ```handlebars
    {{#my-component as |comps|}}
      {{#component comp.dropdown}}Open{{/component}}
    {{/my-component}}
    ```
  
    @private
    @class TransFormDotComponentInvocation
  */
  function (env) {
    var b = env.syntax.builders;

    return {
      name: 'transform-dot-component-invocation',

      visitors: {
        MustacheStatement: function (node) {
          if (isInlineInvocation(node.path, node.params, node.hash)) {
            wrapInComponent(node, b);
          }
        },
        BlockStatement: function (node) {
          if (isMultipartPath(node.path)) {
            wrapInComponent(node, b);
          }
        }
      }
    };
  };

  function isMultipartPath(path) {
    return path.parts && path.parts.length > 1;
  }

  function isInlineInvocation(path, params, hash) {
    if (isMultipartPath(path)) {
      if (params.length > 0 || hash.pairs.length > 0) {
        return true;
      }
    }

    return false;
  }

  function wrapInComponent(node, builder) {
    var component = node.path;
    var componentHelper = builder.path('component');
    node.path = componentHelper;
    node.params.unshift(component);
  }
});
enifed('ember-template-compiler/plugins/transform-each-in-into-each', ['exports'], function (exports) {
  'use strict';

  exports.default =
  /**
   @module ember
  */

  /**
    A Glimmer2 AST transformation that replaces all instances of
  
    ```handlebars
   {{#each-in iterableThing as |key value|}}
    ```
  
    with
  
    ```handlebars
   {{#each (-each-in iterableThing) as |key value|}}
    ```
  
    @private
    @class TransformHasBlockSyntax
  */
  function (env) {
    var b = env.syntax.builders;

    return {
      name: 'transform-each-in-into-each',

      visitors: {
        BlockStatement: function (node) {
          if (node.path.original === 'each-in') {
            node.params[0] = b.sexpr(b.path('-each-in'), [node.params[0]]);
            return b.block(b.path('each'), node.params, node.hash, node.program, node.inverse, node.loc);
          }
        }
      }
    };
  };
});
enifed('ember-template-compiler/plugins/transform-has-block-syntax', ['exports'], function (exports) {
  'use strict';

  exports.default = function (env) {
    var b = env.syntax.builders;

    return {
      name: 'transform-has-block-syntax',

      visitors: {
        PathExpression: function (node) {
          if (TRANSFORMATIONS[node.original]) {
            return b.sexpr(b.path(TRANSFORMATIONS[node.original]));
          }
        },
        MustacheStatement: function (node) {
          if (TRANSFORMATIONS[node.path.original]) {
            return b.mustache(b.path(TRANSFORMATIONS[node.path.original]), node.params, node.hash, null, node.loc);
          }
        },
        SubExpression: function (node) {
          if (TRANSFORMATIONS[node.path.original]) {
            return b.sexpr(b.path(TRANSFORMATIONS[node.path.original]), node.params, node.hash);
          }
        }
      }
    };
  };
  /**
   @module ember
  */

  /**
    A Glimmer2 AST transformation that replaces all instances of
  
    ```handlebars
   {{hasBlock}}
    ```
  
    with
  
    ```handlebars
   {{has-block}}
    ```
  
    @private
    @class TransformHasBlockSyntax
  */

  var TRANSFORMATIONS = {
    hasBlock: 'has-block',
    hasBlockParams: 'has-block-params'
  };
});
enifed('ember-template-compiler/plugins/transform-inline-link-to', ['exports'], function (exports) {
  'use strict';

  exports.default = function (env) {
    var b = env.syntax.builders;

    return {
      name: 'transform-inline-link-to',

      visitors: {
        MustacheStatement: function (node) {
          var content;

          if (node.path.original === 'link-to') {
            content = node.escaped ? node.params[0] : unsafeHtml(b, node.params[0]);

            return b.block('link-to', node.params.slice(1), node.hash, buildProgram(b, content, node.loc), null, node.loc);
          }
        }
      }
    };
  };
  function buildProgram(b, content, loc) {
    return b.program([buildStatement(b, content, loc)], null, loc);
  }

  function buildStatement(b, content, loc) {
    switch (content.type) {
      case 'PathExpression':
        return b.mustache(content, null, null, null, loc);

      case 'SubExpression':
        return b.mustache(content.path, content.params, content.hash, null, loc);

      // The default case handles literals.
      default:
        return b.text('' + content.value, loc);
    }
  }

  function unsafeHtml(b, expr) {
    return b.sexpr('-html-safe', [expr]);
  }
});
enifed('ember-template-compiler/plugins/transform-input-on-to-onEvent', ['exports', 'ember-debug', 'ember-template-compiler/system/calculate-location-display'], function (exports, _emberDebug, _calculateLocationDisplay) {
  'use strict';

  exports.default =

  /**
   @module ember
  */

  /**
    An HTMLBars AST transformation that replaces all instances of
  
    ```handlebars
   {{input on="enter" action="doStuff"}}
   {{input on="key-press" action="doStuff"}}
    ```
  
    with
  
    ```handlebars
   {{input enter="doStuff"}}
   {{input key-press="doStuff"}}
    ```
  
    @private
    @class TransformInputOnToOnEvent
  */
  function (env) {
    var b = env.syntax.builders;
    var moduleName = env.meta.moduleName;

    return {
      name: 'transform-input-on-to-onEvent',

      visitors: {
        MustacheStatement: function (node) {
          if (node.path.original !== 'input') {
            return;
          }

          var action = hashPairForKey(node.hash, 'action');
          var on = hashPairForKey(node.hash, 'on');
          var onEvent = hashPairForKey(node.hash, 'onEvent');

          if (!action && !on && !onEvent) {
            return;
          }

          var normalizedOn = on || onEvent;
          var moduleInfo = (0, _calculateLocationDisplay.default)(moduleName, node.loc);

          if (normalizedOn && normalizedOn.value.type !== 'StringLiteral') {
            true && !false && (0, _emberDebug.deprecate)('Using a dynamic value for \'#{normalizedOn.key}=\' with the \'{{input}}\' helper ' + moduleInfo + 'is deprecated.', false, { id: 'ember-template-compiler.transform-input-on-to-onEvent.dynamic-value', until: '3.0.0' });

            normalizedOn.key = 'onEvent';
            return; // exit early, as we cannot transform further
          }

          removeFromHash(node.hash, normalizedOn);
          removeFromHash(node.hash, action);

          if (!action) {
            true && !false && (0, _emberDebug.deprecate)('Using \'{{input ' + normalizedOn.key + '="' + normalizedOn.value.value + '" ...}}\' without specifying an action ' + moduleInfo + 'will do nothing.', false, { id: 'ember-template-compiler.transform-input-on-to-onEvent.no-action', until: '3.0.0' });

            return; // exit early, if no action was available there is nothing to do
          }

          var specifiedOn = normalizedOn ? normalizedOn.key + '="' + normalizedOn.value.value + '" ' : '';
          if (normalizedOn && normalizedOn.value.value === 'keyPress') {
            // using `keyPress` in the root of the component will
            // clobber the keyPress event handler
            normalizedOn.value.value = 'key-press';
          }

          var expected = (normalizedOn ? normalizedOn.value.value : 'enter') + '="' + action.value.original + '"';

          true && !false && (0, _emberDebug.deprecate)('Using \'{{input ' + specifiedOn + 'action="' + action.value.original + '"}}\' ' + moduleInfo + 'is deprecated. Please use \'{{input ' + expected + '}}\' instead.', false, { id: 'ember-template-compiler.transform-input-on-to-onEvent.normalized-on', until: '3.0.0' });

          if (!normalizedOn) {
            normalizedOn = b.pair('onEvent', b.string('enter'));
          }

          node.hash.pairs.push(b.pair(normalizedOn.value.value, action.value));
        }
      }
    };
  };

  function hashPairForKey(hash, key) {
    var i, pair;

    for (i = 0; i < hash.pairs.length; i++) {
      pair = hash.pairs[i];

      if (pair.key === key) {
        return pair;
      }
    }

    return false;
  }

  function removeFromHash(hash, pairToRemove) {
    var newPairs = [],
        i,
        pair;
    for (i = 0; i < hash.pairs.length; i++) {
      pair = hash.pairs[i];


      if (pair !== pairToRemove) {
        newPairs.push(pair);
      }
    }

    hash.pairs = newPairs;
  }
});
enifed('ember-template-compiler/plugins/transform-input-type-syntax', ['exports'], function (exports) {
  'use strict';

  exports.default =
  /**
   @module ember
  */

  /**
    A Glimmer2 AST transformation that replaces all instances of
  
    ```handlebars
   {{input type=boundType}}
    ```
  
    with
  
    ```handlebars
   {{input (-input-type boundType) type=boundType}}
    ```
  
    Note that the type parameters is not removed as the -input-type helpers
    is only used to select the component class. The component still needs
    the type parameter to function.
  
    @private
    @class TransformInputTypeSyntax
  */

  function (env) {
    var b = env.syntax.builders;

    return {
      name: 'transform-input-type-syntax',

      visitors: {
        MustacheStatement: function (node) {
          if (isInput(node)) {
            insertTypeHelperParameter(node, b);
          }
        }
      }
    };
  };

  function isInput(node) {
    return node.path.original === 'input';
  }

  function insertTypeHelperParameter(node, builders) {
    var pairs = node.hash.pairs,
        i;
    var pair = null;
    for (i = 0; i < pairs.length; i++) {
      if (pairs[i].key === 'type') {
        pair = pairs[i];
        break;
      }
    }
    if (pair && pair.value.type !== 'StringLiteral') {
      node.params.unshift(builders.sexpr('-input-type', [pair.value], null, pair.loc));
    }
  }
});
enifed('ember-template-compiler/plugins/transform-old-binding-syntax', ['exports', 'ember-debug', 'ember-template-compiler/system/calculate-location-display'], function (exports, _emberDebug, _calculateLocationDisplay) {
  'use strict';

  exports.default = function (env) {
    var moduleName = env.meta.moduleName;

    var b = env.syntax.builders;

    return {
      name: 'transform-old-binding-syntax',

      visitors: {
        BlockStatement: function (node) {
          processHash(b, node, moduleName);
        },
        MustacheStatement: function (node) {
          processHash(b, node, moduleName);
        }
      }
    };
  };


  function processHash(b, node, moduleName) {
    var i, pair, key, value, sourceInformation, newKey;

    for (i = 0; i < node.hash.pairs.length; i++) {
      pair = node.hash.pairs[i];
      key = pair.key, value = pair.value;
      sourceInformation = (0, _calculateLocationDisplay.default)(moduleName, pair.loc);


      if (key === 'classBinding') {
        return;
      }

      true && !(key !== 'attributeBindings') && (0, _emberDebug.assert)('Setting \'attributeBindings\' via template helpers is not allowed ' + sourceInformation, key !== 'attributeBindings');

      if (key.substr(-7) === 'Binding') {
        newKey = key.slice(0, -7);


        true && !false && (0, _emberDebug.deprecate)('You\'re using legacy binding syntax: ' + key + '=' + exprToString(value) + ' ' + sourceInformation + '. Please replace with ' + newKey + '=' + value.original, false, { id: 'ember-template-compiler.transform-old-binding-syntax', until: '3.0.0' });

        pair.key = newKey;
        if (value.type === 'StringLiteral') {
          pair.value = b.path(value.original);
        }
      }
    }
  }

  function exprToString(expr) {
    switch (expr.type) {
      case 'StringLiteral':
        return '"' + expr.original + '"';
      case 'PathExpression':
        return expr.original;
    }
  }
});
enifed('ember-template-compiler/plugins/transform-old-class-binding-syntax', ['exports'], function (exports) {
  'use strict';

  exports.default = function (env) {
    var b = env.syntax.builders;

    return {
      name: 'transform-old-class-binding-syntax',

      visitors: {
        MustacheStatement: function (node) {
          process(b, node);
        },
        BlockStatement: function (node) {
          process(b, node);
        }
      }
    };
  };


  function process(b, node) {
    var allOfTheMicrosyntaxes = [];
    var allOfTheMicrosyntaxIndexes = [];
    var classPair = void 0;

    each(node.hash.pairs, function (pair, index) {
      var key = pair.key;

      if (key === 'classBinding' || key === 'classNameBindings') {
        allOfTheMicrosyntaxIndexes.push(index);
        allOfTheMicrosyntaxes.push(pair);
      } else if (key === 'class') {
        classPair = pair;
      }
    });

    if (allOfTheMicrosyntaxes.length === 0) {
      return;
    }

    var classValue = [];

    if (classPair) {
      classValue.push(classPair.value);
      classValue.push(b.string(' '));
    } else {
      classPair = b.pair('class', null);
      node.hash.pairs.push(classPair);
    }

    each(allOfTheMicrosyntaxIndexes, function (index) {
      node.hash.pairs.splice(index, 1);
    });

    each(allOfTheMicrosyntaxes, function (_ref) {
      var value = _ref.value,
          loc = _ref.loc,
          microsyntax;

      var sexprs = [];
      // TODO: add helpful deprecation when both `classNames` and `classNameBindings` can
      // be removed.

      if (value.type === 'StringLiteral') {
        microsyntax = parseMicrosyntax(value.original);


        buildSexprs(microsyntax, sexprs, b);

        classValue.push.apply(classValue, sexprs);
      }
    });

    var hash = b.hash();
    classPair.value = b.sexpr(b.path('concat'), classValue, hash);
  }

  function buildSexprs(microsyntax, sexprs, b) {
    var i, _microsyntax$i, propName, activeClass, inactiveClass, sexpr, params, sexprParams, hash;

    for (i = 0; i < microsyntax.length; i++) {
      _microsyntax$i = microsyntax[i], propName = _microsyntax$i[0], activeClass = _microsyntax$i[1], inactiveClass = _microsyntax$i[2];
      sexpr = void 0;

      // :my-class-name microsyntax for static values

      if (propName === '') {
        sexpr = b.string(activeClass);
      } else {
        params = [b.path(propName)];


        if (activeClass || activeClass === '') {
          params.push(b.string(activeClass));
        } else {
          sexprParams = [b.string(propName), b.path(propName)];
          hash = b.hash();

          if (activeClass !== undefined) {
            hash.pairs.push(b.pair('activeClass', b.string(activeClass)));
          }

          if (inactiveClass !== undefined) {
            hash.pairs.push(b.pair('inactiveClass', b.string(inactiveClass)));
          }

          params.push(b.sexpr(b.path('-normalize-class'), sexprParams, hash));
        }

        if (inactiveClass || inactiveClass === '') {
          params.push(b.string(inactiveClass));
        }

        sexpr = b.sexpr(b.path('if'), params);
      }

      sexprs.push(sexpr);
      sexprs.push(b.string(' '));
    }
  }

  function each(list, callback) {
    var i;

    for (i = 0; i < list.length; i++) {
      callback(list[i], i);
    }
  }

  function parseMicrosyntax(string) {
    var segments = string.split(' '),
        i;

    for (i = 0; i < segments.length; i++) {
      segments[i] = segments[i].split(':');
    }

    return segments;
  }
});
enifed('ember-template-compiler/plugins/transform-quoted-bindings-into-just-bindings', ['exports'], function (exports) {
  'use strict';

  exports.default = function () {

    return {
      name: 'transform-quoted-bindings-into-just-bindings',

      visitors: {
        ElementNode: function (node) {
          var styleAttr = getStyleAttr(node);

          if (!validStyleAttr(styleAttr)) {
            return;
          }

          styleAttr.value = styleAttr.value.parts[0];
        }
      }
    };
  };


  function validStyleAttr(attr) {
    if (!attr) {
      return false;
    }

    var value = attr.value;

    if (!value || value.type !== 'ConcatStatement' || value.parts.length !== 1) {
      return false;
    }

    var onlyPart = value.parts[0];

    return onlyPart.type === 'MustacheStatement';
  }

  function getStyleAttr(node) {
    var attributes = node.attributes,
        i;

    for (i = 0; i < attributes.length; i++) {
      if (attributes[i].name === 'style') {
        return attributes[i];
      }
    }
  }
});
enifed('ember-template-compiler/plugins/transform-top-level-components', ['exports'], function (exports) {
  'use strict';

  exports.default = function () {
    return {
      name: 'transform-top-level-component',

      visitors: {
        Program: function (node) {
          hasSingleComponentNode(node, function (component) {
            component.tag = '@' + component.tag;
            component.isStatic = true;
          });
        }
      }
    };
  };


  function hasSingleComponentNode(program, componentCallback) {
    var loc = program.loc,
        body = program.body,
        i,
        curr;

    if (!loc || loc.start.line !== 1 || loc.start.column !== 0) {
      return;
    }

    var lastComponentNode = void 0;
    var nodeCount = 0;

    for (i = 0; i < body.length; i++) {
      curr = body[i];

      // text node with whitespace only

      if (curr.type === 'TextNode' && /^[\s]*$/.test(curr.chars)) {
        continue;
      }

      // has multiple root elements if we've been here before
      if (nodeCount++ > 0) {
        return false;
      }

      if (curr.type === 'ComponentNode' || curr.type === 'ElementNode') {
        lastComponentNode = curr;
      }
    }

    if (!lastComponentNode) {
      return;
    }

    if (lastComponentNode.type === 'ComponentNode') {
      componentCallback(lastComponentNode);
    }
  }
});
enifed('ember-template-compiler/system/bootstrap', ['exports', 'ember-debug', 'ember-template-compiler/system/compile'], function (exports, _emberDebug, _compile) {
  'use strict';

  /**
    Find templates stored in the head tag as script tags and make them available
    to `Ember.CoreView` in the global `Ember.TEMPLATES` object.
  
    Script tags with `text/x-handlebars` will be compiled
    with Ember's template compiler and are suitable for use as a view's template.
  
    @private
    @method bootstrap
    @for Ember.HTMLBars
    @static
    @param ctx
  */
  /**
  @module ember
  */

  exports.default = function (_ref) {
    var context = _ref.context,
        hasTemplate = _ref.hasTemplate,
        setTemplate = _ref.setTemplate,
        i,
        script,
        templateName,
        template;

    if (!context) {
      context = document;
    }

    var elements = context.querySelectorAll('script[type="text/x-handlebars"]');

    for (i = 0; i < elements.length; i++) {
      script = elements[i];

      // Get the name of the script
      // First look for data-template-name attribute, then fall back to its
      // id if no name is found.

      templateName = script.getAttribute('data-template-name') || script.getAttribute('id') || 'application';
      template = void 0;


      template = (0, _compile.default)(script.innerHTML, {
        moduleName: templateName
      });

      // Check if template of same name already exists.
      if (hasTemplate(templateName)) {
        throw new _emberDebug.Error('Template named "' + templateName + '" already exists.');
      }

      // For templates which have a name, we save them and then remove them from the DOM.
      setTemplate(templateName, template);

      // Remove script tag from DOM.
      script.parentNode.removeChild(script);
    }
  };
});
enifed('ember-template-compiler/system/calculate-location-display', ['exports'], function (exports) {
  'use strict';

  exports.default = function (moduleName) {
    var loc = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    var _ref = loc.start || {},
        column = _ref.column,
        line = _ref.line;

    var moduleInfo = '';
    if (moduleName) {
      moduleInfo += '\'' + moduleName + '\' ';
    }

    if (line !== undefined && column !== undefined) {
      if (moduleName) {
        // only prepend @ if the moduleName was present
        moduleInfo += '@ ';
      }
      moduleInfo += 'L' + line + ':C' + column;
    }

    if (moduleInfo) {
      moduleInfo = '(' + moduleInfo + ') ';
    }

    return moduleInfo;
  };
});
enifed('ember-template-compiler/system/compile-options', ['exports', 'ember-utils', 'ember-template-compiler/plugins'], function (exports, _emberUtils, _plugins) {
  'use strict';

  exports.default = function (_options) {
    var options = (0, _emberUtils.assign)({ meta: {} }, _options),
        meta,
        potententialPugins,
        providedPlugins,
        pluginsToAdd;

    // move `moduleName` into `meta` property
    if (options.moduleName) {
      meta = options.meta;

      meta.moduleName = options.moduleName;
    }

    if (!options.plugins) {
      options.plugins = { ast: [].concat(USER_PLUGINS, _plugins.default) };
    } else {
      potententialPugins = [].concat(USER_PLUGINS, _plugins.default);
      providedPlugins = options.plugins.ast.map(function (plugin) {
        return wrapLegacyPluginIfNeeded(plugin);
      });
      pluginsToAdd = potententialPugins.filter(function (plugin) {
        return options.plugins.ast.indexOf(plugin) === -1;
      });

      options.plugins.ast = providedPlugins.concat(pluginsToAdd);
    }

    return options;
  };
  exports.registerPlugin = function (type, _plugin) {
    if (type !== 'ast') {
      throw new Error('Attempting to register ' + _plugin + ' as "' + type + '" which is not a valid Glimmer plugin type.');
    }

    for (i = 0; i < USER_PLUGINS.length; i++) {
      PLUGIN = USER_PLUGINS[i];

      if (PLUGIN === _plugin || PLUGIN.__raw === _plugin) {
        return;
      }
    }

    var plugin = wrapLegacyPluginIfNeeded(_plugin),
        i,
        PLUGIN;

    USER_PLUGINS = [plugin].concat(USER_PLUGINS);
  };
  exports.unregisterPlugin = function (type, PluginClass) {
    if (type !== 'ast') {
      throw new Error('Attempting to unregister ' + PluginClass + ' as "' + type + '" which is not a valid Glimmer plugin type.');
    }

    USER_PLUGINS = USER_PLUGINS.filter(function (plugin) {
      return plugin !== PluginClass && plugin.__raw !== PluginClass;
    });
  };

  var USER_PLUGINS = [];

  function wrapLegacyPluginIfNeeded(_plugin) {
    var plugin = _plugin;
    if (_plugin.prototype && _plugin.prototype.transform) {
      plugin = function (env) {
        var pluginInstantiated = false;

        return {
          name: _plugin.constructor && _plugin.constructor.name,

          visitors: {
            Program: function (node) {
              var _plugin2;

              if (!pluginInstantiated) {

                pluginInstantiated = true;
                _plugin2 = new _plugin(env);


                _plugin2.syntax = env.syntax;

                return _plugin2.transform(node);
              }
            }
          }
        };
      };

      plugin.__raw = _plugin;
    }

    return plugin;
  }
});
enifed('ember-template-compiler/system/compile', ['exports', 'require', 'ember-template-compiler/system/precompile'], function (exports, _require2, _precompile) {
  'use strict';

  exports.default =

  /**
    Uses HTMLBars `compile` function to process a string into a compiled template.
  
    This is not present in production builds.
  
    @private
    @method compile
    @param {String} templateString This is the string to be compiled by HTMLBars.
    @param {Object} options This is an options hash to augment the compiler options.
  */
  function (templateString, options) {
    if (!template && (0, _require2.has)('ember-glimmer')) {
      template = (0, _require2.default)('ember-glimmer').template;
    }

    if (!template) {
      throw new Error('Cannot call `compile` with only the template compiler loaded. Please load `ember.debug.js` or `ember.prod.js` prior to calling `compile`.');
    }

    var precompiledTemplateString = (0, _precompile.default)(templateString, options);
    var templateJS = new Function('return ' + precompiledTemplateString)();
    return template(templateJS);
  };
  /**
  @module ember
  */
  var template = void 0;
});
enifed('ember-template-compiler/system/precompile', ['exports', 'ember-template-compiler/system/compile-options', 'require'], function (exports, _compileOptions, _require2) {
  'use strict';

  exports.default =

  /**
    Uses HTMLBars `compile` function to process a string into a compiled template string.
    The returned string must be passed through `Ember.HTMLBars.template`.
  
    This is not present in production builds.
  
    @private
    @method precompile
    @param {String} templateString This is the string to be compiled by HTMLBars.
  */
  function (templateString, options) {
    if (!glimmerPrecompile && (0, _require2.has)('@glimmer/compiler')) {
      glimmerPrecompile = (0, _require2.default)('@glimmer/compiler').precompile;
    }

    if (!glimmerPrecompile) {
      throw new Error('Cannot call `compile` without the template compiler loaded. Please load `ember-template-compiler.js` prior to calling `compile`.');
    }

    return glimmerPrecompile(templateString, (0, _compileOptions.default)(options));
  };
  /**
  @module ember
  */

  var glimmerPrecompile = void 0;
});
enifed('ember-utils', ['exports'], function (exports) {
  'use strict';

  /**
    Strongly hint runtimes to intern the provided string.
  
    When do I need to use this function?
  
    For the most part, never. Pre-mature optimization is bad, and often the
    runtime does exactly what you need it to, and more often the trade-off isn't
    worth it.
  
    Why?
  
    Runtimes store strings in at least 2 different representations:
    Ropes and Symbols (interned strings). The Rope provides a memory efficient
    data-structure for strings created from concatenation or some other string
    manipulation like splitting.
  
    Unfortunately checking equality of different ropes can be quite costly as
    runtimes must resort to clever string comparison algorithms. These
    algorithms typically cost in proportion to the length of the string.
    Luckily, this is where the Symbols (interned strings) shine. As Symbols are
    unique by their string content, equality checks can be done by pointer
    comparison.
  
    How do I know if my string is a rope or symbol?
  
    Typically (warning general sweeping statement, but truthy in runtimes at
    present) static strings created as part of the JS source are interned.
    Strings often used for comparisons can be interned at runtime if some
    criteria are met.  One of these criteria can be the size of the entire rope.
    For example, in chrome 38 a rope longer then 12 characters will not
    intern, nor will segments of that rope.
  
    Some numbers: http://jsperf.com/eval-vs-keys/8
  
    Known Trick™
  
    @private
    @return {String} interned version of the provided string
  */

  function intern(str) {
    var obj = {};
    obj[str] = 1;
    for (var key in obj) {
      if (key === str) {
        return key;
      }
    }
    return str;
  }

  /**
   @module @ember/object
  */

  /**
   Previously we used `Ember.$.uuid`, however `$.uuid` has been removed from
   jQuery master. We'll just bootstrap our own uuid now.
  
   @private
   @return {Number} the uuid
   */
  var _uuid = 0;

  /**
   Generates a universally unique identifier. This method
   is used internally by Ember for assisting with
   the generation of GUID's and other unique identifiers.
  
   @public
   @return {Number} [description]
   */
  function uuid() {
    return ++_uuid;
  }

  /**
   Prefix used for guids through out Ember.
   @private
   @property GUID_PREFIX
   @for Ember
   @type String
   @final
   */


  // Used for guid generation...
  var numberCache = [];
  var stringCache = {};

  /**
    A unique key used to assign guids and other private metadata to objects.
    If you inspect an object in your browser debugger you will often see these.
    They can be safely ignored.
  
    On browsers that support it, these properties are added with enumeration
    disabled so they won't show up when you iterate over your properties.
  
    @private
    @property GUID_KEY
    @for Ember
    @type String
    @final
  */
  var GUID_KEY = intern('__ember' + +new Date());

  var GUID_DESC = {
    writable: true,
    configurable: true,
    enumerable: false,
    value: null
  };

  var GUID_KEY_PROPERTY = {
    name: GUID_KEY,
    descriptor: {
      configurable: true,
      writable: true,
      enumerable: false,
      value: null
    }
  };

  /**
    Generates a new guid, optionally saving the guid to the object that you
    pass in. You will rarely need to use this method. Instead you should
    call `Ember.guidFor(obj)`, which return an existing guid if available.
  
    @private
    @method generateGuid
    @static
    @for @ember/object/internals
    @param {Object} [obj] Object the guid will be used for. If passed in, the guid will
      be saved on the object and reused whenever you pass the same object
      again.
  
      If no object is passed, just generate a new guid.
    @param {String} [prefix] Prefix to place in front of the guid. Useful when you want to
      separate the guid into separate namespaces.
    @return {String} the guid
  */
  function generateGuid(obj) {
    var prefix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'ember';

    var ret = prefix + uuid();
    if (obj !== undefined && obj !== null) {
      if (obj[GUID_KEY] === null) {
        obj[GUID_KEY] = ret;
      } else {
        GUID_DESC.value = ret;
        if (obj.__defineNonEnumerable) {
          obj.__defineNonEnumerable(GUID_KEY_PROPERTY);
        } else {
          Object.defineProperty(obj, GUID_KEY, GUID_DESC);
        }
      }
    }
    return ret;
  }

  /**
    Returns a unique id for the object. If the object does not yet have a guid,
    one will be assigned to it. You can call this on any object,
    `Ember.Object`-based or not, but be aware that it will add a `_guid`
    property.
  
    You can also use this method on DOM Element objects.
  
    @public
    @static
    @method guidFor
    @for @ember/object/internals
    @param {Object} obj any object, string, number, Element, or primitive
    @return {String} the unique guid for this instance.
  */


  function symbol(debugName) {
    // TODO: Investigate using platform symbols, but we do not
    // want to require non-enumerability for this API, which
    // would introduce a large cost.
    var id = GUID_KEY + Math.floor(Math.random() * new Date());
    return intern('__' + debugName + id + '__');
  }

  /**
  @module @ember/application
  */

  var OWNER = symbol('OWNER');

  /**
    Framework objects in an Ember application (components, services, routes, etc.)
    are created via a factory and dependency injection system. Each of these
    objects is the responsibility of an "owner", which handled its
    instantiation and manages its lifetime.
  
    `getOwner` fetches the owner object responsible for an instance. This can
    be used to lookup or resolve other class instances, or register new factories
    into the owner.
  
    For example, this component dynamically looks up a service based on the
    `audioType` passed as an attribute:
  
    ```app/components/play-audio.js
    import Component from '@ember/component';
    import { computed } from '@ember/object';
    import { getOwner } from '@ember/application';
  
    // Usage:
    //
    //   {{play-audio audioType=model.audioType audioFile=model.file}}
    //
    export default Component.extend({
      audioService: computed('audioType', function() {
        let owner = getOwner(this);
        return owner.lookup(`service:${this.get('audioType')}`);
      }),
  
      click() {
        let player = this.get('audioService');
        player.play(this.get('audioFile'));
      }
    });
    ```
  
    @method getOwner
    @static
    @for @ember/application
    @param {Object} object An object with an owner.
    @return {Object} An owner object.
    @since 2.3.0
    @public
  */


  /**
    `setOwner` forces a new owner on a given object instance. This is primarily
    useful in some testing cases.
  
    @method setOwner
    @static
    @for @ember/application
    @param {Object} object An object instance.
    @param {Object} object The new owner object of the object instance.
    @since 2.3.0
    @public
  */


  /**
   @module @ember/polyfills
  */
  /**
    Copy properties from a source object to a target object.
  
    ```javascript
    var a = { first: 'Yehuda' };
    var b = { last: 'Katz' };
    var c = { company: 'Tilde Inc.' };
    Ember.assign(a, b, c); // a === { first: 'Yehuda', last: 'Katz', company: 'Tilde Inc.' }, b === { last: 'Katz' }, c === { company: 'Tilde Inc.' }
    ```
  
    @method assign
    @for @ember/polyfills
    @param {Object} original The object to assign into
    @param {Object} ...args The objects to copy properties from
    @return {Object}
    @public
    @static
  */
  function assign(original) {
    var i, arg, updates, _i, prop;

    for (i = 1; i < arguments.length; i++) {
      arg = arguments[i];

      if (!arg) {
        continue;
      }

      updates = Object.keys(arg);


      for (_i = 0; _i < updates.length; _i++) {
        prop = updates[_i];

        original[prop] = arg[prop];
      }
    }

    return original;
  }

  var assign$1 = Object.assign || assign;

  // the delete is meant to hint at runtimes that this object should remain in
  // dictionary mode. This is clearly a runtime specific hack, but currently it
  // appears worthwhile in some usecases. Please note, these deletes do increase
  // the cost of creation dramatically over a plain Object.create. And as this
  // only makes sense for long-lived dictionaries that aren't instantiated often.


  var HAS_SUPER_PATTERN = /\.(_super|call\(this|apply\(this)/;
  var fnToString = Function.prototype.toString;

  var checkHasSuper = function () {
    var sourceAvailable = fnToString.call(function () {
      return this;
    }).indexOf('return this') > -1;

    if (sourceAvailable) {
      return function (func) {
        return HAS_SUPER_PATTERN.test(fnToString.call(func));
      };
    }

    return function () {
      return true;
    };
  }();

  function ROOT() {}
  ROOT.__hasSuper = false;

  function hasSuper(func) {
    if (func.__hasSuper === undefined) {
      func.__hasSuper = checkHasSuper(func);
    }
    return func.__hasSuper;
  }

  /**
    Wraps the passed function so that `this._super` will point to the superFunc
    when the function is invoked. This is the primitive we use to implement
    calls to super.
  
    @private
    @method wrap
    @for Ember
    @param {Function} func The function to call
    @param {Function} superFunc The super function.
    @return {Function} wrapped function.
  */


  function _wrap(func, superFunc) {
    function superWrapper() {
      var orig = this._super;
      this._super = superFunc;
      var ret = func.apply(this, arguments);
      this._super = orig;
      return ret;
    }

    superWrapper.wrappedFunction = func;
    superWrapper.__ember_observes__ = func.__ember_observes__;
    superWrapper.__ember_observesBefore__ = func.__ember_observesBefore__;
    superWrapper.__ember_listens__ = func.__ember_listens__;

    return superWrapper;
  }

  var objectToString = Object.prototype.toString;
  /**
   @module @ember/debug
  */
  /**
    Convenience method to inspect an object. This method will attempt to
    convert the object into a useful string description.
  
    It is a pretty simple implementation. If you want something more robust,
    use something like JSDump: https://github.com/NV/jsDump
  
    @method inspect
    @static
    @param {Object} obj The object you want to inspect.
    @return {String} A description of the object
    @since 1.4.0
    @private
  */


  /**
   @param {Object} t target
   @param {String} m method
   @param {Array} a args
   @private
   */
  function applyStr(t, m, a) {
    var l = a && a.length;
    if (!a || !l) {
      return t[m]();
    }
    switch (l) {
      case 1:
        return t[m](a[0]);
      case 2:
        return t[m](a[0], a[1]);
      case 3:
        return t[m](a[0], a[1], a[2]);
      case 4:
        return t[m](a[0], a[1], a[2], a[3]);
      case 5:
        return t[m](a[0], a[1], a[2], a[3], a[4]);
      default:
        return t[m].apply(t, a);
    }
  }

  /**
    Checks to see if the `methodName` exists on the `obj`.
  
    ```javascript
    let foo = { bar: function() { return 'bar'; }, baz: null };
  
    Ember.canInvoke(foo, 'bar'); // true
    Ember.canInvoke(foo, 'baz'); // false
    Ember.canInvoke(foo, 'bat'); // false
    ```
  
    @method canInvoke
    @for Ember
    @param {Object} obj The object to check for the method
    @param {String} methodName The method name to check for
    @return {Boolean}
    @private
  */
  function canInvoke(obj, methodName) {
    return obj !== null && obj !== undefined && typeof obj[methodName] === 'function';
  }

  /**
    Checks to see if the `methodName` exists on the `obj`,
    and if it does, invokes it with the arguments passed.
  
    ```javascript
    let d = new Date('03/15/2013');
  
    Ember.tryInvoke(d, 'getTime');              // 1363320000000
    Ember.tryInvoke(d, 'setFullYear', [2014]);  // 1394856000000
    Ember.tryInvoke(d, 'noSuchMethod', [2014]); // undefined
    ```
  
    @method tryInvoke
    @for Ember
    @param {Object} obj The object to check for the method
    @param {String} methodName The method name to check for
    @param {Array} [args] The arguments to pass to the method
    @return {*} the return value of the invoked method or undefined if it cannot be invoked
    @public
  */


  var isArray = Array.isArray;

  /**
   @module @ember/array
  */
  /**
   Forces the passed object to be part of an array. If the object is already
   an array, it will return the object. Otherwise, it will add the object to
   an array. If obj is `null` or `undefined`, it will return an empty array.
  
   ```javascript
   Ember.makeArray();            // []
   Ember.makeArray(null);        // []
   Ember.makeArray(undefined);   // []
   Ember.makeArray('lindsay');   // ['lindsay']
   Ember.makeArray([1, 2, 42]);  // [1, 2, 42]
  
   let controller = Ember.ArrayProxy.create({ content: [] });
  
   Ember.makeArray(controller) === controller;  // true
   ```
  
   @method makeArray
   @static
   @for @ember/array
   @param {Object} obj the object
   @return {Array}
   @private
   */


  var name = symbol('NAME_KEY');

  var objectToString$1 = Object.prototype.toString;

  function isNone(obj) {
    return obj === null || obj === undefined;
  }

  /*
   A `toString` util function that supports objects without a `toString`
   method, e.g. an object created with `Object.create(null)`.
  */
  function toString(obj) {
    var len, r, k;

    if (typeof obj === "string") {
      return obj;
    }

    if (Array.isArray(obj)) {
      // Reimplement Array.prototype.join according to spec (22.1.3.13)
      // Changing ToString(element) with this safe version of ToString.
      len = obj.length;
      r = '';


      for (k = 0; k < len; k++) {
        if (k > 0) {
          r += ',';
        }

        if (!isNone(obj[k])) {
          r += toString(obj[k]);
        }
      }

      return r;
    } else if (obj != null && typeof obj.toString === 'function') {
      return obj.toString();
    } else {
      return objectToString$1.call(obj);
    }
  }

  var HAS_NATIVE_WEAKMAP = function () {
    // detect if `WeakMap` is even present
    var hasWeakMap = typeof WeakMap === 'function';
    if (!hasWeakMap) {
      return false;
    }

    var instance = new WeakMap();
    // use `Object`'s `.toString` directly to prevent us from detecting
    // polyfills as native weakmaps
    return Object.prototype.toString.call(instance) === '[object WeakMap]';
  }();

  var HAS_NATIVE_PROXY = typeof Proxy === 'function';

  /*
   This package will be eagerly parsed and should have no dependencies on external
   packages.
  
   It is intended to be used to share utility methods that will be needed
   by every Ember application (and is **not** a dumping ground of useful utilities).
  
   Utility methods that are needed in < 80% of cases should be placed
   elsewhere (so they can be lazily evaluated / parsed).
  */

  exports.symbol = symbol;
  exports.getOwner = function (object) {
    return object[OWNER];
  };
  exports.setOwner = function (object, owner) {
    object[OWNER] = owner;
  };
  exports.OWNER = OWNER;
  exports.assign = assign$1;
  exports.assignPolyfill = assign;
  exports.dictionary = function (parent) {
    var dict = Object.create(parent);
    dict['_dict'] = null;
    delete dict['_dict'];
    return dict;
  };
  exports.uuid = uuid;
  exports.GUID_KEY = GUID_KEY;
  exports.GUID_DESC = GUID_DESC;
  exports.GUID_KEY_PROPERTY = GUID_KEY_PROPERTY;
  exports.generateGuid = generateGuid;
  exports.guidFor = function (obj) {
    // special cases where we don't want to add a key to object
    if (obj === undefined) {
      return '(undefined)';
    }

    if (obj === null) {
      return '(null)';
    }

    var type = typeof obj;
    if ((type === 'object' || type === 'function') && obj[GUID_KEY]) {
      return obj[GUID_KEY];
    }

    var ret = void 0;
    // Don't allow prototype changes to String etc. to change the guidFor
    switch (type) {
      case 'number':
        ret = numberCache[obj];

        if (!ret) {
          ret = numberCache[obj] = 'nu' + obj;
        }

        return ret;

      case 'string':
        ret = stringCache[obj];

        if (!ret) {
          ret = stringCache[obj] = 'st' + uuid();
        }

        return ret;

      case 'boolean':
        return obj ? '(true)' : '(false)';

      default:
        if (obj === Object) {
          return '(Object)';
        }

        if (obj === Array) {
          return '(Array)';
        }

        return generateGuid(obj);
    }
  };
  exports.intern = intern;
  exports.checkHasSuper = checkHasSuper;
  exports.ROOT = ROOT;
  exports.wrap = function (func, superFunc) {
    if (!hasSuper(func)) {
      return func;
    }
    // ensure an unwrapped super that calls _super is wrapped with a terminal _super
    if (!superFunc.wrappedFunction && hasSuper(superFunc)) {
      return _wrap(func, _wrap(superFunc, ROOT));
    }
    return _wrap(func, superFunc);
  };
  exports.inspect = function (obj) {
    if (obj === null) {
      return 'null';
    }
    if (obj === undefined) {
      return 'undefined';
    }
    if (Array.isArray(obj)) {
      return '[' + obj + ']';
    }
    // for non objects
    var type = typeof obj;
    if (type !== 'object' && type !== 'symbol') {
      return '' + obj;
    }
    // overridden toString
    if (typeof obj.toString === 'function' && obj.toString !== objectToString) {
      return obj.toString();
    }

    // Object.prototype.toString === {}.toString
    var v = void 0;
    var ret = [];
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        v = obj[key];
        if (v === 'toString') {
          continue;
        } // ignore useless items
        if (typeof v === 'function') {
          v = 'function() { ... }';
        }

        if (v && typeof v.toString !== 'function') {
          ret.push(key + ': ' + objectToString.call(v));
        } else {
          ret.push(key + ': ' + v);
        }
      }
    }
    return '{' + ret.join(', ') + '}';
  };
  exports.lookupDescriptor = function (obj, keyName) {
    var current = obj,
        descriptor;
    while (current) {
      descriptor = Object.getOwnPropertyDescriptor(current, keyName);


      if (descriptor) {
        return descriptor;
      }

      current = Object.getPrototypeOf(current);
    }

    return null;
  };
  exports.canInvoke = canInvoke;
  exports.tryInvoke = function (obj, methodName, args) {
    if (canInvoke(obj, methodName)) {
      return applyStr(obj, methodName, args);
    }
  };
  exports.makeArray = function (obj) {
    if (obj === null || obj === undefined) {
      return [];
    }
    return isArray(obj) ? obj : [obj];
  };
  exports.applyStr = applyStr;
  exports.NAME_KEY = name;
  exports.toString = toString;
  exports.HAS_NATIVE_WEAKMAP = HAS_NATIVE_WEAKMAP;
  exports.HAS_NATIVE_PROXY = HAS_NATIVE_PROXY;
});
enifed('ember/features', ['exports', 'ember-environment', 'ember-utils'], function (exports, _emberEnvironment, _emberUtils) {
    'use strict';

    exports.EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER = exports.MANDATORY_SETTER = exports.GLIMMER_CUSTOM_COMPONENT_MANAGER = exports.EMBER_MODULE_UNIFICATION = exports.EMBER_ENGINES_MOUNT_PARAMS = exports.EMBER_ROUTING_ROUTER_SERVICE = exports.EMBER_GLIMMER_ALLOW_BACKTRACKING_RERENDER = exports.EMBER_METAL_WEAKMAP = exports.EMBER_IMPROVED_INSTRUMENTATION = exports.EMBER_LIBRARIES_ISREGISTERED = exports.FEATURES_STRIPPED_TEST = exports.FEATURES = exports.DEFAULT_FEATURES = undefined;
    var DEFAULT_FEATURES = exports.DEFAULT_FEATURES = { "features-stripped-test": false, "ember-libraries-isregistered": false, "ember-improved-instrumentation": false, "ember-metal-weakmap": false, "ember-glimmer-allow-backtracking-rerender": false, "ember-routing-router-service": true, "ember-engines-mount-params": true, "ember-module-unification": false, "glimmer-custom-component-manager": false, "mandatory-setter": true, "ember-glimmer-detect-backtracking-rerender": true };
    var FEATURES = exports.FEATURES = (0, _emberUtils.assign)(DEFAULT_FEATURES, _emberEnvironment.ENV.FEATURES);

    exports.FEATURES_STRIPPED_TEST = FEATURES["features-stripped-test"];
    exports.EMBER_LIBRARIES_ISREGISTERED = FEATURES["ember-libraries-isregistered"];
    exports.EMBER_IMPROVED_INSTRUMENTATION = FEATURES["ember-improved-instrumentation"];
    exports.EMBER_METAL_WEAKMAP = FEATURES["ember-metal-weakmap"];
    exports.EMBER_GLIMMER_ALLOW_BACKTRACKING_RERENDER = FEATURES["ember-glimmer-allow-backtracking-rerender"];
    exports.EMBER_ROUTING_ROUTER_SERVICE = FEATURES["ember-routing-router-service"];
    exports.EMBER_ENGINES_MOUNT_PARAMS = FEATURES["ember-engines-mount-params"];
    exports.EMBER_MODULE_UNIFICATION = FEATURES["ember-module-unification"];
    exports.GLIMMER_CUSTOM_COMPONENT_MANAGER = FEATURES["glimmer-custom-component-manager"];
    exports.MANDATORY_SETTER = FEATURES["mandatory-setter"];
    exports.EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER = FEATURES["ember-glimmer-detect-backtracking-rerender"];
});
enifed("ember/version", ["exports"], function (exports) {
  "use strict";

  exports.default = "2.18.3+96faeee4";
});
enifed("handlebars", ["exports"], function (exports) {
  "use strict";

  // File ignored in coverage tests via setting in .istanbul.yml
  /* Jison generated parser */

  var handlebars = function () {
    var parser = { trace: function () {},
      yy: {},
      symbols_: { "error": 2, "root": 3, "program": 4, "EOF": 5, "program_repetition0": 6, "statement": 7, "mustache": 8, "block": 9, "rawBlock": 10, "partial": 11, "partialBlock": 12, "content": 13, "COMMENT": 14, "CONTENT": 15, "openRawBlock": 16, "rawBlock_repetition_plus0": 17, "END_RAW_BLOCK": 18, "OPEN_RAW_BLOCK": 19, "helperName": 20, "openRawBlock_repetition0": 21, "openRawBlock_option0": 22, "CLOSE_RAW_BLOCK": 23, "openBlock": 24, "block_option0": 25, "closeBlock": 26, "openInverse": 27, "block_option1": 28, "OPEN_BLOCK": 29, "openBlock_repetition0": 30, "openBlock_option0": 31, "openBlock_option1": 32, "CLOSE": 33, "OPEN_INVERSE": 34, "openInverse_repetition0": 35, "openInverse_option0": 36, "openInverse_option1": 37, "openInverseChain": 38, "OPEN_INVERSE_CHAIN": 39, "openInverseChain_repetition0": 40, "openInverseChain_option0": 41, "openInverseChain_option1": 42, "inverseAndProgram": 43, "INVERSE": 44, "inverseChain": 45, "inverseChain_option0": 46, "OPEN_ENDBLOCK": 47, "OPEN": 48, "mustache_repetition0": 49, "mustache_option0": 50, "OPEN_UNESCAPED": 51, "mustache_repetition1": 52, "mustache_option1": 53, "CLOSE_UNESCAPED": 54, "OPEN_PARTIAL": 55, "partialName": 56, "partial_repetition0": 57, "partial_option0": 58, "openPartialBlock": 59, "OPEN_PARTIAL_BLOCK": 60, "openPartialBlock_repetition0": 61, "openPartialBlock_option0": 62, "param": 63, "sexpr": 64, "OPEN_SEXPR": 65, "sexpr_repetition0": 66, "sexpr_option0": 67, "CLOSE_SEXPR": 68, "hash": 69, "hash_repetition_plus0": 70, "hashSegment": 71, "ID": 72, "EQUALS": 73, "blockParams": 74, "OPEN_BLOCK_PARAMS": 75, "blockParams_repetition_plus0": 76, "CLOSE_BLOCK_PARAMS": 77, "path": 78, "dataName": 79, "STRING": 80, "NUMBER": 81, "BOOLEAN": 82, "UNDEFINED": 83, "NULL": 84, "DATA": 85, "pathSegments": 86, "SEP": 87, "$accept": 0, "$end": 1 },
      terminals_: { 2: "error", 5: "EOF", 14: "COMMENT", 15: "CONTENT", 18: "END_RAW_BLOCK", 19: "OPEN_RAW_BLOCK", 23: "CLOSE_RAW_BLOCK", 29: "OPEN_BLOCK", 33: "CLOSE", 34: "OPEN_INVERSE", 39: "OPEN_INVERSE_CHAIN", 44: "INVERSE", 47: "OPEN_ENDBLOCK", 48: "OPEN", 51: "OPEN_UNESCAPED", 54: "CLOSE_UNESCAPED", 55: "OPEN_PARTIAL", 60: "OPEN_PARTIAL_BLOCK", 65: "OPEN_SEXPR", 68: "CLOSE_SEXPR", 72: "ID", 73: "EQUALS", 75: "OPEN_BLOCK_PARAMS", 77: "CLOSE_BLOCK_PARAMS", 80: "STRING", 81: "NUMBER", 82: "BOOLEAN", 83: "UNDEFINED", 84: "NULL", 85: "DATA", 87: "SEP" },
      productions_: [0, [3, 2], [4, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [13, 1], [10, 3], [16, 5], [9, 4], [9, 4], [24, 6], [27, 6], [38, 6], [43, 2], [45, 3], [45, 1], [26, 3], [8, 5], [8, 5], [11, 5], [12, 3], [59, 5], [63, 1], [63, 1], [64, 5], [69, 1], [71, 3], [74, 3], [20, 1], [20, 1], [20, 1], [20, 1], [20, 1], [20, 1], [20, 1], [56, 1], [56, 1], [79, 2], [78, 1], [86, 3], [86, 1], [6, 0], [6, 2], [17, 1], [17, 2], [21, 0], [21, 2], [22, 0], [22, 1], [25, 0], [25, 1], [28, 0], [28, 1], [30, 0], [30, 2], [31, 0], [31, 1], [32, 0], [32, 1], [35, 0], [35, 2], [36, 0], [36, 1], [37, 0], [37, 1], [40, 0], [40, 2], [41, 0], [41, 1], [42, 0], [42, 1], [46, 0], [46, 1], [49, 0], [49, 2], [50, 0], [50, 1], [52, 0], [52, 2], [53, 0], [53, 1], [57, 0], [57, 2], [58, 0], [58, 1], [61, 0], [61, 2], [62, 0], [62, 1], [66, 0], [66, 2], [67, 0], [67, 1], [70, 1], [70, 2], [76, 1], [76, 2]],
      performAction: function (yytext, yyleng, yylineno, yy, yystate,
      /**/$$) {

        var $0 = $$.length - 1,
            inverse,
            program;
        switch (yystate) {
          case 1:
            return $$[$0 - 1];
            break;
          case 2:
            this.$ = yy.prepareProgram($$[$0]);
            break;
          case 3:
            this.$ = $$[$0];
            break;
          case 4:
            this.$ = $$[$0];
            break;
          case 5:
            this.$ = $$[$0];
            break;
          case 6:
            this.$ = $$[$0];
            break;
          case 7:
            this.$ = $$[$0];
            break;
          case 8:
            this.$ = $$[$0];
            break;
          case 9:
            this.$ = {
              type: 'CommentStatement',
              value: yy.stripComment($$[$0]),
              strip: yy.stripFlags($$[$0], $$[$0]),
              loc: yy.locInfo(this._$)
            };

            break;
          case 10:
            this.$ = {
              type: 'ContentStatement',
              original: $$[$0],
              value: $$[$0],
              loc: yy.locInfo(this._$)
            };

            break;
          case 11:
            this.$ = yy.prepareRawBlock($$[$0 - 2], $$[$0 - 1], $$[$0], this._$);
            break;
          case 12:
            this.$ = { path: $$[$0 - 3], params: $$[$0 - 2], hash: $$[$0 - 1] };
            break;
          case 13:
            this.$ = yy.prepareBlock($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0], false, this._$);
            break;
          case 14:
            this.$ = yy.prepareBlock($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0], true, this._$);
            break;
          case 15:
            this.$ = { open: $$[$0 - 5], path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
            break;
          case 16:
            this.$ = { path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
            break;
          case 17:
            this.$ = { path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
            break;
          case 18:
            this.$ = { strip: yy.stripFlags($$[$0 - 1], $$[$0 - 1]), program: $$[$0] };
            break;
          case 19:
            inverse = yy.prepareBlock($$[$0 - 2], $$[$0 - 1], $$[$0], $$[$0], false, this._$), program = yy.prepareProgram([inverse], $$[$0 - 1].loc);

            program.chained = true;

            this.$ = { strip: $$[$0 - 2].strip, program: program, chain: true };

            break;
          case 20:
            this.$ = $$[$0];
            break;
          case 21:
            this.$ = { path: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 2], $$[$0]) };
            break;
          case 22:
            this.$ = yy.prepareMustache($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0 - 4], yy.stripFlags($$[$0 - 4], $$[$0]), this._$);
            break;
          case 23:
            this.$ = yy.prepareMustache($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0 - 4], yy.stripFlags($$[$0 - 4], $$[$0]), this._$);
            break;
          case 24:
            this.$ = {
              type: 'PartialStatement',
              name: $$[$0 - 3],
              params: $$[$0 - 2],
              hash: $$[$0 - 1],
              indent: '',
              strip: yy.stripFlags($$[$0 - 4], $$[$0]),
              loc: yy.locInfo(this._$)
            };

            break;
          case 25:
            this.$ = yy.preparePartialBlock($$[$0 - 2], $$[$0 - 1], $$[$0], this._$);
            break;
          case 26:
            this.$ = { path: $$[$0 - 3], params: $$[$0 - 2], hash: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 4], $$[$0]) };
            break;
          case 27:
            this.$ = $$[$0];
            break;
          case 28:
            this.$ = $$[$0];
            break;
          case 29:
            this.$ = {
              type: 'SubExpression',
              path: $$[$0 - 3],
              params: $$[$0 - 2],
              hash: $$[$0 - 1],
              loc: yy.locInfo(this._$)
            };

            break;
          case 30:
            this.$ = { type: 'Hash', pairs: $$[$0], loc: yy.locInfo(this._$) };
            break;
          case 31:
            this.$ = { type: 'HashPair', key: yy.id($$[$0 - 2]), value: $$[$0], loc: yy.locInfo(this._$) };
            break;
          case 32:
            this.$ = yy.id($$[$0 - 1]);
            break;
          case 33:
            this.$ = $$[$0];
            break;
          case 34:
            this.$ = $$[$0];
            break;
          case 35:
            this.$ = { type: 'StringLiteral', value: $$[$0], original: $$[$0], loc: yy.locInfo(this._$) };
            break;
          case 36:
            this.$ = { type: 'NumberLiteral', value: Number($$[$0]), original: Number($$[$0]), loc: yy.locInfo(this._$) };
            break;
          case 37:
            this.$ = { type: 'BooleanLiteral', value: $$[$0] === 'true', original: $$[$0] === 'true', loc: yy.locInfo(this._$) };
            break;
          case 38:
            this.$ = { type: 'UndefinedLiteral', original: undefined, value: undefined, loc: yy.locInfo(this._$) };
            break;
          case 39:
            this.$ = { type: 'NullLiteral', original: null, value: null, loc: yy.locInfo(this._$) };
            break;
          case 40:
            this.$ = $$[$0];
            break;
          case 41:
            this.$ = $$[$0];
            break;
          case 42:
            this.$ = yy.preparePath(true, $$[$0], this._$);
            break;
          case 43:
            this.$ = yy.preparePath(false, $$[$0], this._$);
            break;
          case 44:
            $$[$0 - 2].push({ part: yy.id($$[$0]), original: $$[$0], separator: $$[$0 - 1] });this.$ = $$[$0 - 2];
            break;
          case 45:
            this.$ = [{ part: yy.id($$[$0]), original: $$[$0] }];
            break;
          case 46:
            this.$ = [];
            break;
          case 47:
            $$[$0 - 1].push($$[$0]);
            break;
          case 48:
            this.$ = [$$[$0]];
            break;
          case 49:
            $$[$0 - 1].push($$[$0]);
            break;
          case 50:
            this.$ = [];
            break;
          case 51:
            $$[$0 - 1].push($$[$0]);
            break;
          case 58:
            this.$ = [];
            break;
          case 59:
            $$[$0 - 1].push($$[$0]);
            break;
          case 64:
            this.$ = [];
            break;
          case 65:
            $$[$0 - 1].push($$[$0]);
            break;
          case 70:
            this.$ = [];
            break;
          case 71:
            $$[$0 - 1].push($$[$0]);
            break;
          case 78:
            this.$ = [];
            break;
          case 79:
            $$[$0 - 1].push($$[$0]);
            break;
          case 82:
            this.$ = [];
            break;
          case 83:
            $$[$0 - 1].push($$[$0]);
            break;
          case 86:
            this.$ = [];
            break;
          case 87:
            $$[$0 - 1].push($$[$0]);
            break;
          case 90:
            this.$ = [];
            break;
          case 91:
            $$[$0 - 1].push($$[$0]);
            break;
          case 94:
            this.$ = [];
            break;
          case 95:
            $$[$0 - 1].push($$[$0]);
            break;
          case 98:
            this.$ = [$$[$0]];
            break;
          case 99:
            $$[$0 - 1].push($$[$0]);
            break;
          case 100:
            this.$ = [$$[$0]];
            break;
          case 101:
            $$[$0 - 1].push($$[$0]);
            break;
        }
      },
      table: [{ 3: 1, 4: 2, 5: [2, 46], 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 1: [3] }, { 5: [1, 4] }, { 5: [2, 2], 7: 5, 8: 6, 9: 7, 10: 8, 11: 9, 12: 10, 13: 11, 14: [1, 12], 15: [1, 20], 16: 17, 19: [1, 23], 24: 15, 27: 16, 29: [1, 21], 34: [1, 22], 39: [2, 2], 44: [2, 2], 47: [2, 2], 48: [1, 13], 51: [1, 14], 55: [1, 18], 59: 19, 60: [1, 24] }, { 1: [2, 1] }, { 5: [2, 47], 14: [2, 47], 15: [2, 47], 19: [2, 47], 29: [2, 47], 34: [2, 47], 39: [2, 47], 44: [2, 47], 47: [2, 47], 48: [2, 47], 51: [2, 47], 55: [2, 47], 60: [2, 47] }, { 5: [2, 3], 14: [2, 3], 15: [2, 3], 19: [2, 3], 29: [2, 3], 34: [2, 3], 39: [2, 3], 44: [2, 3], 47: [2, 3], 48: [2, 3], 51: [2, 3], 55: [2, 3], 60: [2, 3] }, { 5: [2, 4], 14: [2, 4], 15: [2, 4], 19: [2, 4], 29: [2, 4], 34: [2, 4], 39: [2, 4], 44: [2, 4], 47: [2, 4], 48: [2, 4], 51: [2, 4], 55: [2, 4], 60: [2, 4] }, { 5: [2, 5], 14: [2, 5], 15: [2, 5], 19: [2, 5], 29: [2, 5], 34: [2, 5], 39: [2, 5], 44: [2, 5], 47: [2, 5], 48: [2, 5], 51: [2, 5], 55: [2, 5], 60: [2, 5] }, { 5: [2, 6], 14: [2, 6], 15: [2, 6], 19: [2, 6], 29: [2, 6], 34: [2, 6], 39: [2, 6], 44: [2, 6], 47: [2, 6], 48: [2, 6], 51: [2, 6], 55: [2, 6], 60: [2, 6] }, { 5: [2, 7], 14: [2, 7], 15: [2, 7], 19: [2, 7], 29: [2, 7], 34: [2, 7], 39: [2, 7], 44: [2, 7], 47: [2, 7], 48: [2, 7], 51: [2, 7], 55: [2, 7], 60: [2, 7] }, { 5: [2, 8], 14: [2, 8], 15: [2, 8], 19: [2, 8], 29: [2, 8], 34: [2, 8], 39: [2, 8], 44: [2, 8], 47: [2, 8], 48: [2, 8], 51: [2, 8], 55: [2, 8], 60: [2, 8] }, { 5: [2, 9], 14: [2, 9], 15: [2, 9], 19: [2, 9], 29: [2, 9], 34: [2, 9], 39: [2, 9], 44: [2, 9], 47: [2, 9], 48: [2, 9], 51: [2, 9], 55: [2, 9], 60: [2, 9] }, { 20: 25, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 36, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 4: 37, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 39: [2, 46], 44: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 4: 38, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 44: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 13: 40, 15: [1, 20], 17: 39 }, { 20: 42, 56: 41, 64: 43, 65: [1, 44], 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 4: 45, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 5: [2, 10], 14: [2, 10], 15: [2, 10], 18: [2, 10], 19: [2, 10], 29: [2, 10], 34: [2, 10], 39: [2, 10], 44: [2, 10], 47: [2, 10], 48: [2, 10], 51: [2, 10], 55: [2, 10], 60: [2, 10] }, { 20: 46, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 47, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 48, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 42, 56: 49, 64: 43, 65: [1, 44], 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 33: [2, 78], 49: 50, 65: [2, 78], 72: [2, 78], 80: [2, 78], 81: [2, 78], 82: [2, 78], 83: [2, 78], 84: [2, 78], 85: [2, 78] }, { 23: [2, 33], 33: [2, 33], 54: [2, 33], 65: [2, 33], 68: [2, 33], 72: [2, 33], 75: [2, 33], 80: [2, 33], 81: [2, 33], 82: [2, 33], 83: [2, 33], 84: [2, 33], 85: [2, 33] }, { 23: [2, 34], 33: [2, 34], 54: [2, 34], 65: [2, 34], 68: [2, 34], 72: [2, 34], 75: [2, 34], 80: [2, 34], 81: [2, 34], 82: [2, 34], 83: [2, 34], 84: [2, 34], 85: [2, 34] }, { 23: [2, 35], 33: [2, 35], 54: [2, 35], 65: [2, 35], 68: [2, 35], 72: [2, 35], 75: [2, 35], 80: [2, 35], 81: [2, 35], 82: [2, 35], 83: [2, 35], 84: [2, 35], 85: [2, 35] }, { 23: [2, 36], 33: [2, 36], 54: [2, 36], 65: [2, 36], 68: [2, 36], 72: [2, 36], 75: [2, 36], 80: [2, 36], 81: [2, 36], 82: [2, 36], 83: [2, 36], 84: [2, 36], 85: [2, 36] }, { 23: [2, 37], 33: [2, 37], 54: [2, 37], 65: [2, 37], 68: [2, 37], 72: [2, 37], 75: [2, 37], 80: [2, 37], 81: [2, 37], 82: [2, 37], 83: [2, 37], 84: [2, 37], 85: [2, 37] }, { 23: [2, 38], 33: [2, 38], 54: [2, 38], 65: [2, 38], 68: [2, 38], 72: [2, 38], 75: [2, 38], 80: [2, 38], 81: [2, 38], 82: [2, 38], 83: [2, 38], 84: [2, 38], 85: [2, 38] }, { 23: [2, 39], 33: [2, 39], 54: [2, 39], 65: [2, 39], 68: [2, 39], 72: [2, 39], 75: [2, 39], 80: [2, 39], 81: [2, 39], 82: [2, 39], 83: [2, 39], 84: [2, 39], 85: [2, 39] }, { 23: [2, 43], 33: [2, 43], 54: [2, 43], 65: [2, 43], 68: [2, 43], 72: [2, 43], 75: [2, 43], 80: [2, 43], 81: [2, 43], 82: [2, 43], 83: [2, 43], 84: [2, 43], 85: [2, 43], 87: [1, 51] }, { 72: [1, 35], 86: 52 }, { 23: [2, 45], 33: [2, 45], 54: [2, 45], 65: [2, 45], 68: [2, 45], 72: [2, 45], 75: [2, 45], 80: [2, 45], 81: [2, 45], 82: [2, 45], 83: [2, 45], 84: [2, 45], 85: [2, 45], 87: [2, 45] }, { 52: 53, 54: [2, 82], 65: [2, 82], 72: [2, 82], 80: [2, 82], 81: [2, 82], 82: [2, 82], 83: [2, 82], 84: [2, 82], 85: [2, 82] }, { 25: 54, 38: 56, 39: [1, 58], 43: 57, 44: [1, 59], 45: 55, 47: [2, 54] }, { 28: 60, 43: 61, 44: [1, 59], 47: [2, 56] }, { 13: 63, 15: [1, 20], 18: [1, 62] }, { 15: [2, 48], 18: [2, 48] }, { 33: [2, 86], 57: 64, 65: [2, 86], 72: [2, 86], 80: [2, 86], 81: [2, 86], 82: [2, 86], 83: [2, 86], 84: [2, 86], 85: [2, 86] }, { 33: [2, 40], 65: [2, 40], 72: [2, 40], 80: [2, 40], 81: [2, 40], 82: [2, 40], 83: [2, 40], 84: [2, 40], 85: [2, 40] }, { 33: [2, 41], 65: [2, 41], 72: [2, 41], 80: [2, 41], 81: [2, 41], 82: [2, 41], 83: [2, 41], 84: [2, 41], 85: [2, 41] }, { 20: 65, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 26: 66, 47: [1, 67] }, { 30: 68, 33: [2, 58], 65: [2, 58], 72: [2, 58], 75: [2, 58], 80: [2, 58], 81: [2, 58], 82: [2, 58], 83: [2, 58], 84: [2, 58], 85: [2, 58] }, { 33: [2, 64], 35: 69, 65: [2, 64], 72: [2, 64], 75: [2, 64], 80: [2, 64], 81: [2, 64], 82: [2, 64], 83: [2, 64], 84: [2, 64], 85: [2, 64] }, { 21: 70, 23: [2, 50], 65: [2, 50], 72: [2, 50], 80: [2, 50], 81: [2, 50], 82: [2, 50], 83: [2, 50], 84: [2, 50], 85: [2, 50] }, { 33: [2, 90], 61: 71, 65: [2, 90], 72: [2, 90], 80: [2, 90], 81: [2, 90], 82: [2, 90], 83: [2, 90], 84: [2, 90], 85: [2, 90] }, { 20: 75, 33: [2, 80], 50: 72, 63: 73, 64: 76, 65: [1, 44], 69: 74, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 72: [1, 80] }, { 23: [2, 42], 33: [2, 42], 54: [2, 42], 65: [2, 42], 68: [2, 42], 72: [2, 42], 75: [2, 42], 80: [2, 42], 81: [2, 42], 82: [2, 42], 83: [2, 42], 84: [2, 42], 85: [2, 42], 87: [1, 51] }, { 20: 75, 53: 81, 54: [2, 84], 63: 82, 64: 76, 65: [1, 44], 69: 83, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 26: 84, 47: [1, 67] }, { 47: [2, 55] }, { 4: 85, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 39: [2, 46], 44: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 47: [2, 20] }, { 20: 86, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 4: 87, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 26: 88, 47: [1, 67] }, { 47: [2, 57] }, { 5: [2, 11], 14: [2, 11], 15: [2, 11], 19: [2, 11], 29: [2, 11], 34: [2, 11], 39: [2, 11], 44: [2, 11], 47: [2, 11], 48: [2, 11], 51: [2, 11], 55: [2, 11], 60: [2, 11] }, { 15: [2, 49], 18: [2, 49] }, { 20: 75, 33: [2, 88], 58: 89, 63: 90, 64: 76, 65: [1, 44], 69: 91, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 65: [2, 94], 66: 92, 68: [2, 94], 72: [2, 94], 80: [2, 94], 81: [2, 94], 82: [2, 94], 83: [2, 94], 84: [2, 94], 85: [2, 94] }, { 5: [2, 25], 14: [2, 25], 15: [2, 25], 19: [2, 25], 29: [2, 25], 34: [2, 25], 39: [2, 25], 44: [2, 25], 47: [2, 25], 48: [2, 25], 51: [2, 25], 55: [2, 25], 60: [2, 25] }, { 20: 93, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 75, 31: 94, 33: [2, 60], 63: 95, 64: 76, 65: [1, 44], 69: 96, 70: 77, 71: 78, 72: [1, 79], 75: [2, 60], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 75, 33: [2, 66], 36: 97, 63: 98, 64: 76, 65: [1, 44], 69: 99, 70: 77, 71: 78, 72: [1, 79], 75: [2, 66], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 75, 22: 100, 23: [2, 52], 63: 101, 64: 76, 65: [1, 44], 69: 102, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 75, 33: [2, 92], 62: 103, 63: 104, 64: 76, 65: [1, 44], 69: 105, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 33: [1, 106] }, { 33: [2, 79], 65: [2, 79], 72: [2, 79], 80: [2, 79], 81: [2, 79], 82: [2, 79], 83: [2, 79], 84: [2, 79], 85: [2, 79] }, { 33: [2, 81] }, { 23: [2, 27], 33: [2, 27], 54: [2, 27], 65: [2, 27], 68: [2, 27], 72: [2, 27], 75: [2, 27], 80: [2, 27], 81: [2, 27], 82: [2, 27], 83: [2, 27], 84: [2, 27], 85: [2, 27] }, { 23: [2, 28], 33: [2, 28], 54: [2, 28], 65: [2, 28], 68: [2, 28], 72: [2, 28], 75: [2, 28], 80: [2, 28], 81: [2, 28], 82: [2, 28], 83: [2, 28], 84: [2, 28], 85: [2, 28] }, { 23: [2, 30], 33: [2, 30], 54: [2, 30], 68: [2, 30], 71: 107, 72: [1, 108], 75: [2, 30] }, { 23: [2, 98], 33: [2, 98], 54: [2, 98], 68: [2, 98], 72: [2, 98], 75: [2, 98] }, { 23: [2, 45], 33: [2, 45], 54: [2, 45], 65: [2, 45], 68: [2, 45], 72: [2, 45], 73: [1, 109], 75: [2, 45], 80: [2, 45], 81: [2, 45], 82: [2, 45], 83: [2, 45], 84: [2, 45], 85: [2, 45], 87: [2, 45] }, { 23: [2, 44], 33: [2, 44], 54: [2, 44], 65: [2, 44], 68: [2, 44], 72: [2, 44], 75: [2, 44], 80: [2, 44], 81: [2, 44], 82: [2, 44], 83: [2, 44], 84: [2, 44], 85: [2, 44], 87: [2, 44] }, { 54: [1, 110] }, { 54: [2, 83], 65: [2, 83], 72: [2, 83], 80: [2, 83], 81: [2, 83], 82: [2, 83], 83: [2, 83], 84: [2, 83], 85: [2, 83] }, { 54: [2, 85] }, { 5: [2, 13], 14: [2, 13], 15: [2, 13], 19: [2, 13], 29: [2, 13], 34: [2, 13], 39: [2, 13], 44: [2, 13], 47: [2, 13], 48: [2, 13], 51: [2, 13], 55: [2, 13], 60: [2, 13] }, { 38: 56, 39: [1, 58], 43: 57, 44: [1, 59], 45: 112, 46: 111, 47: [2, 76] }, { 33: [2, 70], 40: 113, 65: [2, 70], 72: [2, 70], 75: [2, 70], 80: [2, 70], 81: [2, 70], 82: [2, 70], 83: [2, 70], 84: [2, 70], 85: [2, 70] }, { 47: [2, 18] }, { 5: [2, 14], 14: [2, 14], 15: [2, 14], 19: [2, 14], 29: [2, 14], 34: [2, 14], 39: [2, 14], 44: [2, 14], 47: [2, 14], 48: [2, 14], 51: [2, 14], 55: [2, 14], 60: [2, 14] }, { 33: [1, 114] }, { 33: [2, 87], 65: [2, 87], 72: [2, 87], 80: [2, 87], 81: [2, 87], 82: [2, 87], 83: [2, 87], 84: [2, 87], 85: [2, 87] }, { 33: [2, 89] }, { 20: 75, 63: 116, 64: 76, 65: [1, 44], 67: 115, 68: [2, 96], 69: 117, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 33: [1, 118] }, { 32: 119, 33: [2, 62], 74: 120, 75: [1, 121] }, { 33: [2, 59], 65: [2, 59], 72: [2, 59], 75: [2, 59], 80: [2, 59], 81: [2, 59], 82: [2, 59], 83: [2, 59], 84: [2, 59], 85: [2, 59] }, { 33: [2, 61], 75: [2, 61] }, { 33: [2, 68], 37: 122, 74: 123, 75: [1, 121] }, { 33: [2, 65], 65: [2, 65], 72: [2, 65], 75: [2, 65], 80: [2, 65], 81: [2, 65], 82: [2, 65], 83: [2, 65], 84: [2, 65], 85: [2, 65] }, { 33: [2, 67], 75: [2, 67] }, { 23: [1, 124] }, { 23: [2, 51], 65: [2, 51], 72: [2, 51], 80: [2, 51], 81: [2, 51], 82: [2, 51], 83: [2, 51], 84: [2, 51], 85: [2, 51] }, { 23: [2, 53] }, { 33: [1, 125] }, { 33: [2, 91], 65: [2, 91], 72: [2, 91], 80: [2, 91], 81: [2, 91], 82: [2, 91], 83: [2, 91], 84: [2, 91], 85: [2, 91] }, { 33: [2, 93] }, { 5: [2, 22], 14: [2, 22], 15: [2, 22], 19: [2, 22], 29: [2, 22], 34: [2, 22], 39: [2, 22], 44: [2, 22], 47: [2, 22], 48: [2, 22], 51: [2, 22], 55: [2, 22], 60: [2, 22] }, { 23: [2, 99], 33: [2, 99], 54: [2, 99], 68: [2, 99], 72: [2, 99], 75: [2, 99] }, { 73: [1, 109] }, { 20: 75, 63: 126, 64: 76, 65: [1, 44], 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 5: [2, 23], 14: [2, 23], 15: [2, 23], 19: [2, 23], 29: [2, 23], 34: [2, 23], 39: [2, 23], 44: [2, 23], 47: [2, 23], 48: [2, 23], 51: [2, 23], 55: [2, 23], 60: [2, 23] }, { 47: [2, 19] }, { 47: [2, 77] }, { 20: 75, 33: [2, 72], 41: 127, 63: 128, 64: 76, 65: [1, 44], 69: 129, 70: 77, 71: 78, 72: [1, 79], 75: [2, 72], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 5: [2, 24], 14: [2, 24], 15: [2, 24], 19: [2, 24], 29: [2, 24], 34: [2, 24], 39: [2, 24], 44: [2, 24], 47: [2, 24], 48: [2, 24], 51: [2, 24], 55: [2, 24], 60: [2, 24] }, { 68: [1, 130] }, { 65: [2, 95], 68: [2, 95], 72: [2, 95], 80: [2, 95], 81: [2, 95], 82: [2, 95], 83: [2, 95], 84: [2, 95], 85: [2, 95] }, { 68: [2, 97] }, { 5: [2, 21], 14: [2, 21], 15: [2, 21], 19: [2, 21], 29: [2, 21], 34: [2, 21], 39: [2, 21], 44: [2, 21], 47: [2, 21], 48: [2, 21], 51: [2, 21], 55: [2, 21], 60: [2, 21] }, { 33: [1, 131] }, { 33: [2, 63] }, { 72: [1, 133], 76: 132 }, { 33: [1, 134] }, { 33: [2, 69] }, { 15: [2, 12] }, { 14: [2, 26], 15: [2, 26], 19: [2, 26], 29: [2, 26], 34: [2, 26], 47: [2, 26], 48: [2, 26], 51: [2, 26], 55: [2, 26], 60: [2, 26] }, { 23: [2, 31], 33: [2, 31], 54: [2, 31], 68: [2, 31], 72: [2, 31], 75: [2, 31] }, { 33: [2, 74], 42: 135, 74: 136, 75: [1, 121] }, { 33: [2, 71], 65: [2, 71], 72: [2, 71], 75: [2, 71], 80: [2, 71], 81: [2, 71], 82: [2, 71], 83: [2, 71], 84: [2, 71], 85: [2, 71] }, { 33: [2, 73], 75: [2, 73] }, { 23: [2, 29], 33: [2, 29], 54: [2, 29], 65: [2, 29], 68: [2, 29], 72: [2, 29], 75: [2, 29], 80: [2, 29], 81: [2, 29], 82: [2, 29], 83: [2, 29], 84: [2, 29], 85: [2, 29] }, { 14: [2, 15], 15: [2, 15], 19: [2, 15], 29: [2, 15], 34: [2, 15], 39: [2, 15], 44: [2, 15], 47: [2, 15], 48: [2, 15], 51: [2, 15], 55: [2, 15], 60: [2, 15] }, { 72: [1, 138], 77: [1, 137] }, { 72: [2, 100], 77: [2, 100] }, { 14: [2, 16], 15: [2, 16], 19: [2, 16], 29: [2, 16], 34: [2, 16], 44: [2, 16], 47: [2, 16], 48: [2, 16], 51: [2, 16], 55: [2, 16], 60: [2, 16] }, { 33: [1, 139] }, { 33: [2, 75] }, { 33: [2, 32] }, { 72: [2, 101], 77: [2, 101] }, { 14: [2, 17], 15: [2, 17], 19: [2, 17], 29: [2, 17], 34: [2, 17], 39: [2, 17], 44: [2, 17], 47: [2, 17], 48: [2, 17], 51: [2, 17], 55: [2, 17], 60: [2, 17] }],
      defaultActions: { 4: [2, 1], 55: [2, 55], 57: [2, 20], 61: [2, 57], 74: [2, 81], 83: [2, 85], 87: [2, 18], 91: [2, 89], 102: [2, 53], 105: [2, 93], 111: [2, 19], 112: [2, 77], 117: [2, 97], 120: [2, 63], 123: [2, 69], 124: [2, 12], 136: [2, 75], 137: [2, 32] },
      parseError: function (str) {
        throw new Error(str);
      },
      parse: function (input) {
        var self = this,
            stack = [0],
            vstack = [null],
            lstack = [],
            table = this.table,
            yytext = "",
            yylineno = 0,
            yyleng = 0,
            recovering = 0,
            errStr;
        this.lexer.setInput(input);
        this.lexer.yy = this.yy;
        this.yy.lexer = this.lexer;
        this.yy.parser = this;
        if (typeof this.lexer.yylloc == "undefined") this.lexer.yylloc = {};
        var yyloc = this.lexer.yylloc;
        lstack.push(yyloc);
        var ranges = this.lexer.options && this.lexer.options.ranges;
        if (typeof this.yy.parseError === "function") this.parseError = this.yy.parseError;
        function lex() {
          var token = self.lexer.lex() || 1;

          if (typeof token !== "number") {
            token = self.symbols_[token] || token;
          }
          return token;
        }
        var symbol,
            preErrorSymbol,
            state,
            action,
            r,
            yyval = {},
            p,
            len,
            newState,
            expected;
        while (true) {
          state = stack[stack.length - 1];
          if (this.defaultActions[state]) {
            action = this.defaultActions[state];
          } else {
            if (symbol === null || typeof symbol == "undefined") {
              symbol = lex();
            }
            action = table[state] && table[state][symbol];
          }
          if (typeof action === "undefined" || !action.length || !action[0]) {
            errStr = "";

            if (!recovering) {
              expected = [];
              for (p in table[state]) {
                if (this.terminals_[p] && p > 2) {
                  expected.push("'" + this.terminals_[p] + "'");
                }
              }if (this.lexer.showPosition) {
                errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
              } else {
                errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == 1 ? "end of input" : "'" + (this.terminals_[symbol] || symbol) + "'");
              }
              this.parseError(errStr, { text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected });
            }
          }
          if (action[0] instanceof Array && action.length > 1) {
            throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
          }
          switch (action[0]) {
            case 1:
              stack.push(symbol);
              vstack.push(this.lexer.yytext);
              lstack.push(this.lexer.yylloc);
              stack.push(action[1]);
              symbol = null;
              if (!preErrorSymbol) {
                yyleng = this.lexer.yyleng;
                yytext = this.lexer.yytext;
                yylineno = this.lexer.yylineno;
                yyloc = this.lexer.yylloc;
                if (recovering > 0) recovering--;
              } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
              }
              break;
            case 2:
              len = this.productions_[action[1]][1];
              yyval.$ = vstack[vstack.length - len];
              yyval._$ = { first_line: lstack[lstack.length - (len || 1)].first_line, last_line: lstack[lstack.length - 1].last_line, first_column: lstack[lstack.length - (len || 1)].first_column, last_column: lstack[lstack.length - 1].last_column };
              if (ranges) {
                yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
              }
              r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
              if (typeof r !== "undefined") {
                return r;
              }
              if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
              }
              stack.push(this.productions_[action[1]][0]);
              vstack.push(yyval.$);
              lstack.push(yyval._$);
              newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
              stack.push(newState);
              break;
            case 3:
              return true;
          }
        }
        return true;
      }
    };
    /* Jison generated lexer */
    var lexer = function () {
      var lexer = { EOF: 1,
        parseError: function (str, hash) {
          if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
          } else {
            throw new Error(str);
          }
        },
        setInput: function (input) {
          this._input = input;
          this._more = this._less = this.done = false;
          this.yylineno = this.yyleng = 0;
          this.yytext = this.matched = this.match = '';
          this.conditionStack = ['INITIAL'];
          this.yylloc = { first_line: 1, first_column: 0, last_line: 1, last_column: 0 };
          if (this.options.ranges) this.yylloc.range = [0, 0];
          this.offset = 0;
          return this;
        },
        input: function () {
          var ch = this._input[0];
          this.yytext += ch;
          this.yyleng++;
          this.offset++;
          this.match += ch;
          this.matched += ch;
          var lines = ch.match(/(?:\r\n?|\n).*/g);
          if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
          } else {
            this.yylloc.last_column++;
          }
          if (this.options.ranges) this.yylloc.range[1]++;

          this._input = this._input.slice(1);
          return ch;
        },
        unput: function (ch) {
          var len = ch.length;
          var lines = ch.split(/(?:\r\n?|\n)/g);

          this._input = ch + this._input;
          this.yytext = this.yytext.substr(0, this.yytext.length - len - 1);
          //this.yyleng -= len;
          this.offset -= len;
          var oldLines = this.match.split(/(?:\r\n?|\n)/g);
          this.match = this.match.substr(0, this.match.length - 1);
          this.matched = this.matched.substr(0, this.matched.length - 1);

          if (lines.length - 1) this.yylineno -= lines.length - 1;
          var r = this.yylloc.range;

          this.yylloc = { first_line: this.yylloc.first_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.first_column,
            last_column: lines ? (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length : this.yylloc.first_column - len
          };

          if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
          }
          return this;
        },
        more: function () {
          this._more = true;
          return this;
        },
        less: function (n) {
          this.unput(this.match.slice(n));
        },
        pastInput: function () {
          var past = this.matched.substr(0, this.matched.length - this.match.length);
          return (past.length > 20 ? '...' : '') + past.substr(-20).replace(/\n/g, "");
        },
        upcomingInput: function () {
          var next = this.match;
          if (next.length < 20) {
            next += this._input.substr(0, 20 - next.length);
          }
          return (next.substr(0, 20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
        },
        showPosition: function () {
          var pre = this.pastInput();
          var c = new Array(pre.length + 1).join("-");
          return pre + this.upcomingInput() + "\n" + c + "^";
        },
        next: function () {
          if (this.done) {
            return this.EOF;
          }
          if (!this._input) this.done = true;

          var token, match, tempMatch, index, lines, i;
          if (!this._more) {
            this.yytext = '';
            this.match = '';
          }
          var rules = this._currentRules();
          for (i = 0; i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
              match = tempMatch;
              index = i;
              if (!this.options.flex) break;
            }
          }
          if (match) {
            lines = match[0].match(/(?:\r\n?|\n).*/g);
            if (lines) this.yylineno += lines.length;
            this.yylloc = { first_line: this.yylloc.last_line,
              last_line: this.yylineno + 1,
              first_column: this.yylloc.last_column,
              last_column: lines ? lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length };
            this.yytext += match[0];
            this.match += match[0];
            this.matches = match;
            this.yyleng = this.yytext.length;
            if (this.options.ranges) {
              this.yylloc.range = [this.offset, this.offset += this.yyleng];
            }
            this._more = false;
            this._input = this._input.slice(match[0].length);
            this.matched += match[0];
            token = this.performAction.call(this, this.yy, this, rules[index], this.conditionStack[this.conditionStack.length - 1]);
            if (this.done && this._input) this.done = false;
            if (token) return token;else return;
          }
          if (this._input === "") {
            return this.EOF;
          } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), { text: "", token: null, line: this.yylineno });
          }
        },
        lex: function () {
          var r = this.next();
          if (typeof r !== 'undefined') {
            return r;
          } else {
            return this.lex();
          }
        },
        begin: function (condition) {
          this.conditionStack.push(condition);
        },
        popState: function () {
          return this.conditionStack.pop();
        },
        _currentRules: function () {
          return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
        },
        topState: function () {
          return this.conditionStack[this.conditionStack.length - 2];
        },
        pushState: function (condition) {
          this.begin(condition);
        } };
      lexer.options = {};
      lexer.performAction = function (yy, yy_, $avoiding_name_collisions, YY_START
      /**/) {

        function strip(start, end) {
          return yy_.yytext = yy_.yytext.substr(start, yy_.yyleng - end);
        }

        switch ($avoiding_name_collisions) {
          case 0:
            if (yy_.yytext.slice(-2) === "\\\\") {
              strip(0, 1);
              this.begin("mu");
            } else if (yy_.yytext.slice(-1) === "\\") {
              strip(0, 1);
              this.begin("emu");
            } else {
              this.begin("mu");
            }
            if (yy_.yytext) return 15;

            break;
          case 1:
            return 15;
            break;
          case 2:
            this.popState();
            return 15;

            break;
          case 3:
            this.begin('raw');return 15;
            break;
          case 4:
            this.popState();
            // Should be using `this.topState()` below, but it currently
            // returns the second top instead of the first top. Opened an
            // issue about it at https://github.com/zaach/jison/issues/291
            if (this.conditionStack[this.conditionStack.length - 1] === 'raw') {
              return 15;
            } else {
              yy_.yytext = yy_.yytext.substr(5, yy_.yyleng - 9);
              return 'END_RAW_BLOCK';
            }

            break;
          case 5:
            return 15;
            break;
          case 6:
            this.popState();
            return 14;

            break;
          case 7:
            return 65;
            break;
          case 8:
            return 68;
            break;
          case 9:
            return 19;
            break;
          case 10:
            this.popState();
            this.begin('raw');
            return 23;

            break;
          case 11:
            return 55;
            break;
          case 12:
            return 60;
            break;
          case 13:
            return 29;
            break;
          case 14:
            return 47;
            break;
          case 15:
            this.popState();return 44;
            break;
          case 16:
            this.popState();return 44;
            break;
          case 17:
            return 34;
            break;
          case 18:
            return 39;
            break;
          case 19:
            return 51;
            break;
          case 20:
            return 48;
            break;
          case 21:
            this.unput(yy_.yytext);
            this.popState();
            this.begin('com');

            break;
          case 22:
            this.popState();
            return 14;

            break;
          case 23:
            return 48;
            break;
          case 24:
            return 73;
            break;
          case 25:
            return 72;
            break;
          case 26:
            return 72;
            break;
          case 27:
            return 87;
            break;
          case 28:
            // ignore whitespace
            break;
          case 29:
            this.popState();return 54;
            break;
          case 30:
            this.popState();return 33;
            break;
          case 31:
            yy_.yytext = strip(1, 2).replace(/\\"/g, '"');return 80;
            break;
          case 32:
            yy_.yytext = strip(1, 2).replace(/\\'/g, "'");return 80;
            break;
          case 33:
            return 85;
            break;
          case 34:
            return 82;
            break;
          case 35:
            return 82;
            break;
          case 36:
            return 83;
            break;
          case 37:
            return 84;
            break;
          case 38:
            return 81;
            break;
          case 39:
            return 75;
            break;
          case 40:
            return 77;
            break;
          case 41:
            return 72;
            break;
          case 42:
            yy_.yytext = yy_.yytext.replace(/\\([\\\]])/g, '$1');return 72;
            break;
          case 43:
            return 'INVALID';
            break;
          case 44:
            return 5;
            break;
        }
      };
      lexer.rules = [/^(?:[^\x00]*?(?=(\{\{)))/, /^(?:[^\x00]+)/, /^(?:[^\x00]{2,}?(?=(\{\{|\\\{\{|\\\\\{\{|$)))/, /^(?:\{\{\{\{(?=[^\/]))/, /^(?:\{\{\{\{\/[^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=[=}\s\/.])\}\}\}\})/, /^(?:[^\x00]*?(?=(\{\{\{\{)))/, /^(?:[\s\S]*?--(~)?\}\})/, /^(?:\()/, /^(?:\))/, /^(?:\{\{\{\{)/, /^(?:\}\}\}\})/, /^(?:\{\{(~)?>)/, /^(?:\{\{(~)?#>)/, /^(?:\{\{(~)?#\*?)/, /^(?:\{\{(~)?\/)/, /^(?:\{\{(~)?\^\s*(~)?\}\})/, /^(?:\{\{(~)?\s*else\s*(~)?\}\})/, /^(?:\{\{(~)?\^)/, /^(?:\{\{(~)?\s*else\b)/, /^(?:\{\{(~)?\{)/, /^(?:\{\{(~)?&)/, /^(?:\{\{(~)?!--)/, /^(?:\{\{(~)?![\s\S]*?\}\})/, /^(?:\{\{(~)?\*?)/, /^(?:=)/, /^(?:\.\.)/, /^(?:\.(?=([=~}\s\/.)|])))/, /^(?:[\/.])/, /^(?:\s+)/, /^(?:\}(~)?\}\})/, /^(?:(~)?\}\})/, /^(?:"(\\["]|[^"])*")/, /^(?:'(\\[']|[^'])*')/, /^(?:@)/, /^(?:true(?=([~}\s)])))/, /^(?:false(?=([~}\s)])))/, /^(?:undefined(?=([~}\s)])))/, /^(?:null(?=([~}\s)])))/, /^(?:-?[0-9]+(?:\.[0-9]+)?(?=([~}\s)])))/, /^(?:as\s+\|)/, /^(?:\|)/, /^(?:([^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=([=~}\s\/.)|]))))/, /^(?:\[(\\\]|[^\]])*\])/, /^(?:.)/, /^(?:$)/];
      lexer.conditions = { "mu": { "rules": [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44], "inclusive": false }, "emu": { "rules": [2], "inclusive": false }, "com": { "rules": [6], "inclusive": false }, "raw": { "rules": [3, 4, 5], "inclusive": false }, "INITIAL": { "rules": [0, 1, 44], "inclusive": true } };
      return lexer;
    }();
    parser.lexer = lexer;
    function Parser() {
      this.yy = {};
    }Parser.prototype = parser;parser.Parser = Parser;
    return new Parser();
  }();

  var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

  function Exception(message, node) {
    var loc = node && node.loc,
        line = void 0,
        column = void 0,
        idx;
    if (loc) {
      line = loc.start.line;
      column = loc.start.column;

      message += ' - ' + line + ':' + column;
    }

    var tmp = Error.prototype.constructor.call(this, message);

    // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
    for (idx = 0; idx < errorProps.length; idx++) {
      this[errorProps[idx]] = tmp[errorProps[idx]];
    }

    /* istanbul ignore else */
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, Exception);
    }

    try {
      if (loc) {
        this.lineNumber = line;

        // Work around issue under safari where we can't directly set the column value
        /* istanbul ignore next */
        if (Object.defineProperty) {
          Object.defineProperty(this, 'column', {
            value: column,
            enumerable: true
          });
        } else {
          this.column = column;
        }
      }
    } catch (nop) {
      /* Ignore if the browser is very particular */
    }
  }

  Exception.prototype = new Error();

  function Visitor() {
    this.parents = [];
  }

  Visitor.prototype = {
    constructor: Visitor,
    mutating: false,

    // Visits a given value. If mutating, will replace the value if necessary.
    acceptKey: function (node, name) {
      var value = this.accept(node[name]);
      if (this.mutating) {
        // Hacky sanity check: This may have a few false positives for type for the helper
        // methods but will generally do the right thing without a lot of overhead.
        if (value && !Visitor.prototype[value.type]) {
          throw new Exception('Unexpected node type "' + value.type + '" found when accepting ' + name + ' on ' + node.type);
        }
        node[name] = value;
      }
    },

    // Performs an accept operation with added sanity check to ensure
    // required keys are not removed.
    acceptRequired: function (node, name) {
      this.acceptKey(node, name);

      if (!node[name]) {
        throw new Exception(node.type + ' requires ' + name);
      }
    },

    // Traverses a given array. If mutating, empty respnses will be removed
    // for child elements.
    acceptArray: function (array) {
      var i, l;

      for (i = 0, l = array.length; i < l; i++) {
        this.acceptKey(array, i);

        if (!array[i]) {
          array.splice(i, 1);
          i--;
          l--;
        }
      }
    },

    accept: function (object) {
      if (!object) {
        return;
      }

      /* istanbul ignore next: Sanity code */
      if (!this[object.type]) {
        throw new Exception('Unknown type: ' + object.type, object);
      }

      if (this.current) {
        this.parents.unshift(this.current);
      }
      this.current = object;

      var ret = this[object.type](object);

      this.current = this.parents.shift();

      if (!this.mutating || ret) {
        return ret;
      } else if (ret !== false) {
        return object;
      }
    },

    Program: function (program) {
      this.acceptArray(program.body);
    },

    MustacheStatement: visitSubExpression,
    Decorator: visitSubExpression,

    BlockStatement: visitBlock,
    DecoratorBlock: visitBlock,

    PartialStatement: visitPartial,
    PartialBlockStatement: function (partial) {
      visitPartial.call(this, partial);

      this.acceptKey(partial, 'program');
    },

    ContentStatement: function () /* content */{},
    CommentStatement: function () /* comment */{},

    SubExpression: visitSubExpression,

    PathExpression: function () /* path */{},

    StringLiteral: function () /* string */{},
    NumberLiteral: function () /* number */{},
    BooleanLiteral: function () /* bool */{},
    UndefinedLiteral: function () /* literal */{},
    NullLiteral: function () /* literal */{},

    Hash: function (hash) {
      this.acceptArray(hash.pairs);
    },
    HashPair: function (pair) {
      this.acceptRequired(pair, 'value');
    }
  };

  function visitSubExpression(mustache) {
    this.acceptRequired(mustache, 'path');
    this.acceptArray(mustache.params);
    this.acceptKey(mustache, 'hash');
  }
  function visitBlock(block) {
    visitSubExpression.call(this, block);

    this.acceptKey(block, 'program');
    this.acceptKey(block, 'inverse');
  }
  function visitPartial(partial) {
    this.acceptRequired(partial, 'name');
    this.acceptArray(partial.params);
    this.acceptKey(partial, 'hash');
  }

  function WhitespaceControl() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    this.options = options;
  }
  WhitespaceControl.prototype = new Visitor();

  WhitespaceControl.prototype.Program = function (program) {
    var doStandalone = !this.options.ignoreStandalone,
        i,
        l,
        current,
        strip,
        _isPrevWhitespace,
        _isNextWhitespace,
        openStandalone,
        closeStandalone,
        inlineStandalone;

    var isRoot = !this.isRootSeen;
    this.isRootSeen = true;

    var body = program.body;
    for (i = 0, l = body.length; i < l; i++) {
      current = body[i], strip = this.accept(current);


      if (!strip) {
        continue;
      }

      _isPrevWhitespace = isPrevWhitespace(body, i, isRoot), _isNextWhitespace = isNextWhitespace(body, i, isRoot), openStandalone = strip.openStandalone && _isPrevWhitespace, closeStandalone = strip.closeStandalone && _isNextWhitespace, inlineStandalone = strip.inlineStandalone && _isPrevWhitespace && _isNextWhitespace;


      if (strip.close) {
        omitRight(body, i, true);
      }
      if (strip.open) {
        omitLeft(body, i, true);
      }

      if (doStandalone && inlineStandalone) {
        omitRight(body, i);

        if (omitLeft(body, i)) {
          // If we are on a standalone node, save the indent info for partials
          if (current.type === 'PartialStatement') {
            // Pull out the whitespace from the final line
            current.indent = /([ \t]+$)/.exec(body[i - 1].original)[1];
          }
        }
      }
      if (doStandalone && openStandalone) {
        omitRight((current.program || current.inverse).body);

        // Strip out the previous content node if it's whitespace only
        omitLeft(body, i);
      }
      if (doStandalone && closeStandalone) {
        // Always strip the next node
        omitRight(body, i);

        omitLeft((current.inverse || current.program).body);
      }
    }

    return program;
  };

  WhitespaceControl.prototype.BlockStatement = WhitespaceControl.prototype.DecoratorBlock = WhitespaceControl.prototype.PartialBlockStatement = function (block) {
    this.accept(block.program);
    this.accept(block.inverse);

    // Find the inverse program that is involed with whitespace stripping.
    var program = block.program || block.inverse,
        inverse = block.program && block.inverse,
        firstInverse = inverse,
        lastInverse = inverse,
        inverseStrip;

    if (inverse && inverse.chained) {
      firstInverse = inverse.body[0].program;

      // Walk the inverse chain to find the last inverse that is actually in the chain.
      while (lastInverse.chained) {
        lastInverse = lastInverse.body[lastInverse.body.length - 1].program;
      }
    }

    var strip = {
      open: block.openStrip.open,
      close: block.closeStrip.close,

      // Determine the standalone candiacy. Basically flag our content as being possibly standalone
      // so our parent can determine if we actually are standalone
      openStandalone: isNextWhitespace(program.body),
      closeStandalone: isPrevWhitespace((firstInverse || program).body)
    };

    if (block.openStrip.close) {
      omitRight(program.body, null, true);
    }

    if (inverse) {
      inverseStrip = block.inverseStrip;


      if (inverseStrip.open) {
        omitLeft(program.body, null, true);
      }

      if (inverseStrip.close) {
        omitRight(firstInverse.body, null, true);
      }
      if (block.closeStrip.open) {
        omitLeft(lastInverse.body, null, true);
      }

      // Find standalone else statments
      if (!this.options.ignoreStandalone && isPrevWhitespace(program.body) && isNextWhitespace(firstInverse.body)) {
        omitLeft(program.body);
        omitRight(firstInverse.body);
      }
    } else if (block.closeStrip.open) {
      omitLeft(program.body, null, true);
    }

    return strip;
  };

  WhitespaceControl.prototype.Decorator = WhitespaceControl.prototype.MustacheStatement = function (mustache) {
    return mustache.strip;
  };

  WhitespaceControl.prototype.PartialStatement = WhitespaceControl.prototype.CommentStatement = function (node) {
    /* istanbul ignore next */
    var strip = node.strip || {};
    return {
      inlineStandalone: true,
      open: strip.open,
      close: strip.close
    };
  };

  function isPrevWhitespace(body, i, isRoot) {
    if (i === undefined) {
      i = body.length;
    }

    // Nodes that end with newlines are considered whitespace (but are special
    // cased for strip operations)
    var prev = body[i - 1],
        sibling = body[i - 2];
    if (!prev) {
      return isRoot;
    }

    if (prev.type === 'ContentStatement') {
      return (sibling || !isRoot ? /\r?\n\s*?$/ : /(^|\r?\n)\s*?$/).test(prev.original);
    }
  }
  function isNextWhitespace(body, i, isRoot) {
    if (i === undefined) {
      i = -1;
    }

    var next = body[i + 1],
        sibling = body[i + 2];
    if (!next) {
      return isRoot;
    }

    if (next.type === 'ContentStatement') {
      return (sibling || !isRoot ? /^\s*?\r?\n/ : /^\s*?(\r?\n|$)/).test(next.original);
    }
  }

  // Marks the node to the right of the position as omitted.
  // I.e. {{foo}}' ' will mark the ' ' node as omitted.
  //
  // If i is undefined, then the first child will be marked as such.
  //
  // If mulitple is truthy then all whitespace will be stripped out until non-whitespace
  // content is met.
  function omitRight(body, i, multiple) {
    var current = body[i == null ? 0 : i + 1];
    if (!current || current.type !== 'ContentStatement' || !multiple && current.rightStripped) {
      return;
    }

    var original = current.value;
    current.value = current.value.replace(multiple ? /^\s+/ : /^[ \t]*\r?\n?/, '');
    current.rightStripped = current.value !== original;
  }

  // Marks the node to the left of the position as omitted.
  // I.e. ' '{{foo}} will mark the ' ' node as omitted.
  //
  // If i is undefined then the last child will be marked as such.
  //
  // If mulitple is truthy then all whitespace will be stripped out until non-whitespace
  // content is met.
  function omitLeft(body, i, multiple) {
    var current = body[i == null ? body.length - 1 : i - 1];
    if (!current || current.type !== 'ContentStatement' || !multiple && current.leftStripped) {
      return;
    }

    // We omit the last node if it's whitespace only and not preceeded by a non-content node.
    var original = current.value;
    current.value = current.value.replace(multiple ? /\s+$/ : /[ \t]+$/, '');
    current.leftStripped = current.value !== original;
    return current.leftStripped;
  }

  function validateClose(open, close) {
    var errorNode;

    close = close.path ? close.path.original : close;

    if (open.path.original !== close) {
      errorNode = { loc: open.path.loc };


      throw new Exception(open.path.original + " doesn't match " + close, errorNode);
    }
  }

  var Helpers = Object.freeze({
    SourceLocation: function (source, locInfo) {
      this.source = source;
      this.start = {
        line: locInfo.first_line,
        column: locInfo.first_column
      };
      this.end = {
        line: locInfo.last_line,
        column: locInfo.last_column
      };
    },
    id: function (token) {
      if (/^\[.*\]$/.test(token)) {
        return token.substr(1, token.length - 2);
      } else {
        return token;
      }
    },
    stripFlags: function (open, close) {
      return {
        open: open.charAt(2) === '~',
        close: close.charAt(close.length - 3) === '~'
      };
    },
    stripComment: function (comment) {
      return comment.replace(/^\{\{~?\!-?-?/, '').replace(/-?-?~?\}\}$/, '');
    },
    preparePath: function (data, parts, loc) {
      loc = this.locInfo(loc);

      var original = data ? '@' : '',
          dig = [],
          depth = 0,
          i,
          l,
          part,


      // If we have [] syntax then we do not treat path references as operators,
      // i.e. foo.[this] resolves to approximately context.foo['this']
      isLiteral;

      for (i = 0, l = parts.length; i < l; i++) {
        part = parts[i].part, isLiteral = parts[i].original !== part;

        original += (parts[i].separator || '') + part;

        if (!isLiteral && (part === '..' || part === '.' || part === 'this')) {
          if (dig.length > 0) {
            throw new Exception('Invalid path: ' + original, { loc: loc });
          } else if (part === '..') {
            depth++;
          }
        } else {
          dig.push(part);
        }
      }

      return {
        type: 'PathExpression',
        data: data,
        depth: depth,
        parts: dig,
        original: original,
        loc: loc
      };
    },
    prepareMustache: function (path, params, hash, open, strip, locInfo) {
      // Must use charAt to support IE pre-10
      var escapeFlag = open.charAt(3) || open.charAt(2);

      var decorator = /\*/.test(open);
      return {
        type: decorator ? 'Decorator' : 'MustacheStatement',
        path: path,
        params: params,
        hash: hash,
        escaped: escapeFlag !== '{' && escapeFlag !== '&',
        strip: strip,
        loc: this.locInfo(locInfo)
      };
    },
    prepareRawBlock: function (openRawBlock, contents, close, locInfo) {
      validateClose(openRawBlock, close);

      locInfo = this.locInfo(locInfo);
      var program = {
        type: 'Program',
        body: contents,
        strip: {},
        loc: locInfo
      };

      return {
        type: 'BlockStatement',
        path: openRawBlock.path,
        params: openRawBlock.params,
        hash: openRawBlock.hash,
        program: program,
        openStrip: {},
        inverseStrip: {},
        closeStrip: {},
        loc: locInfo
      };
    },
    prepareBlock: function (openBlock, program, inverseAndProgram, close, inverted, locInfo) {
      if (close && close.path) {
        validateClose(openBlock, close);
      }

      var decorator = /\*/.test(openBlock.open);

      program.blockParams = openBlock.blockParams;

      var inverse = void 0,
          inverseStrip = void 0;

      if (inverseAndProgram) {
        if (decorator) {
          throw new Exception('Unexpected inverse block on decorator', inverseAndProgram);
        }

        if (inverseAndProgram.chain) {
          inverseAndProgram.program.body[0].closeStrip = close.strip;
        }

        inverseStrip = inverseAndProgram.strip;
        inverse = inverseAndProgram.program;
      }

      if (inverted) {
        inverted = inverse;
        inverse = program;
        program = inverted;
      }

      return {
        type: decorator ? 'DecoratorBlock' : 'BlockStatement',
        path: openBlock.path,
        params: openBlock.params,
        hash: openBlock.hash,
        program: program,
        inverse: inverse,
        openStrip: openBlock.strip,
        inverseStrip: inverseStrip,
        closeStrip: close && close.strip,
        loc: this.locInfo(locInfo)
      };
    },
    prepareProgram: function (statements, loc) {
      var firstLoc, lastLoc;

      if (!loc && statements.length) {
        firstLoc = statements[0].loc, lastLoc = statements[statements.length - 1].loc;

        /* istanbul ignore else */

        if (firstLoc && lastLoc) {
          loc = {
            source: firstLoc.source,
            start: {
              line: firstLoc.start.line,
              column: firstLoc.start.column
            },
            end: {
              line: lastLoc.end.line,
              column: lastLoc.end.column
            }
          };
        }
      }

      return {
        type: 'Program',
        body: statements,
        strip: {},
        loc: loc
      };
    },
    preparePartialBlock: function (open, program, close, locInfo) {
      validateClose(open, close);

      return {
        type: 'PartialBlockStatement',
        name: open.path,
        params: open.params,
        hash: open.hash,
        program: program,
        openStrip: open.strip,
        closeStrip: close && close.strip,
        loc: this.locInfo(locInfo)
      };
    }
  });

  var toString = Object.prototype.toString;

  // Sourced from lodash
  // https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
  /* eslint-disable func-style */
  var isFunction = function (value) {
    return typeof value === 'function';
  };
  // fallback for older versions of Chrome and Safari
  /* istanbul ignore next */
  if (isFunction(/x/)) {
    isFunction = function (value) {
      return typeof value === 'function' && toString.call(value) === '[object Function]';
    };
  }
  /* eslint-enable func-style */

  /* istanbul ignore next */

  // Older IE versions do not directly support indexOf so we must implement our own, sadly.

  var yy = {};
  (function (obj /* , ...source */) {
    var i;

    for (i = 1; i < arguments.length; i++) {
      for (var key in arguments[i]) {
        if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
          obj[key] = arguments[i][key];
        }
      }
    }

    return obj;
  })(yy, Helpers);

  exports.parser = handlebars;
  exports.parse = function (input, options) {
    // Just return if an already-compiled AST was passed in.
    if (input.type === 'Program') {
      return input;
    }

    handlebars.yy = yy;

    // Altering the shared object here, but this is ok as parser is a sync operation
    yy.locInfo = function (locInfo) {
      return new yy.SourceLocation(options && options.srcName, locInfo);
    };

    var strip = new WhitespaceControl(options);
    return strip.accept(handlebars.parse(input));
  };
});
/*global enifed */
enifed('node-module', ['exports'], function(_exports) {
  var IS_NODE = typeof module === 'object' && typeof module.require === 'function';
  if (IS_NODE) {
    _exports.require = module.require;
    _exports.module = module;
    _exports.IS_NODE = IS_NODE;
  } else {
    _exports.require = null;
    _exports.module = null;
    _exports.IS_NODE = IS_NODE;
  }
});
enifed("simple-html-tokenizer", ["exports"], function (exports) {
    "use strict";

    var namedCharRefs = {
        Aacute: "Á", aacute: "á", Abreve: "Ă", abreve: "ă", ac: "∾", acd: "∿", acE: "∾̳", Acirc: "Â", acirc: "â", acute: "´", Acy: "А", acy: "а", AElig: "Æ", aelig: "æ", af: "\u2061", Afr: "𝔄", afr: "𝔞", Agrave: "À", agrave: "à", alefsym: "ℵ", aleph: "ℵ", Alpha: "Α", alpha: "α", Amacr: "Ā", amacr: "ā", amalg: "⨿", AMP: "&", amp: "&", And: "⩓", and: "∧", andand: "⩕", andd: "⩜", andslope: "⩘", andv: "⩚", ang: "∠", ange: "⦤", angle: "∠", angmsd: "∡", angmsdaa: "⦨", angmsdab: "⦩", angmsdac: "⦪", angmsdad: "⦫", angmsdae: "⦬", angmsdaf: "⦭", angmsdag: "⦮", angmsdah: "⦯", angrt: "∟", angrtvb: "⊾", angrtvbd: "⦝", angsph: "∢", angst: "Å", angzarr: "⍼", Aogon: "Ą", aogon: "ą", Aopf: "𝔸", aopf: "𝕒", ap: "≈", apacir: "⩯", apE: "⩰", ape: "≊", apid: "≋", apos: "'", ApplyFunction: "\u2061", approx: "≈", approxeq: "≊", Aring: "Å", aring: "å", Ascr: "𝒜", ascr: "𝒶", Assign: "≔", ast: "*", asymp: "≈", asympeq: "≍", Atilde: "Ã", atilde: "ã", Auml: "Ä", auml: "ä", awconint: "∳", awint: "⨑", backcong: "≌", backepsilon: "϶", backprime: "‵", backsim: "∽", backsimeq: "⋍", Backslash: "∖", Barv: "⫧", barvee: "⊽", Barwed: "⌆", barwed: "⌅", barwedge: "⌅", bbrk: "⎵", bbrktbrk: "⎶", bcong: "≌", Bcy: "Б", bcy: "б", bdquo: "„", becaus: "∵", Because: "∵", because: "∵", bemptyv: "⦰", bepsi: "϶", bernou: "ℬ", Bernoullis: "ℬ", Beta: "Β", beta: "β", beth: "ℶ", between: "≬", Bfr: "𝔅", bfr: "𝔟", bigcap: "⋂", bigcirc: "◯", bigcup: "⋃", bigodot: "⨀", bigoplus: "⨁", bigotimes: "⨂", bigsqcup: "⨆", bigstar: "★", bigtriangledown: "▽", bigtriangleup: "△", biguplus: "⨄", bigvee: "⋁", bigwedge: "⋀", bkarow: "⤍", blacklozenge: "⧫", blacksquare: "▪", blacktriangle: "▴", blacktriangledown: "▾", blacktriangleleft: "◂", blacktriangleright: "▸", blank: "␣", blk12: "▒", blk14: "░", blk34: "▓", block: "█", bne: "=⃥", bnequiv: "≡⃥", bNot: "⫭", bnot: "⌐", Bopf: "𝔹", bopf: "𝕓", bot: "⊥", bottom: "⊥", bowtie: "⋈", boxbox: "⧉", boxDL: "╗", boxDl: "╖", boxdL: "╕", boxdl: "┐", boxDR: "╔", boxDr: "╓", boxdR: "╒", boxdr: "┌", boxH: "═", boxh: "─", boxHD: "╦", boxHd: "╤", boxhD: "╥", boxhd: "┬", boxHU: "╩", boxHu: "╧", boxhU: "╨", boxhu: "┴", boxminus: "⊟", boxplus: "⊞", boxtimes: "⊠", boxUL: "╝", boxUl: "╜", boxuL: "╛", boxul: "┘", boxUR: "╚", boxUr: "╙", boxuR: "╘", boxur: "└", boxV: "║", boxv: "│", boxVH: "╬", boxVh: "╫", boxvH: "╪", boxvh: "┼", boxVL: "╣", boxVl: "╢", boxvL: "╡", boxvl: "┤", boxVR: "╠", boxVr: "╟", boxvR: "╞", boxvr: "├", bprime: "‵", Breve: "˘", breve: "˘", brvbar: "¦", Bscr: "ℬ", bscr: "𝒷", bsemi: "⁏", bsim: "∽", bsime: "⋍", bsol: "\\", bsolb: "⧅", bsolhsub: "⟈", bull: "•", bullet: "•", bump: "≎", bumpE: "⪮", bumpe: "≏", Bumpeq: "≎", bumpeq: "≏", Cacute: "Ć", cacute: "ć", Cap: "⋒", cap: "∩", capand: "⩄", capbrcup: "⩉", capcap: "⩋", capcup: "⩇", capdot: "⩀", CapitalDifferentialD: "ⅅ", caps: "∩︀", caret: "⁁", caron: "ˇ", Cayleys: "ℭ", ccaps: "⩍", Ccaron: "Č", ccaron: "č", Ccedil: "Ç", ccedil: "ç", Ccirc: "Ĉ", ccirc: "ĉ", Cconint: "∰", ccups: "⩌", ccupssm: "⩐", Cdot: "Ċ", cdot: "ċ", cedil: "¸", Cedilla: "¸", cemptyv: "⦲", cent: "¢", CenterDot: "·", centerdot: "·", Cfr: "ℭ", cfr: "𝔠", CHcy: "Ч", chcy: "ч", check: "✓", checkmark: "✓", Chi: "Χ", chi: "χ", cir: "○", circ: "ˆ", circeq: "≗", circlearrowleft: "↺", circlearrowright: "↻", circledast: "⊛", circledcirc: "⊚", circleddash: "⊝", CircleDot: "⊙", circledR: "®", circledS: "Ⓢ", CircleMinus: "⊖", CirclePlus: "⊕", CircleTimes: "⊗", cirE: "⧃", cire: "≗", cirfnint: "⨐", cirmid: "⫯", cirscir: "⧂", ClockwiseContourIntegral: "∲", CloseCurlyDoubleQuote: "”", CloseCurlyQuote: "’", clubs: "♣", clubsuit: "♣", Colon: "∷", colon: ":", Colone: "⩴", colone: "≔", coloneq: "≔", comma: ",", commat: "@", comp: "∁", compfn: "∘", complement: "∁", complexes: "ℂ", cong: "≅", congdot: "⩭", Congruent: "≡", Conint: "∯", conint: "∮", ContourIntegral: "∮", Copf: "ℂ", copf: "𝕔", coprod: "∐", Coproduct: "∐", COPY: "©", copy: "©", copysr: "℗", CounterClockwiseContourIntegral: "∳", crarr: "↵", Cross: "⨯", cross: "✗", Cscr: "𝒞", cscr: "𝒸", csub: "⫏", csube: "⫑", csup: "⫐", csupe: "⫒", ctdot: "⋯", cudarrl: "⤸", cudarrr: "⤵", cuepr: "⋞", cuesc: "⋟", cularr: "↶", cularrp: "⤽", Cup: "⋓", cup: "∪", cupbrcap: "⩈", CupCap: "≍", cupcap: "⩆", cupcup: "⩊", cupdot: "⊍", cupor: "⩅", cups: "∪︀", curarr: "↷", curarrm: "⤼", curlyeqprec: "⋞", curlyeqsucc: "⋟", curlyvee: "⋎", curlywedge: "⋏", curren: "¤", curvearrowleft: "↶", curvearrowright: "↷", cuvee: "⋎", cuwed: "⋏", cwconint: "∲", cwint: "∱", cylcty: "⌭", Dagger: "‡", dagger: "†", daleth: "ℸ", Darr: "↡", dArr: "⇓", darr: "↓", dash: "‐", Dashv: "⫤", dashv: "⊣", dbkarow: "⤏", dblac: "˝", Dcaron: "Ď", dcaron: "ď", Dcy: "Д", dcy: "д", DD: "ⅅ", dd: "ⅆ", ddagger: "‡", ddarr: "⇊", DDotrahd: "⤑", ddotseq: "⩷", deg: "°", Del: "∇", Delta: "Δ", delta: "δ", demptyv: "⦱", dfisht: "⥿", Dfr: "𝔇", dfr: "𝔡", dHar: "⥥", dharl: "⇃", dharr: "⇂", DiacriticalAcute: "´", DiacriticalDot: "˙", DiacriticalDoubleAcute: "˝", DiacriticalGrave: "`", DiacriticalTilde: "˜", diam: "⋄", Diamond: "⋄", diamond: "⋄", diamondsuit: "♦", diams: "♦", die: "¨", DifferentialD: "ⅆ", digamma: "ϝ", disin: "⋲", div: "÷", divide: "÷", divideontimes: "⋇", divonx: "⋇", DJcy: "Ђ", djcy: "ђ", dlcorn: "⌞", dlcrop: "⌍", dollar: "$", Dopf: "𝔻", dopf: "𝕕", Dot: "¨", dot: "˙", DotDot: "⃜", doteq: "≐", doteqdot: "≑", DotEqual: "≐", dotminus: "∸", dotplus: "∔", dotsquare: "⊡", doublebarwedge: "⌆", DoubleContourIntegral: "∯", DoubleDot: "¨", DoubleDownArrow: "⇓", DoubleLeftArrow: "⇐", DoubleLeftRightArrow: "⇔", DoubleLeftTee: "⫤", DoubleLongLeftArrow: "⟸", DoubleLongLeftRightArrow: "⟺", DoubleLongRightArrow: "⟹", DoubleRightArrow: "⇒", DoubleRightTee: "⊨", DoubleUpArrow: "⇑", DoubleUpDownArrow: "⇕", DoubleVerticalBar: "∥", DownArrow: "↓", Downarrow: "⇓", downarrow: "↓", DownArrowBar: "⤓", DownArrowUpArrow: "⇵", DownBreve: "̑", downdownarrows: "⇊", downharpoonleft: "⇃", downharpoonright: "⇂", DownLeftRightVector: "⥐", DownLeftTeeVector: "⥞", DownLeftVector: "↽", DownLeftVectorBar: "⥖", DownRightTeeVector: "⥟", DownRightVector: "⇁", DownRightVectorBar: "⥗", DownTee: "⊤", DownTeeArrow: "↧", drbkarow: "⤐", drcorn: "⌟", drcrop: "⌌", Dscr: "𝒟", dscr: "𝒹", DScy: "Ѕ", dscy: "ѕ", dsol: "⧶", Dstrok: "Đ", dstrok: "đ", dtdot: "⋱", dtri: "▿", dtrif: "▾", duarr: "⇵", duhar: "⥯", dwangle: "⦦", DZcy: "Џ", dzcy: "џ", dzigrarr: "⟿", Eacute: "É", eacute: "é", easter: "⩮", Ecaron: "Ě", ecaron: "ě", ecir: "≖", Ecirc: "Ê", ecirc: "ê", ecolon: "≕", Ecy: "Э", ecy: "э", eDDot: "⩷", Edot: "Ė", eDot: "≑", edot: "ė", ee: "ⅇ", efDot: "≒", Efr: "𝔈", efr: "𝔢", eg: "⪚", Egrave: "È", egrave: "è", egs: "⪖", egsdot: "⪘", el: "⪙", Element: "∈", elinters: "⏧", ell: "ℓ", els: "⪕", elsdot: "⪗", Emacr: "Ē", emacr: "ē", empty: "∅", emptyset: "∅", EmptySmallSquare: "◻", emptyv: "∅", EmptyVerySmallSquare: "▫", emsp: " ", emsp13: " ", emsp14: " ", ENG: "Ŋ", eng: "ŋ", ensp: " ", Eogon: "Ę", eogon: "ę", Eopf: "𝔼", eopf: "𝕖", epar: "⋕", eparsl: "⧣", eplus: "⩱", epsi: "ε", Epsilon: "Ε", epsilon: "ε", epsiv: "ϵ", eqcirc: "≖", eqcolon: "≕", eqsim: "≂", eqslantgtr: "⪖", eqslantless: "⪕", Equal: "⩵", equals: "=", EqualTilde: "≂", equest: "≟", Equilibrium: "⇌", equiv: "≡", equivDD: "⩸", eqvparsl: "⧥", erarr: "⥱", erDot: "≓", Escr: "ℰ", escr: "ℯ", esdot: "≐", Esim: "⩳", esim: "≂", Eta: "Η", eta: "η", ETH: "Ð", eth: "ð", Euml: "Ë", euml: "ë", euro: "€", excl: "!", exist: "∃", Exists: "∃", expectation: "ℰ", ExponentialE: "ⅇ", exponentiale: "ⅇ", fallingdotseq: "≒", Fcy: "Ф", fcy: "ф", female: "♀", ffilig: "ﬃ", fflig: "ﬀ", ffllig: "ﬄ", Ffr: "𝔉", ffr: "𝔣", filig: "ﬁ", FilledSmallSquare: "◼", FilledVerySmallSquare: "▪", fjlig: "fj", flat: "♭", fllig: "ﬂ", fltns: "▱", fnof: "ƒ", Fopf: "𝔽", fopf: "𝕗", ForAll: "∀", forall: "∀", fork: "⋔", forkv: "⫙", Fouriertrf: "ℱ", fpartint: "⨍", frac12: "½", frac13: "⅓", frac14: "¼", frac15: "⅕", frac16: "⅙", frac18: "⅛", frac23: "⅔", frac25: "⅖", frac34: "¾", frac35: "⅗", frac38: "⅜", frac45: "⅘", frac56: "⅚", frac58: "⅝", frac78: "⅞", frasl: "⁄", frown: "⌢", Fscr: "ℱ", fscr: "𝒻", gacute: "ǵ", Gamma: "Γ", gamma: "γ", Gammad: "Ϝ", gammad: "ϝ", gap: "⪆", Gbreve: "Ğ", gbreve: "ğ", Gcedil: "Ģ", Gcirc: "Ĝ", gcirc: "ĝ", Gcy: "Г", gcy: "г", Gdot: "Ġ", gdot: "ġ", gE: "≧", ge: "≥", gEl: "⪌", gel: "⋛", geq: "≥", geqq: "≧", geqslant: "⩾", ges: "⩾", gescc: "⪩", gesdot: "⪀", gesdoto: "⪂", gesdotol: "⪄", gesl: "⋛︀", gesles: "⪔", Gfr: "𝔊", gfr: "𝔤", Gg: "⋙", gg: "≫", ggg: "⋙", gimel: "ℷ", GJcy: "Ѓ", gjcy: "ѓ", gl: "≷", gla: "⪥", glE: "⪒", glj: "⪤", gnap: "⪊", gnapprox: "⪊", gnE: "≩", gne: "⪈", gneq: "⪈", gneqq: "≩", gnsim: "⋧", Gopf: "𝔾", gopf: "𝕘", grave: "`", GreaterEqual: "≥", GreaterEqualLess: "⋛", GreaterFullEqual: "≧", GreaterGreater: "⪢", GreaterLess: "≷", GreaterSlantEqual: "⩾", GreaterTilde: "≳", Gscr: "𝒢", gscr: "ℊ", gsim: "≳", gsime: "⪎", gsiml: "⪐", GT: ">", Gt: "≫", gt: ">", gtcc: "⪧", gtcir: "⩺", gtdot: "⋗", gtlPar: "⦕", gtquest: "⩼", gtrapprox: "⪆", gtrarr: "⥸", gtrdot: "⋗", gtreqless: "⋛", gtreqqless: "⪌", gtrless: "≷", gtrsim: "≳", gvertneqq: "≩︀", gvnE: "≩︀", Hacek: "ˇ", hairsp: " ", half: "½", hamilt: "ℋ", HARDcy: "Ъ", hardcy: "ъ", hArr: "⇔", harr: "↔", harrcir: "⥈", harrw: "↭", Hat: "^", hbar: "ℏ", Hcirc: "Ĥ", hcirc: "ĥ", hearts: "♥", heartsuit: "♥", hellip: "…", hercon: "⊹", Hfr: "ℌ", hfr: "𝔥", HilbertSpace: "ℋ", hksearow: "⤥", hkswarow: "⤦", hoarr: "⇿", homtht: "∻", hookleftarrow: "↩", hookrightarrow: "↪", Hopf: "ℍ", hopf: "𝕙", horbar: "―", HorizontalLine: "─", Hscr: "ℋ", hscr: "𝒽", hslash: "ℏ", Hstrok: "Ħ", hstrok: "ħ", HumpDownHump: "≎", HumpEqual: "≏", hybull: "⁃", hyphen: "‐", Iacute: "Í", iacute: "í", ic: "\u2063", Icirc: "Î", icirc: "î", Icy: "И", icy: "и", Idot: "İ", IEcy: "Е", iecy: "е", iexcl: "¡", iff: "⇔", Ifr: "ℑ", ifr: "𝔦", Igrave: "Ì", igrave: "ì", ii: "ⅈ", iiiint: "⨌", iiint: "∭", iinfin: "⧜", iiota: "℩", IJlig: "Ĳ", ijlig: "ĳ", Im: "ℑ", Imacr: "Ī", imacr: "ī", image: "ℑ", ImaginaryI: "ⅈ", imagline: "ℐ", imagpart: "ℑ", imath: "ı", imof: "⊷", imped: "Ƶ", Implies: "⇒", in: "∈", incare: "℅", infin: "∞", infintie: "⧝", inodot: "ı", Int: "∬", int: "∫", intcal: "⊺", integers: "ℤ", Integral: "∫", intercal: "⊺", Intersection: "⋂", intlarhk: "⨗", intprod: "⨼", InvisibleComma: "\u2063", InvisibleTimes: "\u2062", IOcy: "Ё", iocy: "ё", Iogon: "Į", iogon: "į", Iopf: "𝕀", iopf: "𝕚", Iota: "Ι", iota: "ι", iprod: "⨼", iquest: "¿", Iscr: "ℐ", iscr: "𝒾", isin: "∈", isindot: "⋵", isinE: "⋹", isins: "⋴", isinsv: "⋳", isinv: "∈", it: "\u2062", Itilde: "Ĩ", itilde: "ĩ", Iukcy: "І", iukcy: "і", Iuml: "Ï", iuml: "ï", Jcirc: "Ĵ", jcirc: "ĵ", Jcy: "Й", jcy: "й", Jfr: "𝔍", jfr: "𝔧", jmath: "ȷ", Jopf: "𝕁", jopf: "𝕛", Jscr: "𝒥", jscr: "𝒿", Jsercy: "Ј", jsercy: "ј", Jukcy: "Є", jukcy: "є", Kappa: "Κ", kappa: "κ", kappav: "ϰ", Kcedil: "Ķ", kcedil: "ķ", Kcy: "К", kcy: "к", Kfr: "𝔎", kfr: "𝔨", kgreen: "ĸ", KHcy: "Х", khcy: "х", KJcy: "Ќ", kjcy: "ќ", Kopf: "𝕂", kopf: "𝕜", Kscr: "𝒦", kscr: "𝓀", lAarr: "⇚", Lacute: "Ĺ", lacute: "ĺ", laemptyv: "⦴", lagran: "ℒ", Lambda: "Λ", lambda: "λ", Lang: "⟪", lang: "⟨", langd: "⦑", langle: "⟨", lap: "⪅", Laplacetrf: "ℒ", laquo: "«", Larr: "↞", lArr: "⇐", larr: "←", larrb: "⇤", larrbfs: "⤟", larrfs: "⤝", larrhk: "↩", larrlp: "↫", larrpl: "⤹", larrsim: "⥳", larrtl: "↢", lat: "⪫", lAtail: "⤛", latail: "⤙", late: "⪭", lates: "⪭︀", lBarr: "⤎", lbarr: "⤌", lbbrk: "❲", lbrace: "{", lbrack: "[", lbrke: "⦋", lbrksld: "⦏", lbrkslu: "⦍", Lcaron: "Ľ", lcaron: "ľ", Lcedil: "Ļ", lcedil: "ļ", lceil: "⌈", lcub: "{", Lcy: "Л", lcy: "л", ldca: "⤶", ldquo: "“", ldquor: "„", ldrdhar: "⥧", ldrushar: "⥋", ldsh: "↲", lE: "≦", le: "≤", LeftAngleBracket: "⟨", LeftArrow: "←", Leftarrow: "⇐", leftarrow: "←", LeftArrowBar: "⇤", LeftArrowRightArrow: "⇆", leftarrowtail: "↢", LeftCeiling: "⌈", LeftDoubleBracket: "⟦", LeftDownTeeVector: "⥡", LeftDownVector: "⇃", LeftDownVectorBar: "⥙", LeftFloor: "⌊", leftharpoondown: "↽", leftharpoonup: "↼", leftleftarrows: "⇇", LeftRightArrow: "↔", Leftrightarrow: "⇔", leftrightarrow: "↔", leftrightarrows: "⇆", leftrightharpoons: "⇋", leftrightsquigarrow: "↭", LeftRightVector: "⥎", LeftTee: "⊣", LeftTeeArrow: "↤", LeftTeeVector: "⥚", leftthreetimes: "⋋", LeftTriangle: "⊲", LeftTriangleBar: "⧏", LeftTriangleEqual: "⊴", LeftUpDownVector: "⥑", LeftUpTeeVector: "⥠", LeftUpVector: "↿", LeftUpVectorBar: "⥘", LeftVector: "↼", LeftVectorBar: "⥒", lEg: "⪋", leg: "⋚", leq: "≤", leqq: "≦", leqslant: "⩽", les: "⩽", lescc: "⪨", lesdot: "⩿", lesdoto: "⪁", lesdotor: "⪃", lesg: "⋚︀", lesges: "⪓", lessapprox: "⪅", lessdot: "⋖", lesseqgtr: "⋚", lesseqqgtr: "⪋", LessEqualGreater: "⋚", LessFullEqual: "≦", LessGreater: "≶", lessgtr: "≶", LessLess: "⪡", lesssim: "≲", LessSlantEqual: "⩽", LessTilde: "≲", lfisht: "⥼", lfloor: "⌊", Lfr: "𝔏", lfr: "𝔩", lg: "≶", lgE: "⪑", lHar: "⥢", lhard: "↽", lharu: "↼", lharul: "⥪", lhblk: "▄", LJcy: "Љ", ljcy: "љ", Ll: "⋘", ll: "≪", llarr: "⇇", llcorner: "⌞", Lleftarrow: "⇚", llhard: "⥫", lltri: "◺", Lmidot: "Ŀ", lmidot: "ŀ", lmoust: "⎰", lmoustache: "⎰", lnap: "⪉", lnapprox: "⪉", lnE: "≨", lne: "⪇", lneq: "⪇", lneqq: "≨", lnsim: "⋦", loang: "⟬", loarr: "⇽", lobrk: "⟦", LongLeftArrow: "⟵", Longleftarrow: "⟸", longleftarrow: "⟵", LongLeftRightArrow: "⟷", Longleftrightarrow: "⟺", longleftrightarrow: "⟷", longmapsto: "⟼", LongRightArrow: "⟶", Longrightarrow: "⟹", longrightarrow: "⟶", looparrowleft: "↫", looparrowright: "↬", lopar: "⦅", Lopf: "𝕃", lopf: "𝕝", loplus: "⨭", lotimes: "⨴", lowast: "∗", lowbar: "_", LowerLeftArrow: "↙", LowerRightArrow: "↘", loz: "◊", lozenge: "◊", lozf: "⧫", lpar: "(", lparlt: "⦓", lrarr: "⇆", lrcorner: "⌟", lrhar: "⇋", lrhard: "⥭", lrm: "\u200e", lrtri: "⊿", lsaquo: "‹", Lscr: "ℒ", lscr: "𝓁", Lsh: "↰", lsh: "↰", lsim: "≲", lsime: "⪍", lsimg: "⪏", lsqb: "[", lsquo: "‘", lsquor: "‚", Lstrok: "Ł", lstrok: "ł", LT: "<", Lt: "≪", lt: "<", ltcc: "⪦", ltcir: "⩹", ltdot: "⋖", lthree: "⋋", ltimes: "⋉", ltlarr: "⥶", ltquest: "⩻", ltri: "◃", ltrie: "⊴", ltrif: "◂", ltrPar: "⦖", lurdshar: "⥊", luruhar: "⥦", lvertneqq: "≨︀", lvnE: "≨︀", macr: "¯", male: "♂", malt: "✠", maltese: "✠", Map: "⤅", map: "↦", mapsto: "↦", mapstodown: "↧", mapstoleft: "↤", mapstoup: "↥", marker: "▮", mcomma: "⨩", Mcy: "М", mcy: "м", mdash: "—", mDDot: "∺", measuredangle: "∡", MediumSpace: " ", Mellintrf: "ℳ", Mfr: "𝔐", mfr: "𝔪", mho: "℧", micro: "µ", mid: "∣", midast: "*", midcir: "⫰", middot: "·", minus: "−", minusb: "⊟", minusd: "∸", minusdu: "⨪", MinusPlus: "∓", mlcp: "⫛", mldr: "…", mnplus: "∓", models: "⊧", Mopf: "𝕄", mopf: "𝕞", mp: "∓", Mscr: "ℳ", mscr: "𝓂", mstpos: "∾", Mu: "Μ", mu: "μ", multimap: "⊸", mumap: "⊸", nabla: "∇", Nacute: "Ń", nacute: "ń", nang: "∠⃒", nap: "≉", napE: "⩰̸", napid: "≋̸", napos: "ŉ", napprox: "≉", natur: "♮", natural: "♮", naturals: "ℕ", nbsp: " ", nbump: "≎̸", nbumpe: "≏̸", ncap: "⩃", Ncaron: "Ň", ncaron: "ň", Ncedil: "Ņ", ncedil: "ņ", ncong: "≇", ncongdot: "⩭̸", ncup: "⩂", Ncy: "Н", ncy: "н", ndash: "–", ne: "≠", nearhk: "⤤", neArr: "⇗", nearr: "↗", nearrow: "↗", nedot: "≐̸", NegativeMediumSpace: "​", NegativeThickSpace: "​", NegativeThinSpace: "​", NegativeVeryThinSpace: "​", nequiv: "≢", nesear: "⤨", nesim: "≂̸", NestedGreaterGreater: "≫", NestedLessLess: "≪", NewLine: "\u000a", nexist: "∄", nexists: "∄", Nfr: "𝔑", nfr: "𝔫", ngE: "≧̸", nge: "≱", ngeq: "≱", ngeqq: "≧̸", ngeqslant: "⩾̸", nges: "⩾̸", nGg: "⋙̸", ngsim: "≵", nGt: "≫⃒", ngt: "≯", ngtr: "≯", nGtv: "≫̸", nhArr: "⇎", nharr: "↮", nhpar: "⫲", ni: "∋", nis: "⋼", nisd: "⋺", niv: "∋", NJcy: "Њ", njcy: "њ", nlArr: "⇍", nlarr: "↚", nldr: "‥", nlE: "≦̸", nle: "≰", nLeftarrow: "⇍", nleftarrow: "↚", nLeftrightarrow: "⇎", nleftrightarrow: "↮", nleq: "≰", nleqq: "≦̸", nleqslant: "⩽̸", nles: "⩽̸", nless: "≮", nLl: "⋘̸", nlsim: "≴", nLt: "≪⃒", nlt: "≮", nltri: "⋪", nltrie: "⋬", nLtv: "≪̸", nmid: "∤", NoBreak: "\u2060", NonBreakingSpace: " ", Nopf: "ℕ", nopf: "𝕟", Not: "⫬", not: "¬", NotCongruent: "≢", NotCupCap: "≭", NotDoubleVerticalBar: "∦", NotElement: "∉", NotEqual: "≠", NotEqualTilde: "≂̸", NotExists: "∄", NotGreater: "≯", NotGreaterEqual: "≱", NotGreaterFullEqual: "≧̸", NotGreaterGreater: "≫̸", NotGreaterLess: "≹", NotGreaterSlantEqual: "⩾̸", NotGreaterTilde: "≵", NotHumpDownHump: "≎̸", NotHumpEqual: "≏̸", notin: "∉", notindot: "⋵̸", notinE: "⋹̸", notinva: "∉", notinvb: "⋷", notinvc: "⋶", NotLeftTriangle: "⋪", NotLeftTriangleBar: "⧏̸", NotLeftTriangleEqual: "⋬", NotLess: "≮", NotLessEqual: "≰", NotLessGreater: "≸", NotLessLess: "≪̸", NotLessSlantEqual: "⩽̸", NotLessTilde: "≴", NotNestedGreaterGreater: "⪢̸", NotNestedLessLess: "⪡̸", notni: "∌", notniva: "∌", notnivb: "⋾", notnivc: "⋽", NotPrecedes: "⊀", NotPrecedesEqual: "⪯̸", NotPrecedesSlantEqual: "⋠", NotReverseElement: "∌", NotRightTriangle: "⋫", NotRightTriangleBar: "⧐̸", NotRightTriangleEqual: "⋭", NotSquareSubset: "⊏̸", NotSquareSubsetEqual: "⋢", NotSquareSuperset: "⊐̸", NotSquareSupersetEqual: "⋣", NotSubset: "⊂⃒", NotSubsetEqual: "⊈", NotSucceeds: "⊁", NotSucceedsEqual: "⪰̸", NotSucceedsSlantEqual: "⋡", NotSucceedsTilde: "≿̸", NotSuperset: "⊃⃒", NotSupersetEqual: "⊉", NotTilde: "≁", NotTildeEqual: "≄", NotTildeFullEqual: "≇", NotTildeTilde: "≉", NotVerticalBar: "∤", npar: "∦", nparallel: "∦", nparsl: "⫽⃥", npart: "∂̸", npolint: "⨔", npr: "⊀", nprcue: "⋠", npre: "⪯̸", nprec: "⊀", npreceq: "⪯̸", nrArr: "⇏", nrarr: "↛", nrarrc: "⤳̸", nrarrw: "↝̸", nRightarrow: "⇏", nrightarrow: "↛", nrtri: "⋫", nrtrie: "⋭", nsc: "⊁", nsccue: "⋡", nsce: "⪰̸", Nscr: "𝒩", nscr: "𝓃", nshortmid: "∤", nshortparallel: "∦", nsim: "≁", nsime: "≄", nsimeq: "≄", nsmid: "∤", nspar: "∦", nsqsube: "⋢", nsqsupe: "⋣", nsub: "⊄", nsubE: "⫅̸", nsube: "⊈", nsubset: "⊂⃒", nsubseteq: "⊈", nsubseteqq: "⫅̸", nsucc: "⊁", nsucceq: "⪰̸", nsup: "⊅", nsupE: "⫆̸", nsupe: "⊉", nsupset: "⊃⃒", nsupseteq: "⊉", nsupseteqq: "⫆̸", ntgl: "≹", Ntilde: "Ñ", ntilde: "ñ", ntlg: "≸", ntriangleleft: "⋪", ntrianglelefteq: "⋬", ntriangleright: "⋫", ntrianglerighteq: "⋭", Nu: "Ν", nu: "ν", num: "#", numero: "№", numsp: " ", nvap: "≍⃒", nVDash: "⊯", nVdash: "⊮", nvDash: "⊭", nvdash: "⊬", nvge: "≥⃒", nvgt: ">⃒", nvHarr: "⤄", nvinfin: "⧞", nvlArr: "⤂", nvle: "≤⃒", nvlt: "<⃒", nvltrie: "⊴⃒", nvrArr: "⤃", nvrtrie: "⊵⃒", nvsim: "∼⃒", nwarhk: "⤣", nwArr: "⇖", nwarr: "↖", nwarrow: "↖", nwnear: "⤧", Oacute: "Ó", oacute: "ó", oast: "⊛", ocir: "⊚", Ocirc: "Ô", ocirc: "ô", Ocy: "О", ocy: "о", odash: "⊝", Odblac: "Ő", odblac: "ő", odiv: "⨸", odot: "⊙", odsold: "⦼", OElig: "Œ", oelig: "œ", ofcir: "⦿", Ofr: "𝔒", ofr: "𝔬", ogon: "˛", Ograve: "Ò", ograve: "ò", ogt: "⧁", ohbar: "⦵", ohm: "Ω", oint: "∮", olarr: "↺", olcir: "⦾", olcross: "⦻", oline: "‾", olt: "⧀", Omacr: "Ō", omacr: "ō", Omega: "Ω", omega: "ω", Omicron: "Ο", omicron: "ο", omid: "⦶", ominus: "⊖", Oopf: "𝕆", oopf: "𝕠", opar: "⦷", OpenCurlyDoubleQuote: "“", OpenCurlyQuote: "‘", operp: "⦹", oplus: "⊕", Or: "⩔", or: "∨", orarr: "↻", ord: "⩝", order: "ℴ", orderof: "ℴ", ordf: "ª", ordm: "º", origof: "⊶", oror: "⩖", orslope: "⩗", orv: "⩛", oS: "Ⓢ", Oscr: "𝒪", oscr: "ℴ", Oslash: "Ø", oslash: "ø", osol: "⊘", Otilde: "Õ", otilde: "õ", Otimes: "⨷", otimes: "⊗", otimesas: "⨶", Ouml: "Ö", ouml: "ö", ovbar: "⌽", OverBar: "‾", OverBrace: "⏞", OverBracket: "⎴", OverParenthesis: "⏜", par: "∥", para: "¶", parallel: "∥", parsim: "⫳", parsl: "⫽", part: "∂", PartialD: "∂", Pcy: "П", pcy: "п", percnt: "%", period: ".", permil: "‰", perp: "⊥", pertenk: "‱", Pfr: "𝔓", pfr: "𝔭", Phi: "Φ", phi: "φ", phiv: "ϕ", phmmat: "ℳ", phone: "☎", Pi: "Π", pi: "π", pitchfork: "⋔", piv: "ϖ", planck: "ℏ", planckh: "ℎ", plankv: "ℏ", plus: "+", plusacir: "⨣", plusb: "⊞", pluscir: "⨢", plusdo: "∔", plusdu: "⨥", pluse: "⩲", PlusMinus: "±", plusmn: "±", plussim: "⨦", plustwo: "⨧", pm: "±", Poincareplane: "ℌ", pointint: "⨕", Popf: "ℙ", popf: "𝕡", pound: "£", Pr: "⪻", pr: "≺", prap: "⪷", prcue: "≼", prE: "⪳", pre: "⪯", prec: "≺", precapprox: "⪷", preccurlyeq: "≼", Precedes: "≺", PrecedesEqual: "⪯", PrecedesSlantEqual: "≼", PrecedesTilde: "≾", preceq: "⪯", precnapprox: "⪹", precneqq: "⪵", precnsim: "⋨", precsim: "≾", Prime: "″", prime: "′", primes: "ℙ", prnap: "⪹", prnE: "⪵", prnsim: "⋨", prod: "∏", Product: "∏", profalar: "⌮", profline: "⌒", profsurf: "⌓", prop: "∝", Proportion: "∷", Proportional: "∝", propto: "∝", prsim: "≾", prurel: "⊰", Pscr: "𝒫", pscr: "𝓅", Psi: "Ψ", psi: "ψ", puncsp: " ", Qfr: "𝔔", qfr: "𝔮", qint: "⨌", Qopf: "ℚ", qopf: "𝕢", qprime: "⁗", Qscr: "𝒬", qscr: "𝓆", quaternions: "ℍ", quatint: "⨖", quest: "?", questeq: "≟", QUOT: "\"", quot: "\"", rAarr: "⇛", race: "∽̱", Racute: "Ŕ", racute: "ŕ", radic: "√", raemptyv: "⦳", Rang: "⟫", rang: "⟩", rangd: "⦒", range: "⦥", rangle: "⟩", raquo: "»", Rarr: "↠", rArr: "⇒", rarr: "→", rarrap: "⥵", rarrb: "⇥", rarrbfs: "⤠", rarrc: "⤳", rarrfs: "⤞", rarrhk: "↪", rarrlp: "↬", rarrpl: "⥅", rarrsim: "⥴", Rarrtl: "⤖", rarrtl: "↣", rarrw: "↝", rAtail: "⤜", ratail: "⤚", ratio: "∶", rationals: "ℚ", RBarr: "⤐", rBarr: "⤏", rbarr: "⤍", rbbrk: "❳", rbrace: "}", rbrack: "]", rbrke: "⦌", rbrksld: "⦎", rbrkslu: "⦐", Rcaron: "Ř", rcaron: "ř", Rcedil: "Ŗ", rcedil: "ŗ", rceil: "⌉", rcub: "}", Rcy: "Р", rcy: "р", rdca: "⤷", rdldhar: "⥩", rdquo: "”", rdquor: "”", rdsh: "↳", Re: "ℜ", real: "ℜ", realine: "ℛ", realpart: "ℜ", reals: "ℝ", rect: "▭", REG: "®", reg: "®", ReverseElement: "∋", ReverseEquilibrium: "⇋", ReverseUpEquilibrium: "⥯", rfisht: "⥽", rfloor: "⌋", Rfr: "ℜ", rfr: "𝔯", rHar: "⥤", rhard: "⇁", rharu: "⇀", rharul: "⥬", Rho: "Ρ", rho: "ρ", rhov: "ϱ", RightAngleBracket: "⟩", RightArrow: "→", Rightarrow: "⇒", rightarrow: "→", RightArrowBar: "⇥", RightArrowLeftArrow: "⇄", rightarrowtail: "↣", RightCeiling: "⌉", RightDoubleBracket: "⟧", RightDownTeeVector: "⥝", RightDownVector: "⇂", RightDownVectorBar: "⥕", RightFloor: "⌋", rightharpoondown: "⇁", rightharpoonup: "⇀", rightleftarrows: "⇄", rightleftharpoons: "⇌", rightrightarrows: "⇉", rightsquigarrow: "↝", RightTee: "⊢", RightTeeArrow: "↦", RightTeeVector: "⥛", rightthreetimes: "⋌", RightTriangle: "⊳", RightTriangleBar: "⧐", RightTriangleEqual: "⊵", RightUpDownVector: "⥏", RightUpTeeVector: "⥜", RightUpVector: "↾", RightUpVectorBar: "⥔", RightVector: "⇀", RightVectorBar: "⥓", ring: "˚", risingdotseq: "≓", rlarr: "⇄", rlhar: "⇌", rlm: "\u200f", rmoust: "⎱", rmoustache: "⎱", rnmid: "⫮", roang: "⟭", roarr: "⇾", robrk: "⟧", ropar: "⦆", Ropf: "ℝ", ropf: "𝕣", roplus: "⨮", rotimes: "⨵", RoundImplies: "⥰", rpar: ")", rpargt: "⦔", rppolint: "⨒", rrarr: "⇉", Rrightarrow: "⇛", rsaquo: "›", Rscr: "ℛ", rscr: "𝓇", Rsh: "↱", rsh: "↱", rsqb: "]", rsquo: "’", rsquor: "’", rthree: "⋌", rtimes: "⋊", rtri: "▹", rtrie: "⊵", rtrif: "▸", rtriltri: "⧎", RuleDelayed: "⧴", ruluhar: "⥨", rx: "℞", Sacute: "Ś", sacute: "ś", sbquo: "‚", Sc: "⪼", sc: "≻", scap: "⪸", Scaron: "Š", scaron: "š", sccue: "≽", scE: "⪴", sce: "⪰", Scedil: "Ş", scedil: "ş", Scirc: "Ŝ", scirc: "ŝ", scnap: "⪺", scnE: "⪶", scnsim: "⋩", scpolint: "⨓", scsim: "≿", Scy: "С", scy: "с", sdot: "⋅", sdotb: "⊡", sdote: "⩦", searhk: "⤥", seArr: "⇘", searr: "↘", searrow: "↘", sect: "§", semi: ";", seswar: "⤩", setminus: "∖", setmn: "∖", sext: "✶", Sfr: "𝔖", sfr: "𝔰", sfrown: "⌢", sharp: "♯", SHCHcy: "Щ", shchcy: "щ", SHcy: "Ш", shcy: "ш", ShortDownArrow: "↓", ShortLeftArrow: "←", shortmid: "∣", shortparallel: "∥", ShortRightArrow: "→", ShortUpArrow: "↑", shy: "\u00ad", Sigma: "Σ", sigma: "σ", sigmaf: "ς", sigmav: "ς", sim: "∼", simdot: "⩪", sime: "≃", simeq: "≃", simg: "⪞", simgE: "⪠", siml: "⪝", simlE: "⪟", simne: "≆", simplus: "⨤", simrarr: "⥲", slarr: "←", SmallCircle: "∘", smallsetminus: "∖", smashp: "⨳", smeparsl: "⧤", smid: "∣", smile: "⌣", smt: "⪪", smte: "⪬", smtes: "⪬︀", SOFTcy: "Ь", softcy: "ь", sol: "/", solb: "⧄", solbar: "⌿", Sopf: "𝕊", sopf: "𝕤", spades: "♠", spadesuit: "♠", spar: "∥", sqcap: "⊓", sqcaps: "⊓︀", sqcup: "⊔", sqcups: "⊔︀", Sqrt: "√", sqsub: "⊏", sqsube: "⊑", sqsubset: "⊏", sqsubseteq: "⊑", sqsup: "⊐", sqsupe: "⊒", sqsupset: "⊐", sqsupseteq: "⊒", squ: "□", Square: "□", square: "□", SquareIntersection: "⊓", SquareSubset: "⊏", SquareSubsetEqual: "⊑", SquareSuperset: "⊐", SquareSupersetEqual: "⊒", SquareUnion: "⊔", squarf: "▪", squf: "▪", srarr: "→", Sscr: "𝒮", sscr: "𝓈", ssetmn: "∖", ssmile: "⌣", sstarf: "⋆", Star: "⋆", star: "☆", starf: "★", straightepsilon: "ϵ", straightphi: "ϕ", strns: "¯", Sub: "⋐", sub: "⊂", subdot: "⪽", subE: "⫅", sube: "⊆", subedot: "⫃", submult: "⫁", subnE: "⫋", subne: "⊊", subplus: "⪿", subrarr: "⥹", Subset: "⋐", subset: "⊂", subseteq: "⊆", subseteqq: "⫅", SubsetEqual: "⊆", subsetneq: "⊊", subsetneqq: "⫋", subsim: "⫇", subsub: "⫕", subsup: "⫓", succ: "≻", succapprox: "⪸", succcurlyeq: "≽", Succeeds: "≻", SucceedsEqual: "⪰", SucceedsSlantEqual: "≽", SucceedsTilde: "≿", succeq: "⪰", succnapprox: "⪺", succneqq: "⪶", succnsim: "⋩", succsim: "≿", SuchThat: "∋", Sum: "∑", sum: "∑", sung: "♪", Sup: "⋑", sup: "⊃", sup1: "¹", sup2: "²", sup3: "³", supdot: "⪾", supdsub: "⫘", supE: "⫆", supe: "⊇", supedot: "⫄", Superset: "⊃", SupersetEqual: "⊇", suphsol: "⟉", suphsub: "⫗", suplarr: "⥻", supmult: "⫂", supnE: "⫌", supne: "⊋", supplus: "⫀", Supset: "⋑", supset: "⊃", supseteq: "⊇", supseteqq: "⫆", supsetneq: "⊋", supsetneqq: "⫌", supsim: "⫈", supsub: "⫔", supsup: "⫖", swarhk: "⤦", swArr: "⇙", swarr: "↙", swarrow: "↙", swnwar: "⤪", szlig: "ß", Tab: "\u0009", target: "⌖", Tau: "Τ", tau: "τ", tbrk: "⎴", Tcaron: "Ť", tcaron: "ť", Tcedil: "Ţ", tcedil: "ţ", Tcy: "Т", tcy: "т", tdot: "⃛", telrec: "⌕", Tfr: "𝔗", tfr: "𝔱", there4: "∴", Therefore: "∴", therefore: "∴", Theta: "Θ", theta: "θ", thetasym: "ϑ", thetav: "ϑ", thickapprox: "≈", thicksim: "∼", ThickSpace: "  ", thinsp: " ", ThinSpace: " ", thkap: "≈", thksim: "∼", THORN: "Þ", thorn: "þ", Tilde: "∼", tilde: "˜", TildeEqual: "≃", TildeFullEqual: "≅", TildeTilde: "≈", times: "×", timesb: "⊠", timesbar: "⨱", timesd: "⨰", tint: "∭", toea: "⤨", top: "⊤", topbot: "⌶", topcir: "⫱", Topf: "𝕋", topf: "𝕥", topfork: "⫚", tosa: "⤩", tprime: "‴", TRADE: "™", trade: "™", triangle: "▵", triangledown: "▿", triangleleft: "◃", trianglelefteq: "⊴", triangleq: "≜", triangleright: "▹", trianglerighteq: "⊵", tridot: "◬", trie: "≜", triminus: "⨺", TripleDot: "⃛", triplus: "⨹", trisb: "⧍", tritime: "⨻", trpezium: "⏢", Tscr: "𝒯", tscr: "𝓉", TScy: "Ц", tscy: "ц", TSHcy: "Ћ", tshcy: "ћ", Tstrok: "Ŧ", tstrok: "ŧ", twixt: "≬", twoheadleftarrow: "↞", twoheadrightarrow: "↠", Uacute: "Ú", uacute: "ú", Uarr: "↟", uArr: "⇑", uarr: "↑", Uarrocir: "⥉", Ubrcy: "Ў", ubrcy: "ў", Ubreve: "Ŭ", ubreve: "ŭ", Ucirc: "Û", ucirc: "û", Ucy: "У", ucy: "у", udarr: "⇅", Udblac: "Ű", udblac: "ű", udhar: "⥮", ufisht: "⥾", Ufr: "𝔘", ufr: "𝔲", Ugrave: "Ù", ugrave: "ù", uHar: "⥣", uharl: "↿", uharr: "↾", uhblk: "▀", ulcorn: "⌜", ulcorner: "⌜", ulcrop: "⌏", ultri: "◸", Umacr: "Ū", umacr: "ū", uml: "¨", UnderBar: "_", UnderBrace: "⏟", UnderBracket: "⎵", UnderParenthesis: "⏝", Union: "⋃", UnionPlus: "⊎", Uogon: "Ų", uogon: "ų", Uopf: "𝕌", uopf: "𝕦", UpArrow: "↑", Uparrow: "⇑", uparrow: "↑", UpArrowBar: "⤒", UpArrowDownArrow: "⇅", UpDownArrow: "↕", Updownarrow: "⇕", updownarrow: "↕", UpEquilibrium: "⥮", upharpoonleft: "↿", upharpoonright: "↾", uplus: "⊎", UpperLeftArrow: "↖", UpperRightArrow: "↗", Upsi: "ϒ", upsi: "υ", upsih: "ϒ", Upsilon: "Υ", upsilon: "υ", UpTee: "⊥", UpTeeArrow: "↥", upuparrows: "⇈", urcorn: "⌝", urcorner: "⌝", urcrop: "⌎", Uring: "Ů", uring: "ů", urtri: "◹", Uscr: "𝒰", uscr: "𝓊", utdot: "⋰", Utilde: "Ũ", utilde: "ũ", utri: "▵", utrif: "▴", uuarr: "⇈", Uuml: "Ü", uuml: "ü", uwangle: "⦧", vangrt: "⦜", varepsilon: "ϵ", varkappa: "ϰ", varnothing: "∅", varphi: "ϕ", varpi: "ϖ", varpropto: "∝", vArr: "⇕", varr: "↕", varrho: "ϱ", varsigma: "ς", varsubsetneq: "⊊︀", varsubsetneqq: "⫋︀", varsupsetneq: "⊋︀", varsupsetneqq: "⫌︀", vartheta: "ϑ", vartriangleleft: "⊲", vartriangleright: "⊳", Vbar: "⫫", vBar: "⫨", vBarv: "⫩", Vcy: "В", vcy: "в", VDash: "⊫", Vdash: "⊩", vDash: "⊨", vdash: "⊢", Vdashl: "⫦", Vee: "⋁", vee: "∨", veebar: "⊻", veeeq: "≚", vellip: "⋮", Verbar: "‖", verbar: "|", Vert: "‖", vert: "|", VerticalBar: "∣", VerticalLine: "|", VerticalSeparator: "❘", VerticalTilde: "≀", VeryThinSpace: " ", Vfr: "𝔙", vfr: "𝔳", vltri: "⊲", vnsub: "⊂⃒", vnsup: "⊃⃒", Vopf: "𝕍", vopf: "𝕧", vprop: "∝", vrtri: "⊳", Vscr: "𝒱", vscr: "𝓋", vsubnE: "⫋︀", vsubne: "⊊︀", vsupnE: "⫌︀", vsupne: "⊋︀", Vvdash: "⊪", vzigzag: "⦚", Wcirc: "Ŵ", wcirc: "ŵ", wedbar: "⩟", Wedge: "⋀", wedge: "∧", wedgeq: "≙", weierp: "℘", Wfr: "𝔚", wfr: "𝔴", Wopf: "𝕎", wopf: "𝕨", wp: "℘", wr: "≀", wreath: "≀", Wscr: "𝒲", wscr: "𝓌", xcap: "⋂", xcirc: "◯", xcup: "⋃", xdtri: "▽", Xfr: "𝔛", xfr: "𝔵", xhArr: "⟺", xharr: "⟷", Xi: "Ξ", xi: "ξ", xlArr: "⟸", xlarr: "⟵", xmap: "⟼", xnis: "⋻", xodot: "⨀", Xopf: "𝕏", xopf: "𝕩", xoplus: "⨁", xotime: "⨂", xrArr: "⟹", xrarr: "⟶", Xscr: "𝒳", xscr: "𝓍", xsqcup: "⨆", xuplus: "⨄", xutri: "△", xvee: "⋁", xwedge: "⋀", Yacute: "Ý", yacute: "ý", YAcy: "Я", yacy: "я", Ycirc: "Ŷ", ycirc: "ŷ", Ycy: "Ы", ycy: "ы", yen: "¥", Yfr: "𝔜", yfr: "𝔶", YIcy: "Ї", yicy: "ї", Yopf: "𝕐", yopf: "𝕪", Yscr: "𝒴", yscr: "𝓎", YUcy: "Ю", yucy: "ю", Yuml: "Ÿ", yuml: "ÿ", Zacute: "Ź", zacute: "ź", Zcaron: "Ž", zcaron: "ž", Zcy: "З", zcy: "з", Zdot: "Ż", zdot: "ż", zeetrf: "ℨ", ZeroWidthSpace: "​", Zeta: "Ζ", zeta: "ζ", Zfr: "ℨ", zfr: "𝔷", ZHcy: "Ж", zhcy: "ж", zigrarr: "⇝", Zopf: "ℤ", zopf: "𝕫", Zscr: "𝒵", zscr: "𝓏", zwj: "\u200d", zwnj: "\u200c"
    };

    var HEXCHARCODE = /^#[xX]([A-Fa-f0-9]+)$/;
    var CHARCODE = /^#([0-9]+)$/;
    var NAMED = /^([A-Za-z0-9]+)$/;
    var EntityParser = function () {
        function EntityParser(named) {
            this.named = named;
        }
        EntityParser.prototype.parse = function (entity) {
            if (!entity) {
                return;
            }
            var matches = entity.match(HEXCHARCODE);
            if (matches) {
                return String.fromCharCode(parseInt(matches[1], 16));
            }
            matches = entity.match(CHARCODE);
            if (matches) {
                return String.fromCharCode(parseInt(matches[1], 10));
            }
            matches = entity.match(NAMED);
            if (matches) {
                return this.named[matches[1]];
            }
        };
        return EntityParser;
    }();

    var WSP = /[\t\n\f ]/;
    var ALPHA = /[A-Za-z]/;
    var CRLF = /\r\n?/g;
    function isSpace(char) {
        return WSP.test(char);
    }
    function isAlpha(char) {
        return ALPHA.test(char);
    }
    function preprocessInput(input) {
        return input.replace(CRLF, "\n");
    }

    var EventedTokenizer = function () {
        function EventedTokenizer(delegate, entityParser) {
            this.delegate = delegate;
            this.entityParser = entityParser;
            this.state = null;
            this.input = null;
            this.index = -1;
            this.tagLine = -1;
            this.tagColumn = -1;
            this.line = -1;
            this.column = -1;
            this.states = {
                beforeData: function () {
                    var char = this.peek();
                    if (char === "<") {
                        this.state = 'tagOpen';
                        this.markTagStart();
                        this.consume();
                    } else {
                        this.state = 'data';
                        this.delegate.beginData();
                    }
                },
                data: function () {
                    var char = this.peek();
                    if (char === "<") {
                        this.delegate.finishData();
                        this.state = 'tagOpen';
                        this.markTagStart();
                        this.consume();
                    } else if (char === "&") {
                        this.consume();
                        this.delegate.appendToData(this.consumeCharRef() || "&");
                    } else {
                        this.consume();
                        this.delegate.appendToData(char);
                    }
                },
                tagOpen: function () {
                    var char = this.consume();
                    if (char === "!") {
                        this.state = 'markupDeclaration';
                    } else if (char === "/") {
                        this.state = 'endTagOpen';
                    } else if (isAlpha(char)) {
                        this.state = 'tagName';
                        this.delegate.beginStartTag();
                        this.delegate.appendToTagName(char.toLowerCase());
                    }
                },
                markupDeclaration: function () {
                    var char = this.consume();
                    if (char === "-" && this.input.charAt(this.index) === "-") {
                        this.consume();
                        this.state = 'commentStart';
                        this.delegate.beginComment();
                    }
                },
                commentStart: function () {
                    var char = this.consume();
                    if (char === "-") {
                        this.state = 'commentStartDash';
                    } else if (char === ">") {
                        this.delegate.finishComment();
                        this.state = 'beforeData';
                    } else {
                        this.delegate.appendToCommentData(char);
                        this.state = 'comment';
                    }
                },
                commentStartDash: function () {
                    var char = this.consume();
                    if (char === "-") {
                        this.state = 'commentEnd';
                    } else if (char === ">") {
                        this.delegate.finishComment();
                        this.state = 'beforeData';
                    } else {
                        this.delegate.appendToCommentData("-");
                        this.state = 'comment';
                    }
                },
                comment: function () {
                    var char = this.consume();
                    if (char === "-") {
                        this.state = 'commentEndDash';
                    } else {
                        this.delegate.appendToCommentData(char);
                    }
                },
                commentEndDash: function () {
                    var char = this.consume();
                    if (char === "-") {
                        this.state = 'commentEnd';
                    } else {
                        this.delegate.appendToCommentData("-" + char);
                        this.state = 'comment';
                    }
                },
                commentEnd: function () {
                    var char = this.consume();
                    if (char === ">") {
                        this.delegate.finishComment();
                        this.state = 'beforeData';
                    } else {
                        this.delegate.appendToCommentData("--" + char);
                        this.state = 'comment';
                    }
                },
                tagName: function () {
                    var char = this.consume();
                    if (isSpace(char)) {
                        this.state = 'beforeAttributeName';
                    } else if (char === "/") {
                        this.state = 'selfClosingStartTag';
                    } else if (char === ">") {
                        this.delegate.finishTag();
                        this.state = 'beforeData';
                    } else {
                        this.delegate.appendToTagName(char);
                    }
                },
                beforeAttributeName: function () {
                    var char = this.peek();
                    if (isSpace(char)) {
                        this.consume();
                    } else if (char === "/") {
                        this.state = 'selfClosingStartTag';
                        this.consume();
                    } else if (char === ">") {
                        this.consume();
                        this.delegate.finishTag();
                        this.state = 'beforeData';
                    } else if (char === '=') {
                        this.delegate.reportSyntaxError("attribute name cannot start with equals sign");
                        this.state = 'attributeName';
                        this.delegate.beginAttribute();
                        this.consume();
                        this.delegate.appendToAttributeName(char);
                    } else {
                        this.state = 'attributeName';
                        this.delegate.beginAttribute();
                    }
                },
                attributeName: function () {
                    var char = this.peek();
                    if (isSpace(char)) {
                        this.state = 'afterAttributeName';
                        this.consume();
                    } else if (char === "/") {
                        this.delegate.beginAttributeValue(false);
                        this.delegate.finishAttributeValue();
                        this.consume();
                        this.state = 'selfClosingStartTag';
                    } else if (char === "=") {
                        this.state = 'beforeAttributeValue';
                        this.consume();
                    } else if (char === ">") {
                        this.delegate.beginAttributeValue(false);
                        this.delegate.finishAttributeValue();
                        this.consume();
                        this.delegate.finishTag();
                        this.state = 'beforeData';
                    } else if (char === '"' || char === "'" || char === '<') {
                        this.delegate.reportSyntaxError(char + " is not a valid character within attribute names");
                        this.consume();
                        this.delegate.appendToAttributeName(char);
                    } else {
                        this.consume();
                        this.delegate.appendToAttributeName(char);
                    }
                },
                afterAttributeName: function () {
                    var char = this.peek();
                    if (isSpace(char)) {
                        this.consume();
                    } else if (char === "/") {
                        this.delegate.beginAttributeValue(false);
                        this.delegate.finishAttributeValue();
                        this.consume();
                        this.state = 'selfClosingStartTag';
                    } else if (char === "=") {
                        this.consume();
                        this.state = 'beforeAttributeValue';
                    } else if (char === ">") {
                        this.delegate.beginAttributeValue(false);
                        this.delegate.finishAttributeValue();
                        this.consume();
                        this.delegate.finishTag();
                        this.state = 'beforeData';
                    } else {
                        this.delegate.beginAttributeValue(false);
                        this.delegate.finishAttributeValue();
                        this.consume();
                        this.state = 'attributeName';
                        this.delegate.beginAttribute();
                        this.delegate.appendToAttributeName(char);
                    }
                },
                beforeAttributeValue: function () {
                    var char = this.peek();
                    if (isSpace(char)) {
                        this.consume();
                    } else if (char === '"') {
                        this.state = 'attributeValueDoubleQuoted';
                        this.delegate.beginAttributeValue(true);
                        this.consume();
                    } else if (char === "'") {
                        this.state = 'attributeValueSingleQuoted';
                        this.delegate.beginAttributeValue(true);
                        this.consume();
                    } else if (char === ">") {
                        this.delegate.beginAttributeValue(false);
                        this.delegate.finishAttributeValue();
                        this.consume();
                        this.delegate.finishTag();
                        this.state = 'beforeData';
                    } else {
                        this.state = 'attributeValueUnquoted';
                        this.delegate.beginAttributeValue(false);
                        this.consume();
                        this.delegate.appendToAttributeValue(char);
                    }
                },
                attributeValueDoubleQuoted: function () {
                    var char = this.consume();
                    if (char === '"') {
                        this.delegate.finishAttributeValue();
                        this.state = 'afterAttributeValueQuoted';
                    } else if (char === "&") {
                        this.delegate.appendToAttributeValue(this.consumeCharRef('"') || "&");
                    } else {
                        this.delegate.appendToAttributeValue(char);
                    }
                },
                attributeValueSingleQuoted: function () {
                    var char = this.consume();
                    if (char === "'") {
                        this.delegate.finishAttributeValue();
                        this.state = 'afterAttributeValueQuoted';
                    } else if (char === "&") {
                        this.delegate.appendToAttributeValue(this.consumeCharRef("'") || "&");
                    } else {
                        this.delegate.appendToAttributeValue(char);
                    }
                },
                attributeValueUnquoted: function () {
                    var char = this.peek();
                    if (isSpace(char)) {
                        this.delegate.finishAttributeValue();
                        this.consume();
                        this.state = 'beforeAttributeName';
                    } else if (char === "&") {
                        this.consume();
                        this.delegate.appendToAttributeValue(this.consumeCharRef(">") || "&");
                    } else if (char === ">") {
                        this.delegate.finishAttributeValue();
                        this.consume();
                        this.delegate.finishTag();
                        this.state = 'beforeData';
                    } else {
                        this.consume();
                        this.delegate.appendToAttributeValue(char);
                    }
                },
                afterAttributeValueQuoted: function () {
                    var char = this.peek();
                    if (isSpace(char)) {
                        this.consume();
                        this.state = 'beforeAttributeName';
                    } else if (char === "/") {
                        this.consume();
                        this.state = 'selfClosingStartTag';
                    } else if (char === ">") {
                        this.consume();
                        this.delegate.finishTag();
                        this.state = 'beforeData';
                    } else {
                        this.state = 'beforeAttributeName';
                    }
                },
                selfClosingStartTag: function () {
                    var char = this.peek();
                    if (char === ">") {
                        this.consume();
                        this.delegate.markTagAsSelfClosing();
                        this.delegate.finishTag();
                        this.state = 'beforeData';
                    } else {
                        this.state = 'beforeAttributeName';
                    }
                },
                endTagOpen: function () {
                    var char = this.consume();
                    if (isAlpha(char)) {
                        this.state = 'tagName';
                        this.delegate.beginEndTag();
                        this.delegate.appendToTagName(char.toLowerCase());
                    }
                }
            };
            this.reset();
        }
        EventedTokenizer.prototype.reset = function () {
            this.state = 'beforeData';
            this.input = '';
            this.index = 0;
            this.line = 1;
            this.column = 0;
            this.tagLine = -1;
            this.tagColumn = -1;
            this.delegate.reset();
        };
        EventedTokenizer.prototype.tokenize = function (input) {
            this.reset();
            this.tokenizePart(input);
            this.tokenizeEOF();
        };
        EventedTokenizer.prototype.tokenizePart = function (input) {
            this.input += preprocessInput(input);
            while (this.index < this.input.length) {
                this.states[this.state].call(this);
            }
        };
        EventedTokenizer.prototype.tokenizeEOF = function () {
            this.flushData();
        };
        EventedTokenizer.prototype.flushData = function () {
            if (this.state === 'data') {
                this.delegate.finishData();
                this.state = 'beforeData';
            }
        };
        EventedTokenizer.prototype.peek = function () {
            return this.input.charAt(this.index);
        };
        EventedTokenizer.prototype.consume = function () {
            var char = this.peek();
            this.index++;
            if (char === "\n") {
                this.line++;
                this.column = 0;
            } else {
                this.column++;
            }
            return char;
        };
        EventedTokenizer.prototype.consumeCharRef = function () {
            var endIndex = this.input.indexOf(';', this.index),
                count;
            if (endIndex === -1) {
                return;
            }
            var entity = this.input.slice(this.index, endIndex);
            var chars = this.entityParser.parse(entity);
            if (chars) {
                count = entity.length;
                // consume the entity chars

                while (count) {
                    this.consume();
                    count--;
                }
                // consume the `;`
                this.consume();
                return chars;
            }
        };
        EventedTokenizer.prototype.markTagStart = function () {
            // these properties to be removed in next major bump
            this.tagLine = this.line;
            this.tagColumn = this.column;
            if (this.delegate.tagOpen) {
                this.delegate.tagOpen();
            }
        };
        return EventedTokenizer;
    }();

    var Tokenizer = function () {
        function Tokenizer(entityParser, options) {
            if (options === void 0) {
                options = {};
            }
            this.options = options;
            this.token = null;
            this.startLine = 1;
            this.startColumn = 0;
            this.tokens = [];
            this.currentAttribute = null;
            this.tokenizer = new EventedTokenizer(this, entityParser);
        }
        Tokenizer.prototype.tokenize = function (input) {
            this.tokens = [];
            this.tokenizer.tokenize(input);
            return this.tokens;
        };
        Tokenizer.prototype.tokenizePart = function (input) {
            this.tokens = [];
            this.tokenizer.tokenizePart(input);
            return this.tokens;
        };
        Tokenizer.prototype.tokenizeEOF = function () {
            this.tokens = [];
            this.tokenizer.tokenizeEOF();
            return this.tokens[0];
        };
        Tokenizer.prototype.reset = function () {
            this.token = null;
            this.startLine = 1;
            this.startColumn = 0;
        };
        Tokenizer.prototype.addLocInfo = function () {
            if (this.options.loc) {
                this.token.loc = {
                    start: {
                        line: this.startLine,
                        column: this.startColumn
                    },
                    end: {
                        line: this.tokenizer.line,
                        column: this.tokenizer.column
                    }
                };
            }
            this.startLine = this.tokenizer.line;
            this.startColumn = this.tokenizer.column;
        };
        // Data
        Tokenizer.prototype.beginData = function () {
            this.token = {
                type: 'Chars',
                chars: ''
            };
            this.tokens.push(this.token);
        };
        Tokenizer.prototype.appendToData = function (char) {
            this.token.chars += char;
        };
        Tokenizer.prototype.finishData = function () {
            this.addLocInfo();
        };
        // Comment
        Tokenizer.prototype.beginComment = function () {
            this.token = {
                type: 'Comment',
                chars: ''
            };
            this.tokens.push(this.token);
        };
        Tokenizer.prototype.appendToCommentData = function (char) {
            this.token.chars += char;
        };
        Tokenizer.prototype.finishComment = function () {
            this.addLocInfo();
        };
        // Tags - basic
        Tokenizer.prototype.beginStartTag = function () {
            this.token = {
                type: 'StartTag',
                tagName: '',
                attributes: [],
                selfClosing: false
            };
            this.tokens.push(this.token);
        };
        Tokenizer.prototype.beginEndTag = function () {
            this.token = {
                type: 'EndTag',
                tagName: ''
            };
            this.tokens.push(this.token);
        };
        Tokenizer.prototype.finishTag = function () {
            this.addLocInfo();
        };
        Tokenizer.prototype.markTagAsSelfClosing = function () {
            this.token.selfClosing = true;
        };
        // Tags - name
        Tokenizer.prototype.appendToTagName = function (char) {
            this.token.tagName += char;
        };
        // Tags - attributes
        Tokenizer.prototype.beginAttribute = function () {
            this.currentAttribute = ["", "", null];
            this.token.attributes.push(this.currentAttribute);
        };
        Tokenizer.prototype.appendToAttributeName = function (char) {
            this.currentAttribute[0] += char;
        };
        Tokenizer.prototype.beginAttributeValue = function (isQuoted) {
            this.currentAttribute[2] = isQuoted;
        };
        Tokenizer.prototype.appendToAttributeValue = function (char) {
            this.currentAttribute[1] = this.currentAttribute[1] || "";
            this.currentAttribute[1] += char;
        };
        Tokenizer.prototype.finishAttributeValue = function () {};
        Tokenizer.prototype.reportSyntaxError = function (message) {
            this.token.syntaxError = message;
        };
        return Tokenizer;
    }();

    exports.HTML5NamedCharRefs = namedCharRefs;
    exports.EntityParser = EntityParser;
    exports.EventedTokenizer = EventedTokenizer;
    exports.Tokenizer = Tokenizer;
    exports.tokenize = function (input, options) {
        var tokenizer = new Tokenizer(new EntityParser(namedCharRefs), options);
        return tokenizer.tokenize(input);
    };
});
(function (m) { if (typeof module === "object" && module.exports) { module.exports = m } }(requireModule('ember-template-compiler')));


}());
//# sourceMappingURL=ember-template-compiler.map

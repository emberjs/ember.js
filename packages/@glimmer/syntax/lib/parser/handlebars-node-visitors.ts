import b from "../builders";
import { appendChild, isLiteral, printLiteral } from "../utils";

export default {
  Program: function(program) {
    let body = [];
    let node = b.program(body, program.blockParams, program.loc);
    let i, l = program.body.length;

    this.elementStack.push(node);

    if (l === 0) { return this.elementStack.pop(); }

    for (i = 0; i < l; i++) {
      this.acceptNode(program.body[i]);
    }

    // Ensure that that the element stack is balanced properly.
    let poppedNode = this.elementStack.pop();
    if (poppedNode !== node) {
      throw new Error("Unclosed element `" + poppedNode.tag + "` (on line " + poppedNode.loc.start.line + ").");
    }

    return node;
  },

  BlockStatement: function(block) {
    delete block.inverseStrip;
    delete block.openString;
    delete block.closeStrip;

    if (this.tokenizer.state === 'comment') {
      this.appendToCommentData('{{' + this.sourceForMustache(block) + '}}');
      return;
    }

    if (this.tokenizer.state !== 'comment' && this.tokenizer.state !== 'data' && this.tokenizer.state !== 'beforeData') {
      throw new Error("A block may only be used inside an HTML element or another block.");
    }

    block = acceptCommonNodes(this, block);
    let program = block.program ? this.acceptNode(block.program) : null;
    let inverse = block.inverse ? this.acceptNode(block.inverse) : null;

    let node = b.block(block.path, block.params, block.hash, program, inverse, block.loc);
    let parentProgram = this.currentElement();
    appendChild(parentProgram, node);
  },

  MustacheStatement: function(rawMustache) {
    let { tokenizer } = this;
    let { path, params, hash, escaped, loc } = rawMustache;
    let mustache = b.mustache(path, params, hash, !escaped, loc);

    if (tokenizer.state === 'comment') {
      this.appendToCommentData('{{' + this.sourceForMustache(mustache) + '}}');
      return;
    }

    acceptCommonNodes(this, mustache);

    switch (tokenizer.state) {
      // Tag helpers
      case "tagName":
        addElementModifier(this.currentNode, mustache);
        tokenizer.state = "beforeAttributeName";
        break;
      case "beforeAttributeName":
        addElementModifier(this.currentNode, mustache);
        break;
      case "attributeName":
      case "afterAttributeName":
        this.beginAttributeValue(false);
        this.finishAttributeValue();
        addElementModifier(this.currentNode, mustache);
        tokenizer.state = "beforeAttributeName";
        break;
      case "afterAttributeValueQuoted":
        addElementModifier(this.currentNode, mustache);
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
  },

  ContentStatement: function(content) {
    updateTokenizerLocation(this.tokenizer, content);

    this.tokenizer.tokenizePart(content.value);
    this.tokenizer.flushData();
  },

  CommentStatement: function(rawComment) {
    let { tokenizer } = this;
    let { value, loc } = rawComment;
    let comment = b.mustacheComment(value, loc);

    if (tokenizer.state === 'comment') {
      this.appendToCommentData('{{' + this.sourceForMustache(comment) + '}}');
      return;
    }

    switch (tokenizer.state) {
      case "beforeAttributeName":
        this.currentNode.comments.push(comment);
        break;

      case 'beforeData':
      case 'data':
        appendChild(this.currentElement(), comment);
        break;

      default:
        throw new Error(`Using a Handlebars comment when in the \`${tokenizer.state}\` state is not supported: "${comment.value}" on line ${loc.start.line}:${loc.start.column}`);
    }

    return comment;
  },

  PartialStatement: function(partial) {
    let { name, loc } = partial;

    throw new Error(`Handlebars partials are not supported: "{{> ${name.original}" at L${loc.start.line}:C${loc.start.column}`);
  },

  PartialBlockStatement: function(partialBlock) {
    let { name, loc } = partialBlock;

    throw new Error(`Handlebars partial blocks are not supported: "{{#> ${name.original}" at L${loc.start.line}:C${loc.start.column}`);
  },

  Decorator: function(decorator) {
    let { loc, path } = decorator;

    let source = this.sourceForMustache(decorator);

    throw new Error(`Handlebars decorators are not supported: "{{* ${path.original}" at L${loc.start.line}:C${loc.start.column}`);
  },

  DecoratorBlock: function(decoratorBlock) {
    let { loc, path } = decoratorBlock;
    let source = this.sourceForMustache(decoratorBlock);

    throw new Error(`Handlebars decorator blocks are not supported: "{{#* ${path.original}" at L${loc.start.line}:C${loc.start.column}`);
  },

  SubExpression: function(sexpr) {
    return acceptCommonNodes(this, sexpr);
  },

  PathExpression: function(path) {
    let { original, loc } = path;

    if (original.indexOf('/') !== -1) {
      // TODO add a SyntaxError with loc info
      if (original.slice(0, 2) === './') {
        throw new Error(`Using "./" is not supported in Glimmer and unnecessary: "${path.original}" on line ${loc.start.line}.`);
      }
      if (original.slice(0, 3) === '../') {
        throw new Error(`Changing context using "../" is not supported in Glimmer: "${path.original}" on line ${loc.start.line}.`);
      }
      if (original.indexOf('.') !== -1) {
        throw new Error(`Mixing '.' and '/' in paths is not supported in Glimmer; use only '.' to separate property paths: "${path.original}" on line ${loc.start.line}.`);
      }
      path.parts = [ path.parts.join('/') ];
    }

    delete path.depth;

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
      path.parts.unshift(null);
    }

    return path;
  },

  Hash: function(hash) {
    for (let i = 0; i < hash.pairs.length; i++) {
      this.acceptNode(hash.pairs[i].value);
    }

    return hash;
  },

  StringLiteral: function() {},
  BooleanLiteral: function() {},
  NumberLiteral: function() {},
  UndefinedLiteral: function() {},
  NullLiteral: function() {}
};

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
  let difference = original.split(value)[0];
  let lines = difference.split(/\n/);
  let lineCount = lines.length - 1;

  return {
    lines: lineCount,
    columns: lines[lineCount].length
  };
}

function updateTokenizerLocation(tokenizer, content) {
  let line = content.loc.start.line;
  let column = content.loc.start.column;

  let offsets = calculateRightStrippedOffsets(content.original, content.value);

  line = line + offsets.lines;
  if (offsets.lines) {
    column = offsets.columns;
  } else {
    column = column + offsets.columns;
  }

  tokenizer.line = line;
  tokenizer.column = column;
}

function acceptCommonNodes(compiler, node) {
  compiler.acceptNode(node.path);

  if (node.params) {
    for (let i = 0; i < node.params.length; i++) {
      compiler.acceptNode(node.params[i]);
    }
  } else {
    node.params = [];
  }

  if (node.hash) {
    compiler.acceptNode(node.hash);
  } else {
    node.hash = b.hash();
  }

  return node;
}

function addElementModifier(element, mustache) {
  let { path, params, hash, loc } = mustache;

  if (isLiteral(path)) {
    let modifier = `{{${printLiteral(path)}}}`;
    let tag = `<${element.name} ... ${modifier} ...`;

    throw new Error(`In ${tag}, ${modifier} is not a valid modifier: "${path.original}" on line ${loc.start.line}.`);
  }

  let modifier = b.elementModifier(path, params, hash, loc);
  element.modifiers.push(modifier);
}

function appendDynamicAttributeValuePart(attribute, part) {
  attribute.isDynamic = true;
  attribute.parts.push(part);
}

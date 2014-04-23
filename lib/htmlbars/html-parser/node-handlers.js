import { BlockNode, ProgramNode, TextNode, appendChild } from "htmlbars/ast";
import { Chars } from "htmlbars/html-parser/tokens";

var nodeHelpers = {

  program: function(program) {
    var statements = [];
    var node = new ProgramNode(statements, program.strip);
    var i, l = program.statements.length;
    var statement;

    this.elementStack.push(node);

    if (l === 0) return this.elementStack.pop();

    statement = program.statements[0];
    if (statement.type === 'block' || statement.type === 'mustache') {
      statements.push(new TextNode(''));
    }

    for (i = 0; i < l; i++) {
      this.acceptNode(program.statements[i]);
    }

    this.acceptToken(this.tokenizer.tokenizeEOF());

    statement = program.statements[l-1];
    if (statement.type === 'block' || statement.type === 'mustache') {
      statements.push(new TextNode(''));
    }

    // Remove any stripped whitespace
    l = statements.length;
    for (i = 0; i < l; i++) {
      statement = statements[i];
      if (statement.type !== 'text') continue;

      if ((i > 0 && statements[i-1].strip && statements[i-1].strip.right) ||
        (i === 0 && program.strip.left)) {
        statement.chars = statement.chars.replace(/^\s+/, '');
      }

      if ((i < l-1 && statements[i+1].strip && statements[i+1].strip.left) ||
        (i === l-1 && program.strip.right)) {
        statement.chars = statement.chars.replace(/\s+$/, '');
      }

      // Remove unnecessary text nodes
      if (statement.chars.length === 0) {
        if ((i > 0 && statements[i-1].type === 'element') ||
          (i < l-1 && statements[i+1].type === 'element')) {
          statements.splice(i, 1);
          i--;
          l--;
        }
      }
    }

    // Ensure that that the element stack is balanced properly.
    var poppedNode = this.elementStack.pop();
    if (poppedNode !== node) {
      throw new Error("Unclosed element: " + poppedNode.tag);
    }

    return node;
  },

  block: function(block) {
    switchToHandlebars(this);
    this.acceptToken(block);

    var mustache = block.mustache;
    var program = this.acceptNode(block.program);
    var inverse = block.inverse ? this.acceptNode(block.inverse) : null;
    var strip = block.strip;

    // Normalize inverse's strip
    if (inverse && !inverse.strip.left) {
      inverse.strip.left = false;
    }

    var node = new BlockNode(mustache, program, inverse, strip);
    var parentProgram = this.currentElement();
    appendChild(parentProgram, node);
  },

  content: function(content) {
    var tokens = this.tokenizer.tokenizePart(content.string);

    return tokens.forEach(function(token) {
      this.acceptToken(token);
    }, this);
  },

  mustache: function(mustache) {
    switchToHandlebars(this);
    this.acceptToken(mustache);
  }

};

function switchToHandlebars(processor) {
  var token = processor.tokenizer.token;

  // TODO: Monkey patch Chars.addChar like attributes
  if (token instanceof Chars) {
    processor.acceptToken(token);
    processor.tokenizer.token = null;
  }
}

export default nodeHelpers;

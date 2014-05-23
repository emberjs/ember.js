import { childrenFor } from "../ast";

function Frame(program, parent, isBlock) {
  this.parent = parent;
  this.program = program;
  this.children = childrenFor(program);
  this.length = this.children.length;

  // cursor
  this.pos = this.length-1;
  this.inverse = false;

  // block tracking
  this.isBlock = isBlock;
  this.block = isBlock ? this : parent.block;
  this.stack = isBlock ? [['endTemplate', program]] : null;
  this.count = 0;
  this.mustacheCount = 0;
}

Frame.prototype.next = function() {
  var node;
  while (this.pos >= 0) {
    node = this.children[this.pos];
    if (this.inverse) {
      this.inverse = false;
      this.pos--;
      this.block.count++;
      return new Frame(node.program, this, true);
    }
    if (node.type === 'text') {
      this.block.stack.push(['text', node, this.pos, this.length]);
    } else if (node.type === 'block' || node.type === 'component') {
      this.mustacheCount++;
      this.block.stack.push([node.type, node, this.pos, this.length]);
      if (node.inverse) {
        this.inverse = true;
        this.block.count++;
        return new Frame(node.inverse, this, true);
      } else {
        this.pos--;
        this.block.count++;
        return new Frame(node.program, this, true);
      }
    } else if (node.type === 'element') {
      if (this.childElementFrame) {
        this.block.stack.push(['openElement', node, this.pos, this.length, this.childElementFrame.mustacheCount]);
        if (this.childElementFrame.mustacheCount) {
          // We only increment once vs add the mustache count because a child
          // element with multiple nodes is just a single consumer.
          this.mustacheCount++;
        }
        this.childElementFrame = null;
      } else {
        this.block.stack.push(['closeElement', node, this.pos, this.length]);
        this.childElementFrame = new Frame(node, this, false);
        this.childElementFrame.mustacheCount = node.helpers.length;
        return this.childElementFrame;
      }
    } else {
      if (node.type === 'mustache') {
        this.mustacheCount++;
      }
      this.block.stack.push(['node', node, this.pos, this.length]);
    }
    this.pos--;
  }
  if (this.isBlock) {
    this.block.stack.push(['startTemplate', this.program, this.block.count]);
  }
  return null;
};

export function ASTWalker(compiler) {
  this.compiler = compiler;
}

// Walks tree backwards depth first so that child
// templates can be push onto stack then popped
// off for its parent.
ASTWalker.prototype.visit = function(program) {
  var frame = new Frame(program, null, true), next;
  while (frame) {
    next = frame.next();
    if (next === null) {
      if (frame.isBlock) {
        this.send(frame.stack);
      }
      frame = frame.parent;
    } else {
      frame = next;
    }
  }
};

ASTWalker.prototype.send = function(stack) {
  var compiler = this.compiler, tuple, name;
  while (tuple = stack.pop()) {
    name = tuple.shift();
    compiler[name].apply(compiler, tuple);
  }
};

// compiler.startTemplate(program, childTemplateCount);
// compiler.endTemplate(program);
// compiler.block(block, index, length);
// compiler.openElement(element, index, length);
// compiler.text(text, index, length);
// compiler.closeElement(element, index, length);
// compiler.node(node, index, length)

import { HTMLElement, BlockElement } from "htmlbars/ast";

function Frame(children, parent, isBlock) {
  this.parent = parent;
  this.children = children;
  this.length = children.length;

  // cursor
  this.pos = this.length-1;
  this.inverse = false;
  this.close = false;

  // block tracking
  this.isBlock = isBlock;
  this.block = isBlock ? this : parent.block;
  this.stack = isBlock ? [['endTemplate']] : null;
  this.count = 0;
}

Frame.prototype.next = function() {
  var node;
  while (this.pos >= 0) {
    node = this.children[this.pos];
    if (this.inverse) {
      this.inverse = false;
      this.pos--;
      this.block.count++;
      return new Frame(node.children, this, true);
    }
    if (typeof node === 'string') {
      this.block.stack.push(['text', node, this.pos, this.length]);
    } else if (node instanceof BlockElement) {
      this.block.stack.push(['block', node, this.pos, this.length]);
      if (node.inverse) {
        this.inverse = true;
        this.block.count++;
        return new Frame(node.inverse, this, true);
      } else {
        this.pos--;
        this.block.count++;
        return new Frame(node.children, this, true);
      }
    } else if (node instanceof HTMLElement) {
      if (this.close) {
        this.close = false;
        this.block.stack.push(['openElement', node, this.pos, this.length]);
      } else {
        this.close = true;
        this.block.stack.push(['closeElement', node, this.pos, this.length]);
        return new Frame(node.children, this, false);
      }
    } else {
      this.block.stack.push(['node', node, this.pos, this.length]);
    }
    this.pos--;
  }
  if (this.isBlock) {
    this.block.stack.push(['startTemplate', this.block.count]);
  }
  return null;
};

export function ASTWalker(compiler) {
  this.compiler = compiler;
}

// Walks tree backwards depth first so that child
// templates can be push onto stack then popped
// off for its parent.
ASTWalker.prototype.visit = function (children) {
  var frame = new Frame(children, null, true), next;
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
  while(tuple = stack.pop()) {
    name = tuple.shift();
    compiler[name].apply(compiler, tuple);
  }
};

// compiler.startTemplate(childBlockCount);
// compiler.endTemplate();
// compiler.block(block, index, length);
// compiler.openElement(element, index, length);
// compiler.text(text, index, length);
// compiler.closeElement(element, index, length);
// compiler.node(node, index, length)

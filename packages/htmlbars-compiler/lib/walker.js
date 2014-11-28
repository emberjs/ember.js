function Walker(order) {
  this.order = order;
  this.stack = [];
}

export default Walker;

Walker.prototype.visit = function(node, callback) {
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

var visitors = {
  program: function(walker, node, callback) {
    for (var i = 0; i < node.statements.length; i++) {
      walker.visit(node.statements[i], callback);
    }
  },

  element: function(walker, node, callback) {
    for (var i = 0; i < node.children.length; i++) {
      walker.visit(node.children[i], callback);
    }
  },

  block: function(walker, node, callback) {
    walker.visit(node.program, callback);
    walker.visit(node.inverse, callback);
  },

  component: function(walker, node, callback) {
    walker.visit(node.program, callback);
  }
};

Walker.prototype.children = function(node, callback) {
  var visitor = visitors[node.type];
  if (visitor) {
    visitor(this, node, callback);
  }
};

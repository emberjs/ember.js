var tree = {
  value: 'a',
  children: [{
    value:'b',
    children: [{
      value: 'e',
      children: [{
        value: 'h',
        children: [{
          value: 'k',
          children: [{
            value: 'l',
            children: []
          }]
        }]
      },{
        value: 'i',
        children: []
      }]
    }]
  },
  {
    value:'c',
    children: []
  },
  {
    value:'d',
    children: [{
      value: 'f',
      children: [{
        value: 'j',
        children: []
      }]
    },{
      value: 'g',
      children: []
    }]
  }]
};

function preorder(root) {
  var stack = [root];
  var len = 1;
  var node, children, l;
  while (len--) {
    node = stack[len];
    console.log(node.value);
    children = node.children;
    l = children.length;
    while (l--) {
      stack[len++] = children[l];
    }
  }
}

function levelorder(root) {
  var stack = [root];
  var pos = 0;
  var len = 1;
  var node, children, i, l;
  while (pos < len) {
    node = stack[pos++];
    console.log(node.value);
    children = node.children;
    for (i=0, l=children.length; i<l; i++) {
      stack[len++] = children[i];
    }
  }
}
console.log('preorder');
preorder(tree);
console.log('levelorder');
levelorder(tree);

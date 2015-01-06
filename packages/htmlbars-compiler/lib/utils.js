export function processOpcodes(compiler, opcodes) {
  for (var i=0, l=opcodes.length; i<l; i++) {
    var method = opcodes[i][0];
    var params = opcodes[i][1];
    if (params) {
      compiler[method].apply(compiler, params);
    } else {
      compiler[method].call(compiler);
    }
  }
}

// ref http://dev.w3.org/html5/spec-LC/namespaces.html
var defaultNamespaces = {
  html: 'http://www.w3.org/1999/xhtml',
  mathml: 'http://www.w3.org/1998/Math/MathML',
  svg: 'http://www.w3.org/2000/svg',
  xlink: 'http://www.w3.org/1999/xlink',
  xml: 'http://www.w3.org/XML/1998/namespace'
};

export function getNamespace(attrName) {
  var parts = attrName.split(':');
  if (parts.length > 1) {
    return defaultNamespaces[parts[0]];
  }
}

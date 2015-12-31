// ref http://dev.w3.org/html5/spec-LC/namespaces.html
let defaultNamespaces = {
  html: 'http://www.w3.org/1999/xhtml',
  mathml: 'http://www.w3.org/1998/Math/MathML',
  svg: 'http://www.w3.org/2000/svg',
  xlink: 'http://www.w3.org/1999/xlink',
  xml: 'http://www.w3.org/XML/1998/namespace'
};

export function getAttrNamespace(attrName) {
  let namespace;

  let colonIndex = attrName.indexOf(':');
  if (colonIndex !== -1) {
    let prefix = attrName.slice(0, colonIndex);
    namespace = defaultNamespaces[prefix];
  }

  return namespace || null;
}

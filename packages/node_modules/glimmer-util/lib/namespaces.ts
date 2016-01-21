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

const XLINK = 'http://www.w3.org/1999/xlink';
const XML = 'http://www.w3.org/XML/1998/namespace';
const XMLNS = 'http://www.w3.org/2000/xmlns/';

const WHITELIST = {
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

export function getAttrNamespace(attrName) {
  return WHITELIST[attrName] || null;
}
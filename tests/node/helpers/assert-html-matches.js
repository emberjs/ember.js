var QUnit = require('qunitjs');
var diffOptions = {
  ignoreAttributes: ['id'],
  ignoreWhitespaces: true
};
var HtmlDiffer = require('html-differ').HtmlDiffer;
var htmlDiffer = new HtmlDiffer(diffOptions);

/**
 * This assertion helper tests whether two fragments of Html 'appear'
 * to match. In terms of fragments rendered by Ember, we want to explicitly
 * ignore whitespace and certain attributes values, such as IDs, which Ember
 * auto-generates. Attribute ordering is also ignored.
 */
function assertHTMLMatches(actual, expected, message) {
  var isEqual = htmlDiffer.isEqual(actual, expected);

  QUnit.push(isEqual, actual, expected, message);
}

module.exports = assertHTMLMatches;
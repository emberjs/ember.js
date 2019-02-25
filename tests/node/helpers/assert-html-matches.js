const { HtmlDiffer } = require('html-differ');

const htmlDiffer = new HtmlDiffer({
  ignoreAttributes: ['id'],
  ignoreWhitespaces: true,
});

module.exports = {
  /*
   * This assertion helper tests whether two fragments of Html 'appear'
   * to match. In terms of fragments rendered by Ember, we want to explicitly
   * ignore whitespace and certain attributes values, such as IDs, which Ember
   * auto-generates. Attribute ordering is also ignored.
   */
  register() {
    QUnit.assert.htmlMatches = function(actual, expected, message) {
      var isEqual = htmlDiffer.isEqual(actual, expected);

      this.pushResult({
        result: isEqual,
        actual,
        expected,
        message,
      });
    };
  },
};

import { testsFor, View, $, equalHTML, appendTo } from "ember-metal-views/tests/test_helpers";

testsFor("ember-metal-views - attributes");

test('aliased attributeBindings', function() {
  var view = {
    isView: true,
    attributeBindings: ['isDisabled:disabled'],
    isDisabled: 'disabled'
  };

  var el = appendTo(view, '#qunit-fixture');

  equal(el.getAttribute('disabled'), 'disabled', "The attribute alias was set");

  View.destroy(view);
});
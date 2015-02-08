import {
  appendTo,
  subject,
  testsFor
} from "ember-metal-views/tests/test_helpers";

testsFor("ember-metal-views - attributes");

QUnit.test('aliased attributeBindings', function() {
  var view = {
    isView: true,
    attributeBindings: ['isDisabled:disabled'],
    isDisabled: 'disabled'
  };

  var el = appendTo(view);

  equal(el.getAttribute('disabled'), 'disabled', "The attribute alias was set");

  subject().removeAndDestroy(view);
});

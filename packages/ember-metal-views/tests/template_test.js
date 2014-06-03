import { testsFor, View, $, equalHTML, appendTo } from "ember-metal-views/tests/test_helpers";

module("ember-metal-views - template support", {
  setup: function() {
    $('#qunit-fixture').innerHTML = '';
  }
});

test("a view can have a template", function() {
  var view = {
    isView: true,

    template: function(context) {
      return document.createTextNode(context.prop);
    },

    templateOptions: {data: {}},

    prop: "WAT"
  };

  appendTo(view, '#qunit-fixture');
  equalHTML('#qunit-fixture', "<div>WAT</div>");
});
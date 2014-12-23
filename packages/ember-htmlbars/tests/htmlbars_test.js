import compile from "ember-template-compiler/system/compile";
import { defaultEnv } from "ember-htmlbars";
import { equalHTML } from "htmlbars-test-helpers";

if (Ember.FEATURES.isEnabled('ember-htmlbars')) {

  QUnit.module("ember-htmlbars: main");

  test("HTMLBars is present and can be executed", function() {
    var template = compile("ohai");
    var output = template.render({}, defaultEnv, document.body);
    equalHTML(output, "ohai");
  });
}

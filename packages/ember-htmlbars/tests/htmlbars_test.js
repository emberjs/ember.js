import { compile } from "htmlbars-compiler/compiler";
import { defaultEnv } from "ember-htmlbars";
import { equalHTML } from "./helpers";

if (Ember.FEATURES.isEnabled('ember-htmlbars')) {

  QUnit.module("ember-htmlbars: main");

  test("HTMLBars is present and can be executed", function() {
    var template = compile("ohai");
    var output = template({}, defaultEnv, document.body);
    equalHTML(output, "ohai");
  });
}

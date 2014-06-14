import { compile } from "htmlbars-compiler/compiler";
import { defaultEnv } from "ember-htmlbars";

function fragmentHTML(fragment) {
  var html = '', node;
  for (var i = 0, l = fragment.childNodes.length; i < l; i++) {
    node = fragment.childNodes[i];
    if (node.nodeType === 3) {
      html += node.nodeValue;
    } else {
      html += node.outerHTML;
    }
  }
  return html;
}

QUnit.module("ember-htmlbars");

test("hello world", function() {
  var template = compile("ohai {{name}}");
  var output = template({name: 'erik'}, defaultEnv, document.body);
  equal(fragmentHTML(output), "ohai erik");
});

/* jshint scripturl:true */

import EmberView from "ember-views/views/view";
import compile from "ember-template-compiler/system/compile";
import run from "ember-metal/run_loop";
import { SafeString } from "ember-htmlbars/utils/string";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";
import environment from "ember-metal/environment";

var view;

QUnit.module("ember-htmlbars: sanitized attribute", {
  teardown() {
    runDestroy(view);
  }
});

var badTags = [
  { tag: 'a', attr: 'href',
    template: compile('<a {{bind-attr href=view.badValue}}></a>') },
  { tag: 'body', attr: 'background',
    // IE8 crashes when setting background with
    // a javascript: protocol
    skip: (environment.hasDOM && document.documentMode && document.documentMode <= 8),
    template: compile('<body {{bind-attr background=view.badValue}}></body>') },
  { tag: 'link', attr: 'href',
    template: compile('<link {{bind-attr href=view.badValue}}>') },
  { tag: 'img', attr: 'src',
    template: compile('<img {{bind-attr src=view.badValue}}>') }
];

for (var i=0, l=badTags.length; i<l; i++) {
  (function() {
    var tagName = badTags[i].tag;
    var attr = badTags[i].attr;
    var template = badTags[i].template;

    if (badTags[i].skip) {
      return;
    }

    QUnit.test("XSS - should not bind unsafe "+tagName+" "+attr+" values", function() {
      view = EmberView.create({
        template: template,
        badValue: "javascript:alert('XSS')"
      });

      runAppend(view);

      equal(view.element.firstChild.getAttribute(attr),
             "unsafe:javascript:alert('XSS')",
             "attribute is output");
    });

    QUnit.test("XSS - should not bind unsafe "+tagName+" "+attr+" values on rerender", function() {
      view = EmberView.create({
        template: template,
        badValue: "/sunshine/and/rainbows"
      });

      runAppend(view);

      equal(view.element.firstChild.getAttribute(attr),
             "/sunshine/and/rainbows",
             "attribute is output");

      run(view, 'set', 'badValue', "javascript:alert('XSS')");

      equal(view.element.firstChild.getAttribute(attr),
             "unsafe:javascript:alert('XSS')",
             "attribute is output");
    });

    QUnit.test("should bind unsafe "+tagName+" "+attr+" values if they are SafeString", function() {
      view = EmberView.create({
        template: template,
        badValue: new SafeString("javascript:alert('XSS')")
      });

      try {
        runAppend(view);

        equal(view.element.firstChild.getAttribute(attr),
               "javascript:alert('XSS')",
               "attribute is output");
      } catch(e) {
        // IE does not allow javascript: to be set on img src
        ok(true, 'caught exception '+e);
      }
    });
  })(); //jshint ignore:line
}

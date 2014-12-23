/* jshint scripturl:true */

import EmberView from "ember-views/views/view";
import EmberHandlebars from "ember-handlebars";
import run from "ember-metal/run_loop";

function compile(str) {
  return EmberHandlebars.compile(str);
}
var SafeString = EmberHandlebars.SafeString;

function runAppend(view) {
  run(view, view.append);
}

function runDestroy(view) {
  run(view, view.destroy);
}

var view;

QUnit.module("ember-handlebars: sanitized attribute", {
  teardown: function(){
    runDestroy(view);
  }
});

var badTags = [
  { tag: 'a', attr: 'href',
    template: compile('<a {{bind-attr href=view.badValue}}></a>') },
  { tag: 'link', attr: 'href',
    template: compile('<link {{bind-attr href=view.badValue}}>') },
  { tag: 'img', attr: 'src',
    template: compile('<img {{bind-attr src=view.badValue}}>') },
  { tag: 'iframe', attr: 'src',
    template: compile('<iframe {{bind-attr src=view.badValue}}></iframe>') }
];

for (var i=0, l=badTags.length; i<l; i++) {
  (function(){
    var tagName = badTags[i].tag;
    var attr = badTags[i].attr;
    var template = badTags[i].template;

    test("XSS - should not bind unsafe "+tagName+" "+attr+" values", function() {
      view = EmberView.create({
        template: template,
        badValue: "javascript:alert('XSS')"
      });

      runAppend(view);

      equal( view.element.firstChild.getAttribute(attr),
             "unsafe:javascript:alert('XSS')",
             "attribute is output" );
    });

    test("XSS - should not bind unsafe "+tagName+" "+attr+" values on rerender", function() {
      view = EmberView.create({
        template: template,
        badValue: "/sunshine/and/rainbows"
      });

      runAppend(view);

      equal( view.element.firstChild.getAttribute(attr),
             "/sunshine/and/rainbows",
             "attribute is output" );

      run(view, 'set', 'badValue', "javascript:alert('XSS')");

      equal( view.element.firstChild.getAttribute(attr),
             "unsafe:javascript:alert('XSS')",
             "attribute is output" );
    });

    test("should bind unsafe "+tagName+" "+attr+" values if they are SafeString", function() {
      view = EmberView.create({
        template: template,
        badValue: new SafeString("javascript:alert('XSS')")
      });

      try {
        runAppend(view);

        equal( view.element.firstChild.getAttribute(attr),
               "javascript:alert('XSS')",
               "attribute is output" );
      } catch(e) {
        // IE does not allow javascript: to be set on img src
        ok(true, 'caught exception '+e);
      }
    });
  })(); //jshint ignore:line
}

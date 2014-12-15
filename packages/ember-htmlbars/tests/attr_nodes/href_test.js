/* jshint scripturl:true */

import EmberView from "ember-views/views/view";
import run from "ember-metal/run_loop";
import compile from "ember-template-compiler/system/compile";
import { equalInnerHTML } from "htmlbars-test-helpers";
import { SafeString } from "ember-htmlbars/utils/string";

var view;

function appendView(view) {
  run(function() { view.appendTo('#qunit-fixture'); });
}

if (Ember.FEATURES.isEnabled('ember-htmlbars-attribute-syntax')) {

QUnit.module("ember-htmlbars: href attribute", {
  teardown: function(){
    if (view) {
      run(view, view.destroy);
    }
  }
});

test("href is set", function() {
  view = EmberView.create({
    context: {url: 'http://example.com'},
    template: compile("<a href={{url}}></a>")
  });
  appendView(view);

  equalInnerHTML(view.element, '<a href="http://example.com"></a>',
                 "attribute is output");
});

test("href is sanitized when using blacklisted protocol", function() {
  view = EmberView.create({
    context: {url: 'javascript://example.com'},
    template: compile("<a href={{url}}></a>")
  });
  appendView(view);

  equalInnerHTML(view.element, '<a href="unsafe:javascript://example.com"></a>',
                 "attribute is output");
});

test("href is sanitized when using quoted non-whitelisted protocol", function() {
  view = EmberView.create({
    context: {url: 'javascript://example.com'},
    template: compile("<a href='{{url}}'></a>")
  });
  appendView(view);

  equalInnerHTML(view.element, '<a href="unsafe:javascript://example.com"></a>',
                 "attribute is output");
});

test("href is not sanitized when using non-whitelisted protocol with a SafeString", function() {
  view = EmberView.create({
    context: {url: new SafeString('javascript://example.com')},
    template: compile("<a href={{url}}></a>")
  });
  appendView(view);

  equalInnerHTML(view.element, '<a href="javascript://example.com"></a>',
                 "attribute is output");
});

test("href is sanitized when using quoted+concat non-whitelisted protocol", function() {
  view = EmberView.create({
    context: {protocol: 'javascript:', path: '//example.com'},
    template: compile("<a href='{{protocol}}{{path}}'></a>")
  });
  appendView(view);

  equalInnerHTML(view.element, '<a href="unsafe:javascript://example.com"></a>',
                 "attribute is output");
});

}

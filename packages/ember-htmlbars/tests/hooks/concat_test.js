import EmberView from "ember-views/views/view";
import compile from "ember-htmlbars/system/compile";
import { equalInnerHTML } from "htmlbars-test-helpers";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var view;

if (Ember.FEATURES.isEnabled('ember-htmlbars')) {

QUnit.module("ember-htmlbars: hooks/concat_test", {
  teardown: function(){
    runDestroy(view);
  }
});

test("output is concatenated", function() {
  view = EmberView.create({
    context: {fname: 'erik', lname: 'smushname'},
    template: compile("ohai {{concat fname lname}}")
  });
  runAppend(view);
  equalInnerHTML(view.element, 'ohai eriksmushname', "output is concatenated");
});

test("output is concatenated with joinWith", function() {
  view = EmberView.create({
    context: {fname: 'erik', lname: 'bwap'},
    template: compile("ohai {{concat fname lname 'name' joinWith=\"+\"}}")
  });
  runAppend(view);
  equalInnerHTML(view.element, 'ohai erik+bwap+name', "output is concatented with joinWith");
});

}

import { testsFor, subject, $, equalHTML, triggerEvent, appendTo } from "ember-metal-views/tests/test_helpers";
import { events } from "ember-metal-views/events";

testsFor("ember-metal-views - events");

var EVENTS = Object.keys(events);

EVENTS.forEach(function(EVENT) {
  test(EVENT, function() {
    expect(3);

    var calls = 0;
    var view = {
      isView: true,
      innerHTML: '<div><input type="text"></div>'
    };
    view[events[EVENT]] = function(e) {
      calls++;
    };

    appendTo(view);
    equalHTML('qunit-fixture', '<div><div><input type="text"></div></div>');

    triggerEvent(view.element, EVENT);
    equal(calls, 1, EVENT + " event handler was called");
    triggerEvent(view.element.querySelector('input'), EVENT);
    equal(calls, 2, EVENT + " event handler was called twice");

    subject().destroy(view);
  });
});

test("keyUp", function() {
  expect(5);

  var keyUpCalls = 0;

  var view = {
    isView: true,
    innerHTML: '<div><input type="text"></div>',

    keyUp: function(e) {
      keyUpCalls++;
      equal(e.keyCode, 38, "Key code was correct");
    }
  };

  appendTo(view);
  equalHTML('qunit-fixture', '<div><div><input type="text"></div></div>');

  triggerEvent(view.element, 'keyup', {keyCode: 38});
  equal(keyUpCalls, 1, "Event handler was called");
  triggerEvent(view.element.querySelector('input'), 'keyup', {keyCode: 38});
  equal(keyUpCalls, 2, "Event handler was called twice");

  subject().destroy(view);
});

// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var TestState, statechart, expectedEvents;

module("Statechart Event Queuing", {
  setup: function() {
    TestState = SC.State.extend({
      _handledEvents: null,

      init: function() {
        sc_super();
        this.reset();
      },

      reset: function() {
        this.set('_handledEvents', []);
      }
    });

    statechart = SC.Statechart.create({

      rootState: TestState.extend({

        initialSubstate: 'a',

        eventA: function() {
          this._handledEvents.push('eventA');
        },

        eventB: function() {
          this._handledEvents.push('eventB');

          statechart.gotoState('b');
        },

        eventC: function() {
          this._handledEvents.push('eventC');
        },

        a: TestState.extend({

        }),

        b: TestState.extend({
          enterState: function() {
            statechart.sendEvent('eventC');
          }
        }),

        c: TestState.extend({
          enterState: function() {
            statechart.sendEvent('eventA');
            stop();
            return this.performAsync('asyncFunction');
          },

          asyncFunction: function() {
            var self = this;
            setTimeout(function() {
              statechart.sendEvent('eventC');
            }, 100);
            setTimeout(function() {
              var rootState = statechart.get('rootState');
              self.resumeGotoState();
              same(rootState._handledEvents, expectedEvents, 'expected events were handled');
              start();
            }, 500);
          }
        })

      })

    });

    statechart.initStatechart();
  },

  teardown: function() {
    statechart.destroy();
    statechart = null;
  }
});

test("Events are sent even when queued during state transitions", function() {
  var rootState = statechart.get('rootState'),
      stateA = statechart.getState('a'),
      stateB = statechart.getState('b');

  statechart.sendEvent('eventA');
  equals(rootState._handledEvents.contains('eventA'), true, 'eventA was handled');

  rootState.reset();
  statechart.sendEvent('eventB');
  same(rootState._handledEvents, ['eventB', 'eventC'], 'eventB and eventC were handled');

  rootState.reset();
  expectedEvents = ['eventA', 'eventC'];
  statechart.gotoState('c');
});

import isEnabled from 'ember-metal/features';
import require from 'require';

let events;
if (isEnabled('ember-test-helpers-fire-native-events')) {
  events = require('ember-testing/events/_native');
} else {
  events = require('ember-testing/events/_jquery');
}

export const focus = events.focus;
export const fireEvent = events.fireEvent;

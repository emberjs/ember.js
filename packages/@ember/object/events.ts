import {
  addListener as originalAddListener,
  removeListener as originalRemoveListener,
  sendEvent as originalSendEvent,
} from '@ember/-internals/metal';
import { deprecateFunc } from '@ember/debug';

export const addListener = deprecateFunc(
  '`addListener is deprecated',
  {
    for: 'ember-source',
    id: 'ember-object-add-listener',
    since: { available: '6.8.0' },
    until: '7.0.0',
  },
  originalAddListener
);

export const removeListener = deprecateFunc(
  '`removeListener is deprecated',
  {
    for: 'ember-source',
    id: 'ember-object-remove-listener',
    since: { available: '6.8.0' },
    until: '7.0.0',
  },
  originalRemoveListener
);

export const sendEvent = deprecateFunc(
  '`sendEvent is deprecated',
  {
    for: 'ember-source',
    id: 'ember-object-send-event',
    since: { available: '6.8.0' },
    until: '7.0.0',
  },
  originalSendEvent
);

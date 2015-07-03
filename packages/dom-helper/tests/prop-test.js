import { normalizeProperty } from 'dom-helper/prop';

QUnit.module('dom-helper prop');

test('type.attr, for element props that for one reason or another need to be treated as attrs', function() {
  expect(12);

  [
    { tagName: 'TEXTAREA', key: 'form' },
    { tagName: 'BUTTON',   key: 'type' },
    { tagName: 'INPUT',    key: 'type' },
    { tagName: 'INPUT',    key: 'list' },
    { tagName: 'INPUT',    key: 'form' },
    { tagName: 'OPTION',   key: 'form' },
    { tagName: 'INPUT',    key: 'form' },
    { tagName: 'BUTTON',   key: 'form' },
    { tagName: 'LABEL',    key: 'form' },
    { tagName: 'FIELDSET', key: 'form' },
    { tagName: 'LEGEND',   key: 'form' },
    { tagName: 'OBJECT',   key: 'form' }
  ].forEach((pair) => {
    var element = {
      tagName: pair.tagName
    };

    Object.defineProperty(element, pair.key, {
      set() { throw new Error('I am a bad browser!'); }
    });

    deepEqual(normalizeProperty(element, pair.key), {
      normalized: pair.key,
      type: 'attr'
    }, ` ${pair.tagName}.${pair.key}`);
  });
});

var TAG_EVENT_PAIRS = [
  { tagName: 'form', key: 'onsubmit' },
  { tagName: 'form', key: 'onSubmit' },
  { tagName: 'form', key: 'ONSUBMIT' },
  { tagName: 'video', key: 'canplay' },
  { tagName: 'video', key: 'canPlay' },
  { tagName: 'video', key: 'CANPLAY' }
];

test('type.eventHandlers should all be props: Chrome', function() {
  expect(6);
  TAG_EVENT_PAIRS.forEach((pair) => {
    var element = {
      tagName: pair.tagName
    };

    Object.defineProperty(element, pair.key, {
      set() { },
      get() { }
    });

    deepEqual(normalizeProperty(element, pair.key), {
      normalized: pair.key,
      type: 'prop'
    }, ` ${pair.tagName}.${pair.key}`);
  });
});


test('type.eventHandlers should all be props: Safari style (which has screwed up stuff)', function() {
  expect(24);

  TAG_EVENT_PAIRS.forEach((pair) => {
    var parent = {
      tagName: pair.tagName
    };

    Object.defineProperty(parent, pair.key, {
      set: undefined,
      get: undefined
    });

    var element = Object.create(parent);

    ok(Object.getOwnPropertyDescriptor(element, pair.key) === undefined, 'ensure we mimic silly safari');
    ok(Object.getOwnPropertyDescriptor(parent, pair.key).set === undefined, 'ensure we mimic silly safari');

    var { normalized, type } = normalizeProperty(element, pair.key);

    equal(normalized, pair.key, `normalized: ${pair.tagName}.${pair.key}`);
    equal(type, 'prop', `type: ${pair.tagName}.${pair.key}`);
  });
});

import {
  // VM
  DynamicScope,
} from "@glimmer/runtime";

import {
  Dict,
  Opaque,
  assign,
  dict
} from '@glimmer/util';

import {
  PathReference
} from "@glimmer/reference";

import { Unique } from "@glimmer/interfaces";

export type _ = Unique<any>;

export class TestDynamicScope implements DynamicScope {
  private bucket: any;

  constructor(bucket = null) {
    if (bucket) {
      this.bucket = assign({}, bucket);
    } else {
      this.bucket = {};
    }
  }

  get(key: string): PathReference<Opaque> {
    return this.bucket[key];
  }

  set(key: string, reference: PathReference<Opaque>) {
    return this.bucket[key] = reference;
  }

  child(): TestDynamicScope {
    return new TestDynamicScope(this.bucket);
  }
}

export function inspectHooks<T>(ComponentClass: T): T {
  return (ComponentClass as any).extend({
    init(this: any) {
      this._super(...arguments);
      this.hooks = {
        didInitAttrs: 0,
        didUpdateAttrs: 0,
        didReceiveAttrs: 0,
        willInsertElement: 0,
        willUpdate: 0,
        willRender: 0,
        didInsertElement: 0,
        didUpdate: 0,
        didRender: 0
      };
    },

    didInitAttrs(this: any) {
      this._super(...arguments);
      this.hooks['didInitAttrs']++;
    },

    didUpdateAttrs(this: any) {
      this._super(...arguments);
      this.hooks['didUpdateAttrs']++;
    },

    didReceiveAttrs(this: any) {
      this._super(...arguments);
      this.hooks['didReceiveAttrs']++;
    },

    willInsertElement(this: any) {
      this._super(...arguments);
      this.hooks['willInsertElement']++;
    },

    willUpdate(this: any) {
      this._super(...arguments);
      this.hooks['willUpdate']++;
    },

    willRender(this: any) {
      this._super(...arguments);
      this.hooks['willRender']++;
    },

    didInsertElement(this: any) {
      this._super(...arguments);
      this.hooks['didInsertElement']++;
    },

    didUpdate(this: any) {
      this._super(...arguments);
      this.hooks['didUpdate']++;
    },

    didRender(this: any) {
      this._super(...arguments);
      this.hooks['didRender']++;
    }
  });
}

export function equalsElement(element: Element | null, tagName: string, attributes: Object, content: string) {
  if (element === null) {
    QUnit.assert.pushResult({
      result: false,
      actual: element,
      expected: true,
      message: `failed - expected element to not be null`
    });
    return;
  }

  QUnit.assert.pushResult({
    result: element.tagName === tagName.toUpperCase(),
    actual: element.tagName.toLowerCase(),
    expected: tagName,
    message: `expect tagName to be ${tagName}`
  });

  let expectedAttrs: Dict<Matcher> = dict<Matcher>();

  let expectedCount = 0;
  for (let prop in attributes) {
    expectedCount++;
    let expected = attributes[prop];

    let matcher: Matcher = typeof expected === 'object' && MATCHER in expected ? expected : equalsAttr(expected);
    expectedAttrs[prop] = matcher;

    QUnit.assert.pushResult({
      result: expectedAttrs[prop].match(element && element.getAttribute(prop)),
      actual: matcher.fail(element && element.getAttribute(prop)),
      expected: matcher.fail(element && element.getAttribute(prop)),
      message: `Expected element's ${prop} attribute ${matcher.expected()}`
    });
  }

  let actualAttributes = {};
  if (element) {
    for (let i = 0, l = element.attributes.length; i < l; i++) {
      actualAttributes[element.attributes[i].name] = element.attributes[i].value;
    }
  }

  if (!(element instanceof HTMLElement)) {
        QUnit.assert.pushResult({
          result: element instanceof HTMLElement,
          actual: null,
          expected: null,
          message: "Element must be an HTML Element, not an SVG Element"
        });
  } else {
    QUnit.assert.pushResult({
      result: element.attributes.length === expectedCount,
      actual: element.attributes.length,
      expected: expectedCount,
      message: `Expected ${expectedCount} attributes; got ${element.outerHTML}`
    });

    if (content !== null) {
      QUnit.assert.pushResult({
        result: element.innerHTML === content,
        actual: element.innerHTML,
        expected: content,
        message: `The element had '${content}' as its content`
      });
    }
  }
}

interface Matcher {
  "3d4ef194-13be-4ccf-8dc7-862eea02c93e": boolean;
  match(actual: any): boolean;
  fail(actual: any): string;
  expected(): string;
}

export const MATCHER = "3d4ef194-13be-4ccf-8dc7-862eea02c93e";

export function equalsAttr(expected: any) {
  return {
    "3d4ef194-13be-4ccf-8dc7-862eea02c93e": true,
    match(actual: any) {
      return expected === actual;
    },

    expected() {
      return `to equal ${expected}`;
    },

    fail(actual: any) {
      return `${actual} did not equal ${expected}`;
    }
  };
}

export function equals<T>(expected: T) {
  return {
    "3d4ef194-13be-4ccf-8dc7-862eea02c93e": true,
    match(actual: T) {
      return expected === actual;
    },

    expected() {
      return `to equal ${expected}`;
    },

    fail(actual: T) {
      return `${actual} did not equal ${expected}`;
    }
  };
}

export function regex(r: RegExp) {
  return {
    "3d4ef194-13be-4ccf-8dc7-862eea02c93e": true,
    match(v: string) {
      return r.test(v);
    },
    expected() {
      return `to match ${r}`;
    },
    fail(actual: string) {
      return `${actual} did not match ${r}`;
    }
  };
}

export function classes(expected: string) {
  return {
    "3d4ef194-13be-4ccf-8dc7-862eea02c93e": true,
    match(actual: string) {
      return actual && (expected.split(' ').sort().join(' ') === actual.split(' ').sort().join(' '));
    },
    expected() {
      return `to include '${expected}'`;
    },
    fail(actual: string) {
      return `'${actual}'' did not match '${expected}'`;
    }
  };
}

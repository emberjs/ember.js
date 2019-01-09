import { Dict, Unique } from '@glimmer/interfaces';
import { dict } from '@glimmer/util';
import { SimpleElement } from '@simple-dom/interface';
import { EmberishCurlyComponentFactory } from './environment/components/emberish-curly';
import { EmberishGlimmerComponentFactory } from './environment/components/emberish-glimmer';

export type _ = Unique<any>;

export function inspectHooks<
  T extends EmberishCurlyComponentFactory | EmberishGlimmerComponentFactory
>(ComponentClass: T): T {
  return (class extends (ComponentClass as any) {
    init() {
      super.init();

      this.hooks = {
        didInitAttrs: 0,
        didUpdateAttrs: 0,
        didReceiveAttrs: 0,
        willInsertElement: 0,
        willUpdate: 0,
        willRender: 0,
        didInsertElement: 0,
        didUpdate: 0,
        didRender: 0,
      };
    }

    didInitAttrs(this: any) {
      this._super(...arguments);
      this.hooks['didInitAttrs']++;
    }

    didUpdateAttrs(this: any) {
      this._super(...arguments);
      this.hooks['didUpdateAttrs']++;
    }

    didReceiveAttrs(this: any) {
      this._super(...arguments);
      this.hooks['didReceiveAttrs']++;
    }

    willInsertElement(this: any) {
      this._super(...arguments);
      this.hooks['willInsertElement']++;
    }

    willUpdate(this: any) {
      this._super(...arguments);
      this.hooks['willUpdate']++;
    }

    willRender(this: any) {
      this._super(...arguments);
      this.hooks['willRender']++;
    }

    didInsertElement(this: any) {
      this._super(...arguments);
      this.hooks['didInsertElement']++;
    }

    didUpdate(this: any) {
      this._super(...arguments);
      this.hooks['didUpdate']++;
    }

    didRender(this: any) {
      this._super(...arguments);
      this.hooks['didRender']++;
    }
  } as any) as T;
}

export interface DebugElement {
  element: SimpleElement | null;
  description: string;
}

function isDebugElement(el: SimpleElement | DebugElement): el is DebugElement {
  return !(el as Dict).nodeType;
}

export type EqualsElement = SimpleElement | null | DebugElement;

function extract(element: EqualsElement): DebugElement {
  if (element === null) {
    return { element: null, description: 'element' };
  } else if (isDebugElement(element)) {
    return element;
  } else {
    return { element, description: 'element' };
  }
}

export function equalsElement(
  input: EqualsElement,
  tagName: string,
  attributes: Dict,
  content: string | null
) {
  let { element, description } = extract(input);

  if (element === null) {
    QUnit.assert.pushResult({
      result: false,
      actual: element,
      expected: true,
      message: `failed - expected ${description} to not be null`,
    });
    return;
  }

  QUnit.assert.pushResult({
    result: element.tagName === tagName.toUpperCase(),
    actual: element.tagName.toLowerCase(),
    expected: tagName,
    message: `expect ${description}'s tagName to be ${tagName}`,
  });

  let expectedAttrs: Dict<Matcher> = dict<Matcher>();

  let expectedCount = 0;
  for (let prop in attributes) {
    expectedCount++;
    let expected = attributes[prop];

    let matcher: Matcher = isMatcher(expected) ? expected : equalsAttr(expected);
    expectedAttrs[prop] = matcher;

    QUnit.assert.pushResult({
      result: expectedAttrs[prop].match(element && element.getAttribute(prop)),
      actual: matcher.fail(element && element.getAttribute(prop)),
      expected: matcher.fail(element && element.getAttribute(prop)),
      message: `Expected ${description}'s ${prop} attribute ${matcher.expected()}`,
    });
  }

  let actualAttributes = dict();
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
      message: 'Element must be an HTML Element, not an SVG Element',
    });
  } else {
    QUnit.assert.pushResult({
      result: element.attributes.length === expectedCount,
      actual: element.attributes.length,
      expected: expectedCount,
      message: `Expected ${expectedCount} attributes; got ${element.outerHTML}`,
    });

    if (content !== null) {
      QUnit.assert.pushResult({
        result: element.innerHTML === content,
        actual: element.innerHTML,
        expected: content,
        message: `${description} had '${content}' as its content`,
      });
    }
  }
}

interface Matcher {
  '3d4ef194-13be-4ccf-8dc7-862eea02c93e': boolean;
  match(actual: any): boolean;
  fail(actual: any): string;
  expected(): string;
}

export const MATCHER = '3d4ef194-13be-4ccf-8dc7-862eea02c93e';

export function isMatcher(input: unknown): input is Matcher {
  if (typeof input !== 'object' || input === null) return false;
  return MATCHER in input;
}

export function equalsAttr(expected: any): Matcher {
  return {
    '3d4ef194-13be-4ccf-8dc7-862eea02c93e': true,
    match(actual: any) {
      return expected === actual;
    },

    expected() {
      return `to equal ${expected}`;
    },

    fail(actual: any) {
      return `${actual} did not equal ${expected}`;
    },
  };
}

export function equals<T>(expected: T) {
  return {
    '3d4ef194-13be-4ccf-8dc7-862eea02c93e': true,
    match(actual: T) {
      return expected === actual;
    },

    expected() {
      return `to equal ${expected}`;
    },

    fail(actual: T) {
      return `${actual} did not equal ${expected}`;
    },
  };
}

export function regex(r: RegExp) {
  return {
    '3d4ef194-13be-4ccf-8dc7-862eea02c93e': true,
    match(v: string) {
      return r.test(v);
    },
    expected() {
      return `to match ${r}`;
    },
    fail(actual: string) {
      return `${actual} did not match ${r}`;
    },
  };
}

export function classes(expected: string) {
  return {
    '3d4ef194-13be-4ccf-8dc7-862eea02c93e': true,
    match(actual: string) {
      return (
        actual &&
        expected
          .split(' ')
          .sort()
          .join(' ') ===
          actual
            .split(' ')
            .sort()
            .join(' ')
      );
    },
    expected() {
      return `to include '${expected}'`;
    },
    fail(actual: string) {
      return `'${actual}'' did not match '${expected}'`;
    },
  };
}

import type { Template } from './core';

import { splat } from './attributes';
import { marker, template } from './core';
import { yieldTo } from './control-flow';

const ELEMENTS = new Map<string, Template>();

/**
 * `(element "h1")`: a component that renders its block in an element with
 * the given tag name (or without an element, for `""`).
 */
export function element(tagName: unknown): Template {
  if (typeof tagName !== 'string') {
    throw new Error(
      `The argument passed to the \`element\` helper must be a string (you passed \`${String(tagName)}\`)`
    );
  }

  let existing = ELEMENTS.get(tagName);
  if (existing) return existing;

  let created = template((b, ctx) => {
    let doc = b.root.document;
    let fragment = doc.createDocumentFragment();
    let anchor = marker(b.root);

    if (tagName === '') {
      fragment.appendChild(anchor);
    } else {
      let el = doc.createElement(tagName);
      splat(b, el, ctx);
      el.appendChild(anchor);
      fragment.appendChild(el);
    }

    yieldTo(b, anchor, ctx, 'default', []);
    return fragment;
  });

  ELEMENTS.set(tagName, created);
  return created;
}

import { registerDestructor } from '@glimmer/destroyable';
import { createCache, getValue, isConst } from '@glimmer/validator/lib/tracking';

import type { Block, Ctx, Thunk } from './core';

const XHTML = 'http://www.w3.org/1999/xhtml';

/**
 * These are set as properties, because the attribute only controls the
 * *initial* state of the element.
 */
const PROPERTIES = new Set(['value', 'checked', 'selected', 'indeterminate', 'muted']);

const SANITIZED_TAGS = new Set(['A', 'BODY', 'LINK', 'IMG', 'IFRAME', 'BASE', 'FORM']);
const SANITIZED_ATTRS = new Set(['href', 'src', 'background', 'action']);
const BAD_PROTOCOLS = new Set(['javascript:', 'vbscript:']);

function normalizeAttrValue(value: unknown): string | null {
  if (value === false || value === undefined || value === null) return null;
  if (value === true) return '';
  if (typeof value === 'function') return null;
  if (typeof (value as { toString?: unknown }).toString !== 'function') return null;
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- same as the VM
  return String(value);
}

function sanitize(element: Element, name: string, value: string | null): string | null {
  if (value === null || !SANITIZED_TAGS.has(element.tagName) || !SANITIZED_ATTRS.has(name)) {
    return value;
  }

  let protocol: string;
  try {
    protocol = new URL(value, 'http://localhost').protocol;
  } catch {
    return value;
  }

  return BAD_PROTOCOLS.has(protocol) ? `unsafe:${value}` : value;
}

type Setter = (value: unknown) => void;

function setterFor(element: Element, name: string): Setter {
  if (element.namespaceURI === XHTML && PROPERTIES.has(name) && name in element) {
    return (value) => {
      (element as unknown as Record<string, unknown>)[name] =
        value === null || value === undefined ? (name === 'value' ? '' : false) : value;
    };
  }

  return (value) => {
    let normalized = sanitize(element, name, normalizeAttrValue(value));
    if (normalized === null) {
      element.removeAttribute(name);
    } else {
      element.setAttribute(name, normalized);
    }
  };
}

/**
 * Binds a value to `setter`. `value` is either a static value (a string, for
 * static attributes that need ordering relative to `...attributes`) or a thunk.
 */
function bind(b: Block, value: unknown, setter: Setter): void {
  if (typeof value !== 'function') {
    setter(value);
    return;
  }

  let cache = createCache(value as Thunk);
  let current = getValue(cache);
  setter(current);

  if (isConst(cache)) return;

  b.updaters.push(() => {
    let next = getValue(cache);
    if (next !== current) {
      current = next;
      setter(next);
    }
  });
}

interface ClassState {
  parts: string[];
}

const CLASSES = new WeakMap<Element, ClassState>();

/**
 * `class` is special: every source of classes for an element (its static
 * class, dynamic class bindings, and classes from `...attributes`) is merged.
 */
function classPart(b: Block, element: Element, value: unknown): void {
  let state = CLASSES.get(element);
  if (!state) {
    state = { parts: [] };
    let existing = element.getAttribute('class');
    if (existing) state.parts.push(existing);
    CLASSES.set(element, state);
  }

  let { parts } = state;
  let index = parts.length;
  parts.push('');

  bind(b, value, (next) => {
    parts[index] = normalizeAttrValue(next) ?? '';
    let className = parts.filter(Boolean).join(' ');
    if (className) {
      element.setAttribute('class', className);
    } else {
      element.removeAttribute('class');
    }
  });
}

export function attr(b: Block, element: Element, name: string, value: unknown): void {
  if (name === 'class') {
    classPart(b, element, value);
  } else {
    bind(b, value, setterFor(element, name));
  }
}

/**
 * `...attributes`
 */
export function splat(b: Block, element: Element, ctx: Ctx): void {
  ctx.attrs?.(b, element);
}

/**
 * The `{{on}}` modifier, specialized at compile time.
 *
 * The handler is read when the event fires, so changing it never requires
 * re-binding the listener.
 */
export function listen(
  b: Block,
  element: Element,
  eventName: string,
  handler: Thunk,
  options?: AddEventListenerOptions
): void {
  let cache = createCache(handler);
  let listener = (event: Event) => {
    let fn = getValue(cache);
    if (typeof fn === 'function') {
      return (fn as (event: Event) => unknown)(event);
    }
    throw new Error(
      `You must pass a function as the second argument to the \`on\` modifier; you passed ${String(fn)}.`
    );
  };

  element.addEventListener(eventName, listener, options);
  registerDestructor(b, () => {
    element.removeEventListener(eventName, listener, options);
  });
}

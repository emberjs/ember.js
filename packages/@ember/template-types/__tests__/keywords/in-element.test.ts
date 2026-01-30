import { emitComponent, NamedArgsMarker, resolve } from '../../-private/dsl';
import { InElementKeyword } from '../../-private/keywords';

const inElementKeyword = resolve({} as InElementKeyword);

declare const element: HTMLElement;
declare const shadow: ShadowRoot;

// Can be invoked with an element
emitComponent(inElementKeyword(element));

// Can be invoked with a ShadowRoot
emitComponent(inElementKeyword(shadow));

// Accepts an `insertBefore` argument
emitComponent(inElementKeyword(element, { insertBefore: null, ...NamedArgsMarker }));
emitComponent(inElementKeyword(element, { insertBefore: undefined, ...NamedArgsMarker }));

// @ts-expect-error: rejects invocation with `undefined`
inElementKeyword();

inElementKeyword(
  // @ts-expect-error: rejects invocation with `null`
  null,
);

inElementKeyword(element, {
  // @ts-expect-error: rejects any other `insertBefore` values
  insertBefore: new HTMLDivElement(),
});

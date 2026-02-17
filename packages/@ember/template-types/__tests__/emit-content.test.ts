import { htmlSafe } from '@ember/template';
import { emitContent } from '../-private/dsl';

type SafeString = ReturnType<typeof htmlSafe>;

// Glimmer's SafeString interface
let safeString = {
  toHTML(): string {
    return '<span>Foo</span>';
  },
} as SafeString;

emitContent(safeString);

// @ember/template's SafeString
emitContent(htmlSafe('<span>Foo</span>'));

emitContent('hi');
emitContent(123);
emitContent(false);
emitContent(undefined);
emitContent(null);

const returnsVoid = (): void => {};

// Using something that returns void at the top level is reasonable
emitContent(returnsVoid());

// Emitting an HTML element inserts that element into the DOM
emitContent(document.createElement('div'));
emitContent(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));

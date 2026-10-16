import './elements';
import { AttrValue } from '../index';
import type { HTMLElementMap, SVGElementMap } from './lib.dom.augmentation';

/**
 * A utility for constructing the type of an environment's `resolveOrReturn` from
 * the type of its `resolve` function.
 */
export type ResolveOrReturn<T> = T & (<U>(item: U) => () => U);

/**
 * Given a tag name, returns an appropriate `Element` subtype.
 * NOTE: This will return a union for elements that exist both in HTML and SVG. Technically, this will be too permissive.
 */
export type ElementForTagName<Name extends string> = Name extends keyof HTMLElementTagNameMap
  ? HTMLElementTagNameMap[Name]
  : Element;

export type SVGElementForTagName<Name extends string> = Name extends keyof SVGElementTagNameMap
  ? SVGElementTagNameMap[Name]
  : Element;

export type MathMlElementForTagName<Name extends string> =
  Name extends keyof MathMLElementTagNameMap ? MathMLElementTagNameMap[Name] : Element;

/**
 * This doesn't generate _totally_ unique mappings, but they all have the same attributes.
 *
 * For example, given T = HTMLDivElement,
 * we get back:
 *   - "HTMLTableCaptionElement"
 *     | "HTMLDivElement"
 *     | "HTMLHeadingElement"
 *     | "HTMLParagraphElement"
 *
 * And for the purposes of attribute lookup, that's good enough.
 */
type HTMLElementLookup<T> = {
  [K in keyof HTMLElementMap]: T extends HTMLElementMap[K]
    ? HTMLElementMap[K] extends T
      ? K
      : never
    : never;
}[keyof HTMLElementMap];

type SVGElementLookup<T> = {
  [K in keyof SVGElementMap]: T extends SVGElementMap[K]
    ? SVGElementMap[K] extends T
      ? K
      : never
    : never;
}[keyof SVGElementMap];

type WithDataAttributes<T> = T & Record<`data-${string}`, AttrValue>;

export type AttributesForElement<T extends Element> = T extends HTMLElement
  ? WithDataAttributes<GlintHtmlElementAttributesMap[HTMLElementLookup<T>]>
  : T extends SVGElement
    ? WithDataAttributes<GlintSvgElementAttributesMap[SVGElementLookup<T>]>
    : Record<string, AttrValue>;

/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { expectTypeOf } from 'expect-type';
import type { AttributesForElement } from '../../-private/dsl';

/**
 * Protect against accidental undefined showing up in the generated maps
 */
{
  // This can happen if we mess up the "type" in bin/build-elements.mjs
  // @ts-expect-error
  type X = GlintHtmlElementAttributesMap['undefined'];

  // This can happen if we mess up the "type" in bin/build-elements.mjs
  // @ts-expect-error
  type Y = GlintSvgElementAttributesMap['undefined'];
}

/**
 * HTMLElement
 */
{
  type AttributeMap = AttributesForElement<HTMLElement>;
  type Attributes = keyof AttributeMap & string;
  type ExpectedAttributes = keyof GlobalHTMLAttributes & string;
  expectTypeOf<Attributes>().toEqualTypeOf<`data-${string}` | ExpectedAttributes>();

  type AttributeKeys = keyof SVGSVGElementAttributes & string;
  expectTypeOf<AttributeKeys>().toBeString();
  expectTypeOf<'version' | 'fill'>().toExtend<AttributeKeys>();
}

{
  type Attributes = keyof AttributesForElement<HTMLImageElement>;
  expectTypeOf<Attributes>().toEqualTypeOf<`data-${string}` | keyof HTMLImageElementAttributes>();

  type AttributeKeys = keyof HTMLImageElementAttributes & string;
  expectTypeOf<AttributeKeys>().toBeString();
  expectTypeOf<'alt' | 'src'>().toExtend<AttributeKeys>();
}

{
  type Attributes = keyof AttributesForElement<HTMLDivElement> & string;
  expectTypeOf<Attributes>().toEqualTypeOf<`data-${string}` | keyof HTMLDivElementAttributes>();

  type AttributeKeys = keyof HTMLDivElementAttributes & string;
  expectTypeOf<AttributeKeys>().toBeString();
  expectTypeOf<'aria-label'>().toExtend<AttributeKeys>();
}

/**
 * NOTE: SVGElement !== SVGSVGElement
 *
 *       ^ SVGElement is the interface for all SVG elements
 */
{
  type AttributeMap = AttributesForElement<SVGElement>;
  type Attributes = keyof AttributeMap & string;
  type ExpectedAttributes = keyof GlobalSVGAttributes & string;
  expectTypeOf<Attributes>().toEqualTypeOf<`data-${string}` | ExpectedAttributes>();

  type AttributeKeys = keyof SVGSVGElementAttributes & string;
  expectTypeOf<AttributeKeys>().toBeString();
  expectTypeOf<'version' | 'fill'>().toExtend<AttributeKeys>();
}

/**
 * <svg> | SVGSVGElement
 */
{
  type AttributeMap = AttributesForElement<SVGSVGElement>;
  type Attributes = keyof AttributeMap & string;
  type ExpectedAttributes = keyof SVGSVGElementAttributes & string;
  expectTypeOf<Attributes>().toEqualTypeOf<`data-${string}` | ExpectedAttributes>();

  type AttributeKeys = keyof SVGSVGElementAttributes & string;
  expectTypeOf<AttributeKeys>().toBeString();
  expectTypeOf<'version' | 'fill'>().toExtend<AttributeKeys>();
}

/**
 * <rect> | SVGRectElement
 */
{
  type AttributeMap = AttributesForElement<SVGRectElement>;
  type Attributes = keyof AttributeMap & string;
  type ExpectedAttributes = keyof SVGRectElementAttributes & string;
  expectTypeOf<Attributes>().toEqualTypeOf<`data-${string}` | ExpectedAttributes>();

  type AttributeKeys = keyof SVGRectElementAttributes & string;
  expectTypeOf<AttributeKeys>().toBeString();
  expectTypeOf<'fill'>().toExtend<AttributeKeys>();
}

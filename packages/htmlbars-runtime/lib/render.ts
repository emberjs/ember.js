import { Dict, voidMap } from 'htmlbars-util';
import Template, { TemplateBuilder } from './template';
import {
  Morph,
  ContentMorph,
  EmptyableMorph,
  Bounds,
  HasParentNode,
  clear,
  renderIntoBounds
} from './morph';
import { InternedString } from 'htmlbars-util';
import { Frame } from './environment';

interface RenderResultOptions {
	morph: ContentMorph,
	locals: InternedString[],
	morphs: Morph[],
	bounds: Bounds,
	template: Template
}

export class RenderResult implements Bounds {
  morph: ContentMorph;
  frame: Frame;
  morphs: Morph[];
  bounds: Bounds;
  template: Template;

  constructor(options: RenderResultOptions) {
    let { morph, locals, morphs, bounds, template } = options;

    this.morph = morph;
    this.morphs = morphs;
    this.bounds = bounds;
    this.template = template;
    this.frame = morph.frame;
  }

  parentElement(): Element {
    return this.bounds.parentElement();
  }

  firstNode(): Node {
    return this.bounds.firstNode();
  }

  lastNode(): Node {
    return this.bounds.lastNode();
  }

  rerender() {
    this.morphs.forEach(morph => morph.update());
  }
}

type ManualAttribute = string | any[];

export function manualElement(tagName: string, attributes: Dict<ManualAttribute>, _isEmpty: boolean) {
  let b = new TemplateBuilder();
  b.openElement(tagName);

  for (let key in attributes) {
    if (typeof attributes[key] === 'string') {
      b.staticAttr(key, <string>attributes[key]);
    } else {
      b.dynamicAttr(key, b.specExpr(<any[]>attributes[key]));
    }
  }

  let isEmpty = _isEmpty || voidMap[tagName];
  if (!isEmpty) {
    b.inline('yield');
  }

  b.closeElement();

  return b.template();
}

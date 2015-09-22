import { Dict, voidMap } from 'htmlbars-util';
import Template, { TemplateBuilder } from './template';
import {
  Morph,
  MorphList,
  Bounds,
  HasParentNode,
  clear,
  renderIntoBounds
} from './morph';
import { InternedString } from 'htmlbars-util';
import { Frame } from './environment';

interface RenderResultOptions {
	morph: HasParentNode,
	locals: InternedString[],
	morphs: MorphList,
	bounds: Bounds,
  frame: Frame,
	template: Template
}

export class RenderResult implements Bounds {
  morph: HasParentNode;
  frame: Frame;
  morphs: MorphList;
  bounds: Bounds;
  template: Template;

  constructor(options: RenderResultOptions) {
    let { morph, locals, morphs, frame, bounds, template } = options;

    this.morph = morph;
    this.morphs = morphs;
    this.bounds = bounds;
    this.template = template;
    this.frame = frame;
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

  renderTemplate(template: Template): RenderResult {
    if (template === this.template) {
      this.rerender();
      return this;
    } else {
      return renderIntoBounds(template, this, this.morph, this.frame);
    }
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

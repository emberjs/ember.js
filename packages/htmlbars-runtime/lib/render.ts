import { Dict, voidMap } from 'htmlbars-util';
import Template, { TemplateBuilder } from './template';
import { Morph, MorphList, Bounds, HasParentNode, clear } from './morph';
import { InternedString } from 'htmlbars-util';

interface RenderResultOptions {
	morph: HasParentNode,
	locals: InternedString[],
	morphs: MorphList,
	bounds: Bounds,
	template: Template
}

export class RenderResult implements Bounds {
  morph: HasParentNode;
  morphs: MorphList;
  bounds: Bounds;
  template: Template;

  constructor(options: RenderResultOptions) {
    let { morph, locals, morphs, bounds, template } = options;

    this.morph = morph;
    this.morphs = morphs;
    this.bounds = bounds;
    this.template = template;
  }

  parentNode(): Node {
    return this.bounds.parentNode();
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
      this.morph.nextSibling = clear(this);
      let result = template.evaluate(this.morph, this.morph.frame)
      this.morph.nextSibling = null;
      return result;
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

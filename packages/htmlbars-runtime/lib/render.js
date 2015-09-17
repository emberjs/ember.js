import voidMap from '../htmlbars-util/void-tag-names';
import { TemplateBuilder } from './template';

//let svgNamespace = 'http://www.w3.org/2000/svg';

export function primeNamespace(env) {
  env.dom.detectNamespace(env.parentNode);
}

export class RenderResult {
  static build(morph, frame, template) {
    let { morphs, bounds } = template.evaluate(morph, frame);
    let locals = template.locals;

    let result = RenderResult.fromEvalResult({ morph, locals, morphs, bounds, template });
    return result;
  }

  static fromEvalResult({ morph, locals, morphs, bounds, template }) {
    return new RenderResult({ morph, locals, morphs, bounds, template });
  }

  constructor({ morph, locals, morphs, bounds, template }) {
    this.morph = morph;
    this.locals = locals;
    this.morphs = morphs;
    this.bounds = bounds;
    this.template = template;
  }

  renderTemplate(template) {
    if (template === this.template) {
      this.revalidate();
      return this;
    } else {
      this.morph.nextSibling = this._clear();
      let result = RenderResult.build(this.morph, this.morph._frame, template);
      this.morph.nextSibling = null;
      return result;
    }
  }

  revalidate() {
    this.morphs.forEach(morph => morph.update());
  }

  rerender() {
    this.morphs.forEach(morph => morph.update());
  }

  _clear() {
    let { first, last, parent } = this.bounds;
    let node = first;

    while (node) {
      let next = node.nextSibling;
      parent.removeChild(node);
      if (node === last) return next;
      node = next;
    }

    return null;
  }
}

export function manualElement(tagName, attributes, _isEmpty) {
  let b = new TemplateBuilder();
  b.openElement(tagName);

  for (let key in attributes) {
    if (typeof attributes[key] === 'string') {
      b.staticAttr(key, attributes[key]);
    } else {
      b.dynamicAttr(key, b.specExpr(attributes[key]));
    }
  }

  let isEmpty = _isEmpty || voidMap[tagName];
  if (!isEmpty) {
    b.inline('yield');
  }

  b.closeElement();

  return b.template();
}

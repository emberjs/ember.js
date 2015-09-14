import voidMap from '../htmlbars-util/void-tag-names';
import { TemplateBuilder } from './template';

//let svgNamespace = 'http://www.w3.org/2000/svg';

export function primeNamespace(env) {
  env.dom.detectNamespace(env.parentNode);
}

export class RenderResult {
  static build(morph, frame, template) {
    let dynamicMorphs = template.evaluate(morph, frame);
    let locals = template.locals;

    let result = RenderResult.fromEvalResult(frame, locals, dynamicMorphs);
    return result;
  }

  static fromEvalResult(frame, locals, morphs) {
    return new RenderResult({ frame, locals, morphs });
  }

  constructor({ frame, locals, morphs }) {
    this.frame = frame;
    this.locals = locals;
    this.morphs = morphs;
  }

  revalidate() {
    this.morphs.forEach(morph => morph.update());
  }

  rerender() {
    this.morphs.forEach(morph => morph.update());
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

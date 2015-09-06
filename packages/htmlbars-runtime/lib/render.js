import statementVisitor, { alwaysDirtyVisitor, initialVisitor } from './node-visitor';
import Morph from './morph';
import { clearMorph } from '../htmlbars-util/template-utils';
import voidMap from '../htmlbars-util/void-tag-names';
import { TemplateBuilder } from './template';

//let svgNamespace = 'http://www.w3.org/2000/svg';

export function primeNamespace(env, contextualElement) {
  let dom = env.dom;
  dom.detectNamespace(contextualElement);
}

export class RenderResult {
  static build(morph, env, scope, template) {
    let evalResult = template.evaluate(morph, { env, scope, visitor: initialVisitor });
    let locals = template.locals;

    let result = RenderResult.fromEvalResult(scope, locals, evalResult);
    morph.applyResult(result);
    return result;
  }

  static fromEvalResult(scope, locals, { statements, morphs }) {
    return new RenderResult({ scope, locals, statements, morphs });
  }

  constructor({ scope, locals, statements, morphs }) {
    this.scope = scope;
    this.locals = locals;
    this.statements = statements;
    this.morphs = morphs;
  }

  revalidate(env, self, blockArguments, hostOptions) {
    this.revalidateWith(env, self, blockArguments, statementVisitor, hostOptions);
  }

  rerender(env, self, blockArguments, hostOptions) {
    this.revalidateWith(env, self, blockArguments, alwaysDirtyVisitor, hostOptions);
  }

  revalidateWith(env, self, blockArguments, visitor, hostOptions) {
    if (!this.statements) { return; }

    env.hooks.updateScope(env, this.scope, self, this.locals, blockArguments, hostOptions);

    this.statements.forEach((statement, i) => {
      visitor(statement, this.morphs[i], env, this.scope, visitor);
    });
  }

  // TODO: Does this need to exist?
  destroy(env) {
    let rootNode = this.root;
    clearMorph(rootNode, env, true);
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

export const EMPTY_RENDER_RESULT = new RenderResult({
  scope: undefined,
  locals: undefined,
  statements: undefined,
  morphs: undefined
});

function initializeNode(node, owner) {
  node.ownerNode = owner;
}

// TODO: morph.createChild or somesuch; this doesn't actually work
export function createChildMorph(dom, parentMorph, contextualElement) {
  let morph = Morph.empty(dom, contextualElement || parentMorph.contextualElement);
  morph.ownerNode = parentMorph.ownerNode;
  morph.parentMorph = morph;
  initializeNode(morph, parentMorph.ownerNode);
  return morph;
}

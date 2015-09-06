import statementVisitor, { alwaysDirtyVisitor, initialVisitor } from './node-visitor';
import Morph from './morph';
import { clearMorph } from '../htmlbars-util/template-utils';
import { debugStruct as struct } from '../htmlbars-util/object-utils';
import * as types from '../htmlbars-util/object-utils';
import voidMap from '../htmlbars-util/void-tag-names';
import { TemplateBuilder } from './template';

//let svgNamespace = 'http://www.w3.org/2000/svg';

export function primeNamespace(env, contextualElement) {
  let dom = env.dom;
  dom.detectNamespace(contextualElement);
}

export const RenderOptions = struct({
  renderNode: types.OBJECT,
  self: types.ANY,
  blocks: types.OBJECT(undefined),
  blockArguments: types.OBJECT(undefined),
  contextualElement: types.OBJECT,
  isEmpty: types.BOOLEAN
});

export class RenderResult {
  static build(morph, env, scope, template, options) {
    let evalResult = template.evaluate(morph, { env, scope, visitor: initialVisitor });
    options.isEmpty = evalResult.statements.length === 0;

    let result = new RenderResult({ env, scope, options, evalResult, locals: template.locals });
    morph.lastResult = result;
    morph.rendered = true;
    morph.childNodes = evalResult.morphs;

    return result;
  }

  constructor({ env, scope, options, evalResult, locals }) {
    this.isEmpty = options.isEmpty;
    this.evalResult = evalResult;
    this.locals = locals;
    this.scope = scope;
  }

  revalidate(env, self, blockArguments, scope) {
    this.revalidateWith(env, scope, self, blockArguments, statementVisitor);
  }

  rerender(env, self, blockArguments, scope) {
    this.revalidateWith(env, scope, self, blockArguments, alwaysDirtyVisitor);
  }

  revalidateWith(env, scope, self, blockArguments, visitor) {
    if (this.isEmpty) { return; }

    if (scope !== undefined) { this.scope = scope; }

    if (self !== undefined) { updateSelf(env, this.scope, self); }
    if (blockArguments !== undefined) { updateLocals(env, this.scope, this.template.locals, blockArguments); }

    let { statements, morphs } = this.evalResult;
    statements.forEach((statement, i) => {
      statement.evaluate(morphs[i], env, this.scope, visitor);
    });
  }

  // TODO: Does this need to exist?
  destroy(env) {
    if (this.isEmpty) { return; }
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


function updateSelf(env, scope, self) {
  env.hooks.updateSelf(env, scope, self);
}

function updateLocals(env, scope, localNames, blockArguments) {
  for (let i=0, l=localNames.length; i<l; i++) {
    env.hooks.updateLocal(env, scope, localNames[i], blockArguments[i]);
  }
}

export const EMPTY_RENDER_RESULT = new RenderResult({
  env: undefined,
  scope: undefined,
  options: new RenderOptions({ isEmpty: true }),
  morph: undefined,
  evalResult: undefined,
  template: undefined
});

function initializeNode(node, owner) {
  node.ownerNode = owner;
}

// TODO: morph.createChild or somesuch; this doesn't actually work
export function createChildMorph(dom, parentMorph, contextualElement) {
  let morph = Morph.empty(dom, contextualElement || parentMorph.contextualElement);
  initializeNode(morph, parentMorph.ownerNode);
  return morph;
}


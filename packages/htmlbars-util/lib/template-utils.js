import { visitChildren } from "../htmlbars-util/morph-utils";
import { RenderOptions } from "../htmlbars-runtime/render";

export class Block {
  constructor({ scope, template }) {
    this.scope = scope;
    this.template = template;
  }

  invoke(env, blockArguments, self, morph, _parentScope, visitor) {
    if (morph.lastResult) {
      morph.lastResult.revalidateWith(env, undefined, self, blockArguments, visitor);
    } else {
      this._firstRender(morph, env, blockArguments, self);
    }
  }

  _firstRender(morph, env, blockArguments, self) {
    let { template, scope } = this;

    if (self !== undefined || template.arity) {
      scope = env.hooks.createChildScope(scope);
      env.hooks.setupScope(env, scope, self, template.locals, blockArguments);
    }

    template.renderIn(env, scope, new RenderOptions({ renderNode: morph, blockArguments, self }));
  }
}

export function finishRender(morph, env, renderState) {
  var morphMap = morph.morphMap;

  // Walk the morph list, clearing any items that were yielded in a previous
  // render but were not yielded during this render.
  let morphList = renderState.morphListToPrune;
  if (morphList) {
    let handledMorphs = renderState.handledMorphs;
    let item = morphList.firstChildMorph;

    while (item) {
      let next = item.nextMorph;

      // If we don't see the key in handledMorphs, it wasn't
      // yielded in and we can safely remove it from DOM.
      if (!(item.key in handledMorphs)) {
        delete morphMap[item.key];
        clearMorph(item, env, true);
        item.destroy();
      }

      item = next;
    }
  }

  morphList = renderState.morphListToClear;
  if (morphList) {
    clearMorphList(morphList, morph, env);
  }

  let toClear = renderState.morphToClear;
  if (toClear) {
    clearMorph(toClear, env);
  }
}

export function clearMorph(morph, env, destroySelf) {
  var cleanup = env.hooks.cleanupRenderNode;
  var destroy = env.hooks.destroyRenderNode;
  var willCleanup = env.hooks.willCleanupTree;
  var didCleanup = env.hooks.didCleanupTree;

  function destroyNode(node) {
    if (cleanup) { cleanup(node); }
    if (destroy) { destroy(node); }
  }

  if (willCleanup) { willCleanup(env, morph, destroySelf); }
  if (cleanup) { cleanup(morph); }
  if (destroySelf && destroy) { destroy(morph); }

  visitChildren(morph.childNodes, destroyNode);

  // TODO: Deal with logical children that are not in the DOM tree
  morph.clear();
  if (didCleanup) { didCleanup(env, morph, destroySelf); }

  morph.lastResult = null;
  morph.lastYielded = null;
  morph.childNodes = null;
}

export function clearMorphList(morphList, morph, env) {
  let item = morphList.firstChildMorph;

  while (item) {
    let next = item.nextMorph;
    delete morph.morphMap[item.key];
    clearMorph(item, env, true);
    item.destroy();

    item = next;
  }

  // Remove the MorphList from the morph.
  morphList.clear();
  morph.morphList = null;
}

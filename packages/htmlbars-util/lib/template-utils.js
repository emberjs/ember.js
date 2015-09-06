import { visitChildren } from "../htmlbars-util/morph-utils";
import { struct } from "../htmlbars-util/object-utils";
import * as types from "../htmlbars-util/object-utils";

export const BlockOptions = struct({
  env: types.OBJECT,
  blockArguments: types.ARRAY(undefined),
  self: types.ANY,
  hostOptions: types.OBJECT,
  morph: types.OBJECT,
  parentScope: types.OBJECT,
  visitor: types.FUNCTION
});

export class Block {
  static withHostOptions({ scope, template }, hostOptions) {
    let block = new Block({ scope, template });
    block.hostOptions = hostOptions;
    return block;
  }

  constructor({ scope, template }) {
    this.scope = scope;
    this.template = template;

    // host options are passed to setupScope and updateScope, and their
    // presence triggers customSetupScope and customUpdateScope
    this.hostOptions = null;
  }

  invoke({ env, self, blockArguments, morph, visitor }) {
    if (morph.lastResult) {
      morph.lastResult.revalidateWith(env, self, blockArguments, visitor);
    } else {
      this._firstRender(morph, env, blockArguments, self);
    }
  }

  _firstRender(morph, env, blockArguments, self) {
    let { template, scope, hostOptions } = this;

    if (self !== undefined || template.arity || hostOptions) {
      scope = env.hooks.createChildScope(scope);
      env.hooks.setupScope(env, scope, self, template.locals, blockArguments, hostOptions);
    }

    template.renderIn(morph, env, scope);
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
  morph.emptyForRerender();

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

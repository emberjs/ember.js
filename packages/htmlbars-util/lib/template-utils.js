import { visitChildren } from "../htmlbars-util/morph-utils";
import { RenderOptions } from "../htmlbars-runtime/render";

export function RenderState(renderNode, morphList) {
  // The morph list that is no longer needed and can be
  // destroyed.
  this.morphListToClear = morphList;

  // The morph list that needs to be pruned of any items
  // that were not yielded on a subsequent render.
  this.morphListToPrune = null;

  // A map of morphs for each item yielded in during this
  // rendering pass. Any morphs in the DOM but not in this map
  // will be pruned during cleanup.
  this.handledMorphs = {};
  this.collisions = undefined;

  // The morph to clear once rendering is complete. By
  // default, we set this to the previous morph (to catch
  // the case where nothing is yielded; in that case, we
  // should just clear the morph). Otherwise this gets set
  // to null if anything is rendered.
  this.morphToClear = renderNode;

  this.shadowOptions = null;
}

function Block(render, template, blockOptions) {
  this.render = render;
  this.template = template;
  this.blockOptions = blockOptions;
  this.arity = template.arity;
}

Block.prototype.invoke = function(env, blockArguments, self, renderNode, parentScope, visitor) {
  if (renderNode.lastResult) {
    renderNode.lastResult.revalidateWith(env, undefined, self, blockArguments, visitor);
  } else {
    this._firstRender(env, blockArguments, self, renderNode, parentScope);
  }
};

Block.prototype._firstRender = function(env, blockArguments, self, renderNode, parentScope) {
  let options = { renderState: new RenderState(renderNode) };
  let { render, template, blockOptions: { scope } } = this;
  let shadowScope = scope ? env.hooks.createChildScope(scope) : env.hooks.createFreshScope();

  env.hooks.bindShadowScope(env, parentScope, shadowScope, this.blockOptions.options);

  if (self !== undefined) {
    env.hooks.bindSelf(env, shadowScope, self);
  } else if (this.blockOptions.self !== undefined) {
    env.hooks.bindSelf(env, shadowScope, this.blockOptions.self);
  }

  bindBlocks(env, shadowScope, this.blockOptions.yieldTo);

  renderAndCleanup(renderNode, env, options, null, function() {
    options.renderState.morphToClear = null;
    let renderOptions = new RenderOptions(renderNode, undefined, blockArguments);
    render(template, env, shadowScope, renderOptions);
  });
};

export function blockFor(render, template, blockOptions) {
  return new Block(render, template, blockOptions);
}

function bindBlocks(env, shadowScope, blocks) {
  if (!blocks) {
    return;
  }
  if (blocks instanceof Block) {
    env.hooks.bindBlock(env, shadowScope, blocks);
  } else {
    for (var name in blocks) {
      if (blocks.hasOwnProperty(name)) {
        env.hooks.bindBlock(env, shadowScope, blocks[name], name);
      }
    }
  }
}

export function renderAndCleanup(morph, env, options, shadowOptions, callback) {
  // The RenderState object is used to collect information about what the
  // helper or hook being invoked has yielded. Once it has finished either
  // yielding multiple items (via yieldItem) or a single template (via
  // yieldTemplate), we detect what was rendered and how it differs from
  // the previous render, cleaning up old state in DOM as appropriate.
  var renderState = options.renderState;
  renderState.collisions = undefined;
  renderState.shadowOptions = shadowOptions;

  // Invoke the callback, instructing it to save information about what it
  // renders into RenderState.
  var result = callback(options);

  // The hook can opt-out of cleanup if it handled cleanup itself.
  if (result && result.handled) {
    return;
  }

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

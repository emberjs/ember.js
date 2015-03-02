import { visitChildren } from "../htmlbars-util/morph-utils";

export function blockFor(render, template, blockOptions) {
  return function(env, blockArguments, renderNode, parentScope, visitor) {
    if (renderNode.lastResult) {
      renderNode.lastResult.revalidateWith(env, undefined, undefined, blockArguments, visitor);
    } else {
      var options = { renderState: { morphListStart: null, clearMorph: renderNode, shadowOptions: null } };

      var scope = blockOptions.scope;
      var shadowScope = scope ? env.hooks.createChildScope(scope) : env.hooks.createFreshScope();

      env.hooks.bindShadowScope(env, parentScope, shadowScope, blockOptions.options);

      if (blockOptions.self !== undefined) {
        env.hooks.bindSelf(env, shadowScope, blockOptions.self);
      }

      env.hooks.bindBlock(env, shadowScope, blockOptions.yieldTo);

      renderAndCleanup(renderNode, env, options, null, visitor, function() {
        options.renderState.clearMorph = null;
        render(template, env, shadowScope, { renderNode: renderNode, blockArguments: blockArguments });
      });
    }
  };
}

export function renderAndCleanup(morph, env, options, shadowOptions, visitor, callback) {
  options.renderState.shadowOptions = shadowOptions;
  callback(options);

  var item = options.renderState.morphListStart;
  var toClear = options.renderState.clearMorph;
  var morphMap = morph.morphMap;

  while (item) {
    var next = item.nextMorph;
    delete morphMap[item.key];
    if (env.hooks.cleanup) { visitChildren([item], env.hooks.cleanup); }
    item.destroy();
    item = next;
  }

  if (toClear) {
    clearMorph(toClear, env.hooks.cleanup);
  }
}

export function clearMorph(morph, cleanup) {
  if (cleanup) {
    visitChildren(morph.childNodes, cleanup);
  }

  // TODO: Deal with logical children that are not in the DOM tree
  morph.clear();
  morph.lastResult = null;
  morph.lastYielded = null;
  morph.childNodes = null;
}


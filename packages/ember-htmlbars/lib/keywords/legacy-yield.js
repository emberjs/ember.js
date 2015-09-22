import ProxyStream from 'ember-metal/streams/proxy-stream';

export default function legacyYield(morph, env, _scope, params, hash, template, inverse, visitor) {
  let scope = _scope;
  let block = scope.getBlock('default');

  if (block.arity === 0) {
    // Typically, the `controller` local is persists through lexical scope.
    // However, in this case, the `{{legacy-yield}}` in the legacy each view
    // needs to override the controller local for the template it is yielding.
    // This megahaxx allows us to override the controller, and most importantly,
    // prevents the downstream scope from attempting to bind the `controller` local.
    if (hash.controller) {
      scope = env.hooks.createChildScope(scope);
      scope.bindLocal('controller', new ProxyStream(hash.controller, 'controller'));
      scope.overrideController = true;
    }
    block.invoke(env, [], params[0], morph, scope, visitor);
  } else {
    block.invoke(env, params, undefined, morph, scope, visitor);
  }

  return true;
}

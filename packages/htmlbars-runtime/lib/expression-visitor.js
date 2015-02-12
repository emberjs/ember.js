export default {
  accept: function(node, morph, env, scope, template) {
    // Primitive literals are unambiguously non-array representations of
    // themselves.
    if (typeof node !== 'object') {
      return node;
    }

    var type = node[0];
    return this[type](node, morph, env, scope, template);
  },

  acceptArray: function(nodes, morph, env, scope, template) {
    return nodes.map(function(node) {
      return this.accept(node, morph, env, scope, template);
    }, this);
  },

  acceptObject: function(pairs, morph, env, scope, template) {
    var object = {};

    for (var i=0, l=pairs.length; i<l; i += 2) {
      object[pairs[i]] = this.accept(pairs[i+1], morph, env, scope, template);
    }

    return object;
  },

  // [ 'get', path ]
  get: function(node, morph, env, scope) {
    return env.hooks.get(morph, env, scope, node[1]);
  },

  // [ 'subexpr', path, params, hash ]
  subexpr: function(node, morph, env, scope, template) {
    var path = node[1], params = node[2], hash = node[3];
    return env.hooks.subexpr(morph, env, scope, path,
                             this.acceptArray(params, morph, env, scope, template),
                             this.acceptObject(hash, morph, env, scope, template));
  },

  // [ 'concat', parts ]
  concat: function(node, morph, env, scope, template) {
    return env.hooks.concat(morph, env,
                            this.acceptArray(node[1], morph, env, scope, template));
  },

  // [ 'block', path, params, hash, templateId, inverseId ]
  block: function(node, morph, env, scope, template) {
    var path = node[1], params = node[2], hash = node[3], templateId = node[4], inverseId = node[5];
    return env.hooks.block(morph, env, scope, path,
                           this.acceptArray(params, morph, env, scope, template),
                           this.acceptObject(hash, morph, env, scope, template),
                           templateId === null ? null : template.templates[templateId],
                           inverseId === null ? null : template.templates[inverseId]);
  },

  // [ 'inline', path, params, hash ]
  inline: function(node, morph, env, scope, template) {
    var path = node[1], params = node[2], hash = node[3];
    return env.hooks.inline(morph, env, scope, path,
                            this.acceptArray(params, morph, env, scope, template),
                            this.acceptObject(hash, morph, env, scope, template));
  },

  // [ 'content', path ]
  content: function(node, morph, env, scope) {
    return env.hooks.content(morph, env, scope, node[1]);
  },

  // [ 'element', path, params, hash ]
  element: function(node, morph, env, scope, template) {
    var path = node[1], params = node[2], hash = node[3];
    return env.hooks.element(morph, env, scope, path,
                             this.acceptArray(params, morph, env, scope, template),
                             this.acceptObject(hash, morph, env, scope, template));
  },

  // [ 'attribute', name, value ]
  attribute: function(node, morph, env, scope, template) {
    return env.hooks.attribute(morph, env, node[1],
                               this.accept(node[2], morph, env, scope, template));
  },

  // [ 'component', path, attrs, templateId ]
  component: function(node, morph, env, scope, template) {
    var path = node[1], attrs = node[2], templateId = node[3];
    return env.hooks.component(morph, env, scope,
                               path,
                               this.acceptObject(attrs, morph, env, scope, template),
                               template.templates[templateId]);
  }
};

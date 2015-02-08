export default {
  accept: function(node, morph, context, env, template) {
    // Primitive literals are unambiguously non-array representations of
    // themselves.
    if (typeof node !== 'object') {
      return node;
    }

    var type = node[0];
    return this[type](node, morph, context, env, template);
  },

  acceptArray: function(nodes, morph, context, env, template) {
    return nodes.map(function(node) {
      return this.accept(node, morph, context, env, template);
    }, this);
  },

  acceptObject: function(pairs, morph, context, env, template) {
    var object = {};

    for (var i=0, l=pairs.length; i<l; i += 2) {
      object[pairs[i]] = this.accept(pairs[i+1], morph, context, env, template);
    }

    return object;
  },

  // [ 'get', path ]
  get: function(node, morph, context, env) {
    return env.hooks.get(env, morph, context, node[1]);
  },

  // [ 'subexpr', path, params, hash ]
  subexpr: function(node, morph, context, env, template) {
    var path = node[1], params = node[2], hash = node[3];
    return env.hooks.subexpr(env, morph, context, path,
                             this.acceptArray(params, morph, context, env, template),
                             this.acceptObject(hash, morph, context, env, template));
  },

  // [ 'concat', parts ]
  concat: function(node, morph, context, env, template) {
    return env.hooks.concat(env, morph,
                            this.acceptArray(node[1], morph, context, env, template));
  },

  // [ 'block', path, params, hash, templateId, inverseId ]
  block: function(node, morph, context, env, template) {
    var path = node[1], params = node[2], hash = node[3], templateId = node[4], inverseId = node[5];
    return env.hooks.block(env, morph, context, path,
                           this.acceptArray(params, morph, context, env, template),
                           this.acceptObject(hash, morph, context, env, template),
                           templateId === null ? null : template.templates[templateId],
                           inverseId === null ? null : template.templates[inverseId]);
  },

  // [ 'inline', path, params, hash ]
  inline: function(node, morph, context, env, template) {
    var path = node[1], params = node[2], hash = node[3];
    return env.hooks.inline(env, morph, context, path,
                            this.acceptArray(params, morph, context, env, template),
                            this.acceptObject(hash, morph, context, env, template));
  },

  // [ 'content', path ]
  content: function(node, morph, context, env) {
    return env.hooks.content(env, morph, context, node[1]);
  },

  // [ 'element', path, params, hash ]
  element: function(node, morph, context, env, template) {
    var path = node[1], params = node[2], hash = node[3];
    return env.hooks.element(env, morph, context, path,
                             this.acceptArray(params, morph, context, env, template),
                             this.acceptObject(hash, morph, context, env, template));
  },

  // [ 'attribute', name, value ]
  attribute: function(node, morph, context, env, template) {
    return env.hooks.attribute(env, morph, node[1],
                               this.accept(node[2], morph, context, env, template));
  },

  // [ 'component', path, attrs, templateId ]
  component: function(node, morph, context, env, template) {
    var path = node[1], attrs = node[2], templateId = node[3];
    return env.hooks.component(env, morph, context,
                               path,
                               this.acceptObject(attrs, morph, context, env, template),
                               template.templates[templateId]);
  }
};

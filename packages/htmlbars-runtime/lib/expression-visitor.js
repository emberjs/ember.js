import { merge } from "../htmlbars-util/object-utils";
import { validateChildMorphs, linkParams } from "../htmlbars-util/morph-utils";

/**
  Node classification:

  # Primary Statement Nodes:

  These nodes are responsible for a render node that represents a morph-range.

  * block
  * inline
  * content
  * element
  * component

  # Leaf Statement Nodes:

  This node is responsible for a render node that represents a morph-attr.

  * attribute

  # Expression Nodes:

  These nodes are not directly responsible for any part of the DOM, but are
  eventually passed to a Statement Node.

  * get
  * subexpr
  * concat
*/

var base = {
  acceptExpression: function(node, env, scope) {
    var ret = { value: null };

    // Primitive literals are unambiguously non-array representations of
    // themselves.
    if (typeof node !== 'object' || node === null) {
      ret.value = node;
      return ret;
    }

    switch(node[0]) {
      // can be used by manualElement
      case 'value': ret.value = node[1]; break;
      case 'get': ret.value = this.get(node, env, scope); break;
      case 'subexpr': ret.value = this.subexpr(node, env, scope); break;
      case 'concat': ret.value = this.concat(node, env, scope); break;
    }

    return ret;
  },

  acceptParams: function(nodes, env, scope) {
    var arr = new Array(nodes.length);

    for (var i=0, l=nodes.length; i<l; i++) {
      arr[i] = this.acceptExpression(nodes[i], env, scope).value;
    }

    return arr;
  },

  acceptHash: function(pairs, env, scope) {
    var object = {};

    for (var i=0, l=pairs.length; i<l; i += 2) {
      object[pairs[i]] = this.acceptExpression(pairs[i+1], env, scope).value;
    }

    return object;
  },

  // [ 'get', path ]
  get: function(node, env, scope) {
    return env.hooks.get(env, scope, node[1]);
  },

  // [ 'subexpr', path, params, hash ]
  subexpr: function(node, env, scope) {
    var path = node[1], params = node[2], hash = node[3];
    return env.hooks.subexpr(env, scope, path,
                             this.acceptParams(params, env, scope),
                             this.acceptHash(hash, env, scope));
  },

  // [ 'concat', parts ]
  concat: function(node, env, scope) {
    return env.hooks.concat(env, this.acceptParams(node[1], env, scope));
  },

  linkParamsAndHash: function(env, scope, morph, path, params, hash) {
    if (morph.linkedParams) {
      params = morph.linkedParams.params;
      hash = morph.linkedParams.hash;
    } else {
      params = params && this.acceptParams(params, env, scope);
      hash = hash && this.acceptHash(hash, env, scope);
    }

    linkParams(env, scope, morph, path, params, hash);
    return [params, hash];
  }
};

export var AlwaysDirtyVisitor = merge(Object.create(base), {
  // [ 'block', path, params, hash, templateId, inverseId ]
  block: function(node, morph, env, scope, template, visitor) {
    var path = node[1], params = node[2], hash = node[3], templateId = node[4], inverseId = node[5];
    var paramsAndHash = this.linkParamsAndHash(env, scope, morph, path, params, hash);

    morph.isDirty = morph.isSubtreeDirty = false;
    env.hooks.block(morph, env, scope, path, paramsAndHash[0], paramsAndHash[1],
                           templateId === null ? null : template.templates[templateId],
                           inverseId === null ? null : template.templates[inverseId],
                           visitor);
  },

  // [ 'inline', path, params, hash ]
  inline: function(node, morph, env, scope, visitor) {
    var path = node[1], params = node[2], hash = node[3];
    var paramsAndHash = this.linkParamsAndHash(env, scope, morph, path, params, hash);

    morph.isDirty = morph.isSubtreeDirty = false;
    env.hooks.inline(morph, env, scope, path, paramsAndHash[0], paramsAndHash[1], visitor);
  },

  // [ 'content', path ]
  content: function(node, morph, env, scope, visitor) {
    var path = node[1];

    morph.isDirty = morph.isSubtreeDirty = false;

    if (isHelper(env, scope, path)) {
      env.hooks.inline(morph, env, scope, path, [], {}, visitor);
      if (morph.linkedResult) {
        linkParams(env, scope, morph, '@content-helper', [morph.linkedResult], null);
      }
      return;
    }

    var params;
    if (morph.linkedParams) {
      params = morph.linkedParams.params;
    } else {
      params = [env.hooks.get(env, scope, path)];
    }

    linkParams(env, scope, morph, '@range', params, null);
    env.hooks.range(morph, env, scope, path, params[0], visitor);
  },

  // [ 'element', path, params, hash ]
  element: function(node, morph, env, scope, visitor) {
    var path = node[1], params = node[2], hash = node[3];
    var paramsAndHash = this.linkParamsAndHash(env, scope, morph, path, params, hash);

    morph.isDirty = morph.isSubtreeDirty = false;
    env.hooks.element(morph, env, scope, path, paramsAndHash[0], paramsAndHash[1], visitor);
  },

  // [ 'attribute', name, value ]
  attribute: function(node, morph, env, scope) {
    var name = node[1], value = node[2];
    var paramsAndHash = this.linkParamsAndHash(env, scope, morph, '@attribute', [value], null);

    morph.isDirty = morph.isSubtreeDirty = false;
    env.hooks.attribute(morph, env, scope, name, paramsAndHash[0][0]);
  },

  // [ 'component', path, attrs, templateId, inverseId ]
  component: function(node, morph, env, scope, template, visitor) {
    var path = node[1], attrs = node[2], templateId = node[3], inverseId = node[4];
    var paramsAndHash = this.linkParamsAndHash(env, scope, morph, path, [], attrs);
    var templates = {
      default: template.templates[templateId],
      inverse: template.templates[inverseId]
    };

    morph.isDirty = morph.isSubtreeDirty = false;
    env.hooks.component(morph, env, scope, path, paramsAndHash[0], paramsAndHash[1],
                        templates, visitor);
  },

  // [ 'attributes', template ]
  attributes: function(node, morph, env, scope, parentMorph, visitor) {
    let template = node[1];
    env.hooks.attributes(morph, env, scope, template, parentMorph, visitor);
  }
});

export default merge(Object.create(base), {
  // [ 'block', path, params, hash, templateId, inverseId ]
  block: function(node, morph, env, scope, template, visitor) {
    dirtyCheck(env, morph, visitor, function(visitor) {
      AlwaysDirtyVisitor.block(node, morph, env, scope, template, visitor);
    });
  },

  // [ 'inline', path, params, hash ]
  inline: function(node, morph, env, scope, visitor) {
    dirtyCheck(env, morph, visitor, function(visitor) {
      AlwaysDirtyVisitor.inline(node, morph, env, scope, visitor);
    });
  },

  // [ 'content', path ]
  content: function(node, morph, env, scope, visitor) {
    dirtyCheck(env, morph, visitor, function(visitor) {
      AlwaysDirtyVisitor.content(node, morph, env, scope, visitor);
    });
  },

  // [ 'element', path, params, hash ]
  element: function(node, morph, env, scope, template, visitor) {
    dirtyCheck(env, morph, visitor, function(visitor) {
      AlwaysDirtyVisitor.element(node, morph, env, scope, template, visitor);
    });
  },

  // [ 'attribute', name, value ]
  attribute: function(node, morph, env, scope, template) {
    dirtyCheck(env, morph, null, function() {
      AlwaysDirtyVisitor.attribute(node, morph, env, scope, template);
    });
  },

  // [ 'component', path, attrs, templateId ]
  component: function(node, morph, env, scope, template, visitor) {
    dirtyCheck(env, morph, visitor, function(visitor) {
      AlwaysDirtyVisitor.component(node, morph, env, scope, template, visitor);
    });
  },

  // [ 'attributes', template ]
  attributes: function(node, morph, env, scope, parentMorph, visitor) {
    AlwaysDirtyVisitor.attributes(node, morph, env, scope, parentMorph, visitor);
  }
});

function dirtyCheck(_env, morph, visitor, callback) {
  var isDirty = morph.isDirty;
  var isSubtreeDirty = morph.isSubtreeDirty;
  var env = _env;

  if (isSubtreeDirty) {
    visitor = AlwaysDirtyVisitor;
  }

  if (isDirty || isSubtreeDirty) {
    callback(visitor);
  } else {
    if (morph.buildChildEnv) {
      env = morph.buildChildEnv(morph.state, env);
    }
    validateChildMorphs(env, morph, visitor);
  }
}

function isHelper(env, scope, path) {
  return (env.hooks.keywords[path] !== undefined) || env.hooks.hasHelper(env, scope, path);
}

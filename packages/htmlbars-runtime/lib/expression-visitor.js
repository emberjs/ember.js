import { merge, createObject } from "../htmlbars-util/object-utils";

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
  accept: function(node, morph, env, scope, template, visitor) {
    // Primitive literals are unambiguously non-array representations of
    // themselves.
    if (typeof node !== 'object') {
      return node;
    }

    switch(node[0]) {
      case 'get': return this.get(node, morph, env, scope);
      case 'subexpr': return this.subexpr(node, morph, env, scope);
      case 'concat': return this.concat(node, morph, env, scope);
      case 'block': return this.block(node, morph, env, scope, template, visitor);
      case 'inline': return this.inline(node, morph, env, scope, visitor);
      case 'content': return this.content(node, morph, env, scope, visitor);
      case 'element': return this.element(node, morph, env, scope, template, visitor);
      case 'attribute': return this.attribute(node, morph, env, scope);
      case 'component': return this.component(node, morph, env, scope, template, visitor);
    }
  },

  acceptParams: function(nodes, morph, env, scope, template) {
    if (morph.linkedParams) {
      return morph.linkedParams.params;
    }

    var arr = new Array(nodes.length);

    for (var i=0, l=nodes.length; i<l; i++) {
      arr[i] =  this.accept(nodes[i], morph, env, scope, template);
    }

    return arr;
  },

  acceptHash: function(pairs, morph, env, scope, template) {
    if (morph.linkedParams) {
      return morph.linkedParams.hash;
    }

    var object = {};

    for (var i=0, l=pairs.length; i<l; i += 2) {
      object[pairs[i]] = this.accept(pairs[i+1], morph, env, scope, template);
    }

    return object;
  },

  // [ 'get', path ]
  get: function(node, morph, env, scope) {
    return env.hooks.get(env, scope, node[1]);
  },

  // [ 'subexpr', path, params, hash ]
  subexpr: function(node, morph, env, scope, template) {
    var path = node[1], params = node[2], hash = node[3];
    return env.hooks.subexpr(env, scope, path,
                             this.acceptParams(params, morph, env, scope, template),
                             this.acceptHash(hash, morph, env, scope, template));
  },

  // [ 'concat', parts ]
  concat: function(node, morph, env, scope, template) {
    return env.hooks.concat(env, this.acceptParams(node[1], morph, env, scope, template));
  }
};

export var AlwaysDirtyVisitor = merge(createObject(base), {
  // [ 'block', path, params, hash, templateId, inverseId ]
  block: function(node, morph, env, scope, template, visitor) {
    var path = node[1], params = node[2], hash = node[3], templateId = node[4], inverseId = node[5];
    env.hooks.block(morph, env, scope, path,
                           this.acceptParams(params, morph, env, scope, template),
                           this.acceptHash(hash, morph, env, scope, template),
                           templateId === null ? null : template.templates[templateId],
                           inverseId === null ? null : template.templates[inverseId],
                           visitor);
  },

  // [ 'inline', path, params, hash ]
  inline: function(node, morph, env, scope, template, visitor) {
    var path = node[1], params = node[2], hash = node[3];
    env.hooks.inline(morph, env, scope, path,
                            this.acceptParams(params, morph, env, scope, template),
                            this.acceptHash(hash, morph, env, scope, template),
                            visitor);
  },

  // [ 'content', path ]
  content: function(node, morph, env, scope, visitor) {
    env.hooks.content(morph, env, scope, node[1], visitor);
  },

  // [ 'element', path, params, hash ]
  element: function(node, morph, env, scope, template, visitor) {
    var path = node[1], params = node[2], hash = node[3];
    env.hooks.element(morph, env, scope, path,
                      this.acceptParams(params, morph, env, scope, template),
                      this.acceptHash(hash, morph, env, scope, template),
                      visitor);
  },

  // [ 'attribute', name, value ]
  attribute: function(node, morph, env, scope, template) {
    env.hooks.attribute(morph, env, node[1],
                        this.acceptParams([node[2]], morph, env, scope, template)[0]);
  },

  // [ 'component', path, attrs, templateId ]
  component: function(node, morph, env, scope, template, visitor) {
    var path = node[1], attrs = node[2], templateId = node[3];
    env.hooks.component(morph, env, scope, path,
                        this.acceptHash(attrs, morph, env, scope, template),
                        template.templates[templateId],
                        visitor);
  }
});

function validateChildMorphs(morph, visitor) {
  var morphList = morph.morphList;
  if (morph.morphList) {
    var current = morphList.firstChildMorph;

    while (current) {
      var next = current.nextMorph;
      current.lastResult.revalidateWith(undefined, undefined, visitor);
      current = next;
    }
  } else if (morph.lastResult) {
    morph.lastResult.revalidateWith(undefined, undefined, visitor);
  } else if (morph.childNodes) {
    // This means that the childNodes were wired up manually
    for (var i=0, l=morph.childNodes.length; i<l; i++) {
      validateChildMorphs(morph.childNodes[i], visitor);
    }
  }
}

export default merge(createObject(base), {
  // [ 'block', path, params, hash, templateId, inverseId ]
  block: function(node, morph, env, scope, template, visitor) {
    if (morph.isDirty) {
      this.dirtyBlock(node, morph, env, scope, template, visitor);
      morph.isDirty = false;
    } else {
      validateChildMorphs(morph, visitor);
    }
  },

  dirtyBlock: AlwaysDirtyVisitor.block,

  // [ 'inline', path, params, hash ]
  inline: function(node, morph, env, scope, template, visitor) {
    if (morph.isDirty) {
      this.dirtyInline(node, morph, env, scope, template, visitor);
      morph.isDirty = false;
    } else {
      validateChildMorphs(morph, visitor);
    }
  },

  dirtyInline: AlwaysDirtyVisitor.inline,

  // [ 'content', path ]
  content: function(node, morph, env, scope, visitor) {
    if (morph.isDirty) {
      env.hooks.content(morph, env, scope, node[1], visitor);
      morph.isDirty = false;
    } else {
      validateChildMorphs(morph, visitor);
    }
  },

  // [ 'element', path, params, hash ]
  element: function(node, morph, env, scope, template, visitor) {
    if (morph.isDirty) {
      this.dirtyElement(node, morph, env, scope, template, visitor);
      morph.isDirty = false;
    } else {
      validateChildMorphs(morph, visitor);
    }
  },

  dirtyElement: AlwaysDirtyVisitor.element,

  // [ 'attribute', name, value ]
  attribute: function(node, morph, env, scope, template) {
    if (morph.isDirty) {
      this.dirtyAttribute(node, morph, env, scope, template);
      morph.isDirty = false;
    }
  },

  dirtyAttribute: AlwaysDirtyVisitor.attribute,

  // [ 'component', path, attrs, templateId ]
  component: function(node, morph, env, scope, template, visitor) {
    if (morph.isDirty) {
      this.dirtyComponent(node, morph, env, scope, template, visitor);
      morph.isDirty = false;
    } else {
      validateChildMorphs(morph, visitor);
    }
  },

  dirtyComponent: AlwaysDirtyVisitor.component
});

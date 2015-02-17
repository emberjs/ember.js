import { merge, createObject } from "../htmlbars-util/object-utils";

var base = {
  accept: function(node, morph, env, scope, template) {
    // Primitive literals are unambiguously non-array representations of
    // themselves.
    if (typeof node !== 'object') {
      return node;
    }

    switch(node[0]) {
      case 'get': return this.get(node, morph, env, scope, template);
      case 'subexpr': return this.subexpr(node, morph, env, scope, template);
      case 'concat': return this.concat(node, morph, env, scope, template);
      case 'block': return this.block(node, morph, env, scope, template);
      case 'inline': return this.inline(node, morph, env, scope, template);
      case 'content': return this.content(node, morph, env, scope, template);
      case 'element': return this.element(node, morph, env, scope, template);
      case 'attribute': return this.attribute(node, morph, env, scope, template);
      case 'component': return this.component(node, morph, env, scope, template);
    }
  },

  acceptArray: function(nodes, morph, env, scope, template) {
    var arr = new Array(nodes.length);

    for (var i=0, l=nodes.length; i<l; i++) {
      arr[i] =  this.accept(nodes[i], morph, env, scope, template);
    }

    return arr;
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
    return env.hooks.get(env, scope, node[1]);
  },

  // [ 'subexpr', path, params, hash ]
  subexpr: function(node, morph, env, scope, template) {
    var path = node[1], params = node[2], hash = node[3];
    return env.hooks.subexpr(env, scope, path,
                             this.acceptArray(params, morph, env, scope, template),
                             this.acceptObject(hash, morph, env, scope, template));
  },

  // [ 'concat', parts ]
  concat: function(node, morph, env, scope, template) {
    return env.hooks.concat(env, this.acceptArray(node[1], morph, env, scope, template));
  }
};

export var AlwaysDirtyVisitor = merge(createObject(base), {
  // [ 'block', path, params, hash, templateId, inverseId ]
  block: function(node, morph, env, scope, template) {
    var path = node[1], params = node[2], hash = node[3], templateId = node[4], inverseId = node[5];
    env.hooks.block(morph, env, scope, path,
                           this.acceptArray(params, morph, env, scope, template),
                           this.acceptObject(hash, morph, env, scope, template),
                           templateId === null ? null : template.templates[templateId],
                           inverseId === null ? null : template.templates[inverseId]);
  },

  // [ 'inline', path, params, hash ]
  inline: function(node, morph, env, scope, template) {
    var path = node[1], params = node[2], hash = node[3];
    env.hooks.inline(morph, env, scope, path,
                            this.acceptArray(params, morph, env, scope, template),
                            this.acceptObject(hash, morph, env, scope, template));
  },

  // [ 'content', path ]
  content: function(node, morph, env, scope) {
    env.hooks.content(morph, env, scope, node[1]);
  },

  // [ 'element', path, params, hash ]
  element: function(node, morph, env, scope, template) {
    var path = node[1], params = node[2], hash = node[3];
    env.hooks.element(morph, env, scope, path,
                      this.acceptArray(params, morph, env, scope, template),
                      this.acceptObject(hash, morph, env, scope, template));
  },

  // [ 'attribute', name, value ]
  attribute: function(node, morph, env, scope, template) {
    env.hooks.attribute(morph, env, node[1],
                        this.accept(node[2], morph, env, scope, template));
  },

  // [ 'component', path, attrs, templateId ]
  component: function(node, morph, env, scope, template) {
    var path = node[1], attrs = node[2], templateId = node[3];
    env.hooks.component(morph, env, scope, path,
                        this.acceptObject(attrs, morph, env, scope, template),
                        template.templates[templateId]);
  }
});

export default merge(createObject(base), {
  // [ 'block', path, params, hash, templateId, inverseId ]
  block: function(node, morph, env, scope, template) {
    if (!morph.isDirty) {
      var morphList = morph.morphList;
      if (morph.morphList) {
        var current = morphList.firstChildMorph;

        while (current) {
          var next = current.nextMorph;
          current.lastResult.revalidate();
          current = next;
        }
      } else {
        morph.lastResult.revalidate();
      }
      return;
    }

    this.dirtyBlock(node, morph, env, scope, template);

    morph.isDirty = false;
  },

  dirtyBlock: AlwaysDirtyVisitor.block,

  // [ 'inline', path, params, hash ]
  inline: function(node, morph, env, scope, template) {
    if (!morph.isDirty) { return; }
    this.dirtyInline(node, morph, env, scope, template);
    morph.isDirty = false;
  },

  dirtyInline: AlwaysDirtyVisitor.inline,

  // [ 'content', path ]
  content: function(node, morph, env, scope) {
    if (!morph.isDirty) { return; }
    env.hooks.content(morph, env, scope, node[1]);
    morph.isDirty = false;
  },

  // [ 'element', path, params, hash ]
  element: function(node, morph, env, scope, template) {
    if (!morph.isDirty) { return; }
    this.dirtyElement(node, morph, env, scope, template);
    morph.isDirty = false;
  },

  dirtyElement: AlwaysDirtyVisitor.element,

  // [ 'attribute', name, value ]
  attribute: function(node, morph, env, scope, template) {
    if (!morph.isDirty) { return; }
    this.dirtyAttribute(node, morph, env, scope, template);
    morph.isDirty = false;
  },

  dirtyAttribute: AlwaysDirtyVisitor.attribute,

  // [ 'component', path, attrs, templateId ]
  component: function(node, morph, env, scope, template) {
    if (!morph.isDirty) { return; }
    this.dirtyComponent(node, morph, env, scope, template);
    morph.isDirty = false;
  },

  dirtyComponent: AlwaysDirtyVisitor.component
});

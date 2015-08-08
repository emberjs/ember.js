import { validateChildMorphs, linkParams } from "../htmlbars-util/morph-utils";
import { acceptParams, acceptHash } from "./expression-visitor";

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
*/

function linkParamsAndHash(env, scope, morph, path, params, hash) {
  if (morph.linkedParams) {
    params = morph.linkedParams.params;
    hash = morph.linkedParams.hash;
  } else {
    params = params && acceptParams(params, env, scope);
    hash = hash && acceptHash(hash, env, scope);
  }

  linkParams(env, scope, morph, path, params, hash);
  return [params, hash];
}

export let AlwaysDirtyVisitor = {

  block(node, morph, env, scope, template, visitor) {
    let [, path, params, hash, templateId, inverseId] = node;
    let paramsAndHash = linkParamsAndHash(env, scope, morph, path, params, hash);

    morph.isDirty = morph.isSubtreeDirty = false;
    env.hooks.block(morph, env, scope, path, paramsAndHash[0], paramsAndHash[1],
                           templateId === null ? null : template.templates[templateId],
                           inverseId === null ? null : template.templates[inverseId],
                           visitor);
  },

  inline(node, morph, env, scope, visitor) {
    let [, path, params, hash] = node;
    let paramsAndHash = linkParamsAndHash(env, scope, morph, path, params, hash);

    morph.isDirty = morph.isSubtreeDirty = false;
    env.hooks.inline(morph, env, scope, path, paramsAndHash[0], paramsAndHash[1], visitor);
  },

  content(node, morph, env, scope, visitor) {
    let [, path] = node;

    morph.isDirty = morph.isSubtreeDirty = false;

    if (isHelper(env, scope, path)) {
      env.hooks.inline(morph, env, scope, path, [], {}, visitor);
      if (morph.linkedResult) {
        linkParams(env, scope, morph, '@content-helper', [morph.linkedResult], null);
      }
      return;
    }

    let params;
    if (morph.linkedParams) {
      params = morph.linkedParams.params;
    } else {
      params = [env.hooks.get(env, scope, path)];
    }

    linkParams(env, scope, morph, '@range', params, null);
    env.hooks.range(morph, env, scope, path, params[0], visitor);
  },

  element(node, morph, env, scope, visitor) {
    let [, path, params, hash] = node;
    let paramsAndHash = linkParamsAndHash(env, scope, morph, path, params, hash);

    morph.isDirty = morph.isSubtreeDirty = false;
    env.hooks.element(morph, env, scope, path, paramsAndHash[0], paramsAndHash[1], visitor);
  },

  attribute(node, morph, env, scope) {
    let [, name, value] = node;
    let paramsAndHash = linkParamsAndHash(env, scope, morph, '@attribute', [value], null);

    morph.isDirty = morph.isSubtreeDirty = false;
    env.hooks.attribute(morph, env, scope, name, paramsAndHash[0][0]);
  },

  component(node, morph, env, scope, template, visitor) {
    let [, path, attrs, templateId, inverseId] = node;
    let paramsAndHash = linkParamsAndHash(env, scope, morph, path, [], attrs);
    let templates = {
      default: template.templates[templateId],
      inverse: template.templates[inverseId]
    };

    morph.isDirty = morph.isSubtreeDirty = false;
    env.hooks.component(morph, env, scope, path, paramsAndHash[0], paramsAndHash[1],
                        templates, visitor);
  },

  attributes(node, morph, env, scope, parentMorph, visitor) {
    let [, template] = node;
    env.hooks.attributes(morph, env, scope, template, parentMorph, visitor);
  }

};

export default {
  block(node, morph, env, scope, template, visitor) {
    dirtyCheck(env, morph, visitor, visitor => {
      AlwaysDirtyVisitor.block(node, morph, env, scope, template, visitor);
    });
  },

  inline(node, morph, env, scope, visitor) {
    dirtyCheck(env, morph, visitor, visitor => {
      AlwaysDirtyVisitor.inline(node, morph, env, scope, visitor);
    });
  },

  content(node, morph, env, scope, visitor) {
    dirtyCheck(env, morph, visitor, visitor => {
      AlwaysDirtyVisitor.content(node, morph, env, scope, visitor);
    });
  },

  element(node, morph, env, scope, template, visitor) {
    dirtyCheck(env, morph, visitor, visitor => {
      AlwaysDirtyVisitor.element(node, morph, env, scope, template, visitor);
    });
  },

  attribute(node, morph, env, scope, template) {
    dirtyCheck(env, morph, null, () => {
      AlwaysDirtyVisitor.attribute(node, morph, env, scope, template);
    });
  },

  component(node, morph, env, scope, template, visitor) {
    dirtyCheck(env, morph, visitor, visitor => {
      AlwaysDirtyVisitor.component(node, morph, env, scope, template, visitor);
    });
  },

  attributes(node, morph, env, scope, parentMorph, visitor) {
    AlwaysDirtyVisitor.attributes(node, morph, env, scope, parentMorph, visitor);
  }
};

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

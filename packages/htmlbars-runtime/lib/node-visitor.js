import { validateChildMorphs } from "../htmlbars-util/morph-utils";

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

export function initialVisitor(statement, morph, env, scope, visitor) {
  statement.evaluate(morph, env, scope, visitor);
}

export function alwaysDirtyVisitor(statement, morph, env, scope, visitor) {
  morph.isDirty = morph.isSubtreeDirty = false;
  statement.evaluate(morph, env, scope, visitor);
}

export default function(statement, morph, env, scope, visitor) {
  dirtyCheck(env, morph, visitor, visitor => {
    alwaysDirtyVisitor(statement, morph, env, scope, visitor);
  });
}

function dirtyCheck(_env, morph, visitor, callback) {
  var isDirty = morph.isDirty;
  var isSubtreeDirty = morph.isSubtreeDirty;
  var env = _env;

  if (isSubtreeDirty) {
    callback(alwaysDirtyVisitor);
  } else if (isDirty) {
    callback(visitor);
  } else {
    if (morph.buildChildEnv) {
      env = morph.buildChildEnv(morph.state, env);
    }
    validateChildMorphs(env, morph, visitor);
  }
}


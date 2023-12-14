import { DEBUG } from '@glimmer/env';
import { scheduleDestroyed, scheduleDestroy } from '@glimmer/global-context';
import { debugToString } from '@glimmer/util';

var DestroyingState = /*#__PURE__*/function (DestroyingState) {
  DestroyingState[DestroyingState["Live"] = 0] = "Live";
  DestroyingState[DestroyingState["Destroying"] = 1] = "Destroying";
  DestroyingState[DestroyingState["Destroyed"] = 2] = "Destroyed";
  return DestroyingState;
}(DestroyingState || {});
let DESTROYABLE_META = new WeakMap();
function push(collection, newItem) {
  if (collection === null) {
    return newItem;
  } else if (Array.isArray(collection)) {
    collection.push(newItem);
    return collection;
  } else {
    return [collection, newItem];
  }
}
function iterate(collection, fn) {
  if (Array.isArray(collection)) {
    collection.forEach(fn);
  } else if (collection !== null) {
    fn(collection);
  }
}
function remove(collection, item, message) {
  if (DEBUG) {
    let collectionIsItem = collection === item;
    let collectionContainsItem = Array.isArray(collection) && collection.indexOf(item) !== -1;
    if (!collectionIsItem && !collectionContainsItem) {
      throw new Error(String(message));
    }
  }
  if (Array.isArray(collection) && collection.length > 1) {
    let index = collection.indexOf(item);
    collection.splice(index, 1);
    return collection;
  } else {
    return null;
  }
}
function getDestroyableMeta(destroyable) {
  let meta = DESTROYABLE_META.get(destroyable);
  if (meta === undefined) {
    meta = {
      parents: null,
      children: null,
      eagerDestructors: null,
      destructors: null,
      state: DestroyingState.Live
    };
    if (DEBUG) {
      meta.source = destroyable;
    }
    DESTROYABLE_META.set(destroyable, meta);
  }
  return meta;
}
function associateDestroyableChild(parent, child) {
  if (DEBUG && isDestroying(parent)) {
    throw new Error('Attempted to associate a destroyable child with an object that is already destroying or destroyed');
  }
  let parentMeta = getDestroyableMeta(parent);
  let childMeta = getDestroyableMeta(child);
  parentMeta.children = push(parentMeta.children, child);
  childMeta.parents = push(childMeta.parents, parent);
  return child;
}
function registerDestructor(destroyable, destructor, eager = false) {
  if (DEBUG && isDestroying(destroyable)) {
    throw new Error('Attempted to register a destructor with an object that is already destroying or destroyed');
  }
  let meta = getDestroyableMeta(destroyable);
  let destructorsKey = eager === true ? 'eagerDestructors' : 'destructors';
  meta[destructorsKey] = push(meta[destructorsKey], destructor);
  return destructor;
}
function unregisterDestructor(destroyable, destructor, eager = false) {
  if (DEBUG && isDestroying(destroyable)) {
    throw new Error('Attempted to unregister a destructor with an object that is already destroying or destroyed');
  }
  let meta = getDestroyableMeta(destroyable);
  let destructorsKey = eager === true ? 'eagerDestructors' : 'destructors';
  meta[destructorsKey] = remove(meta[destructorsKey], destructor, DEBUG && 'attempted to remove a destructor that was not registered with the destroyable');
}

////////////

function destroy(destroyable) {
  let meta = getDestroyableMeta(destroyable);
  if (meta.state >= DestroyingState.Destroying) return;
  let {
    parents,
    children,
    eagerDestructors,
    destructors
  } = meta;
  meta.state = DestroyingState.Destroying;
  iterate(children, destroy);
  iterate(eagerDestructors, destructor => destructor(destroyable));
  iterate(destructors, destructor => scheduleDestroy(destroyable, destructor));
  scheduleDestroyed(() => {
    iterate(parents, parent => removeChildFromParent(destroyable, parent));
    meta.state = DestroyingState.Destroyed;
  });
}
function removeChildFromParent(child, parent) {
  let parentMeta = getDestroyableMeta(parent);
  if (parentMeta.state === DestroyingState.Live) {
    parentMeta.children = remove(parentMeta.children, child, DEBUG && "attempted to remove child from parent, but the parent's children did not contain the child. This is likely a bug with destructors.");
  }
}
function destroyChildren(destroyable) {
  let {
    children
  } = getDestroyableMeta(destroyable);
  iterate(children, destroy);
}
function _hasDestroyableChildren(destroyable) {
  let meta = DESTROYABLE_META.get(destroyable);
  return meta === undefined ? false : meta.children !== null;
}
function isDestroying(destroyable) {
  let meta = DESTROYABLE_META.get(destroyable);
  return meta === undefined ? false : meta.state >= DestroyingState.Destroying;
}
function isDestroyed(destroyable) {
  let meta = DESTROYABLE_META.get(destroyable);
  return meta === undefined ? false : meta.state >= DestroyingState.Destroyed;
}

////////////

let enableDestroyableTracking;
let assertDestroyablesDestroyed;
if (DEBUG) {
  let isTesting = false;
  enableDestroyableTracking = () => {
    if (isTesting) {
      // Reset destroyable meta just in case, before throwing the error
      DESTROYABLE_META = new WeakMap();
      throw new Error('Attempted to start destroyable testing, but you did not end the previous destroyable test. Did you forget to call `assertDestroyablesDestroyed()`');
    }
    isTesting = true;
    DESTROYABLE_META = new Map();
  };
  assertDestroyablesDestroyed = () => {
    if (!isTesting) {
      throw new Error('Attempted to assert destroyables destroyed, but you did not start a destroyable test. Did you forget to call `enableDestroyableTracking()`');
    }
    isTesting = false;
    let map = DESTROYABLE_META;
    DESTROYABLE_META = new WeakMap();
    let undestroyed = [];
    map.forEach(meta => {
      if (meta.state !== DestroyingState.Destroyed) {
        undestroyed.push(meta.source);
      }
    });
    if (undestroyed.length > 0) {
      let objectsToString = undestroyed.map(debugToString).join('\n    ');
      let error = new Error(`Some destroyables were not destroyed during this test:\n    ${objectsToString}`);
      error.destroyables = undestroyed;
      throw error;
    }
  };
}

export { _hasDestroyableChildren, assertDestroyablesDestroyed, associateDestroyableChild, destroy, destroyChildren, enableDestroyableTracking, isDestroyed, isDestroying, registerDestructor, unregisterDestructor };

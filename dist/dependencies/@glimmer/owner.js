const OWNER = Symbol('OWNER');
/**
  Framework objects in a Glimmer application may receive an owner object.
  Glimmer is unopinionated about this owner, but will forward it through its
  internal resolution system, and through its managers if it is provided.
*/
function getOwner(object) {
  return object[OWNER];
}

/**
  `setOwner` set's an object's owner
*/
function setOwner(object, owner) {
  object[OWNER] = owner;
}

export { OWNER, getOwner, setOwner };

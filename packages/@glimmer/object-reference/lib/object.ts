import { bump } from "@glimmer/reference";

// import { metaFor } from './meta';
// import { intern } from '@glimmer/util';

export function setProperty(parent: any, property: string, val: any) {
  // let rootProp = metaFor(parent).root().chainFor(property));

  // let referencesToNotify = metaFor(parent).referencesFor(property));

  parent[property] = val;
  bump();

  // if (referencesToNotify) {
  //   referencesToNotify.forEach(function(ref) { ref.notify(); });
  // }

  // if (rootProp) rootProp.notify();
}

export function notifyProperty(_parent: any, _property: string) {
  bump();
  // let rootProp = metaFor(parent).root().chainFor(property));

  // let referencesToNotify = metaFor(parent).referencesFor(property));

  // if (referencesToNotify) {
  //   referencesToNotify.forEach(function(ref) { ref.notify(); });
  // }

  // if (rootProp) rootProp.notify();
}

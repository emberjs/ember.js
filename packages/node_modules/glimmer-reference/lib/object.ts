// import { metaFor } from './meta';
// import { intern } from 'glimmer-util';

export function setProperty(parent: any, property: string, val: any) {
  // let rootProp = metaFor(parent).root().chainFor(intern(property));

  // let referencesToNotify = metaFor(parent).referencesFor(intern(property));

  parent[<string>property] = val;

  // if (referencesToNotify) {
  //   referencesToNotify.forEach(function(ref) { ref.notify(); });
  // }

  // if (rootProp) rootProp.notify();
}

export function notifyProperty(parent: any, property: string) {
  // let rootProp = metaFor(parent).root().chainFor(intern(property));

  // let referencesToNotify = metaFor(parent).referencesFor(intern(property));

  // if (referencesToNotify) {
  //   referencesToNotify.forEach(function(ref) { ref.notify(); });
  // }

  // if (rootProp) rootProp.notify();
}

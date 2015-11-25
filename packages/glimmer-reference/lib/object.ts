import { metaFor } from './meta';
import { intern } from 'htmlbars-util';

export function setProperty(parent: any, property: string, val: any) {
  var rootProp = metaFor(parent).root().chainFor(intern(property));

  var referencesToNotify = metaFor(parent).referencesFor(intern(property));

  parent[<string>property] = val;

  if (referencesToNotify) {
    referencesToNotify.forEach(function(ref) { ref.notify(); });
  }

  if (rootProp) rootProp.notify();
}

export function notifyProperty(parent: any, property: string) {
  var rootProp = metaFor(parent).root().chainFor(intern(property));

  var referencesToNotify = metaFor(parent).referencesFor(intern(property));

  if (referencesToNotify) {
    referencesToNotify.forEach(function(ref) { ref.notify(); });
  }

  if (rootProp) rootProp.notify();
}
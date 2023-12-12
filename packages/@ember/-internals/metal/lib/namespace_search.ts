import { context } from '@ember/-internals/environment';
import { getName, setName } from '@ember/-internals/utils';

const hasOwnProperty = Object.prototype.hasOwnProperty;

let searchDisabled = false;

const flags = {
  _set: 0,
  _unprocessedNamespaces: false,
  get unprocessedNamespaces(): boolean {
    return this._unprocessedNamespaces;
  },
  set unprocessedNamespaces(v) {
    this._set++;
    this._unprocessedNamespaces = v;
  },
};

let unprocessedMixins = false;

export interface Namespace {
  isNamespace: true;
  destroy(): void;
}

export const NAMESPACES: Namespace[] = [];
export const NAMESPACES_BY_ID: { [name: string]: Namespace } = Object.create(null);

export function addNamespace(namespace: Namespace): void {
  flags.unprocessedNamespaces = true;
  NAMESPACES.push(namespace);
}

export function removeNamespace(namespace: Namespace): void {
  let name = getName(namespace) as string;
  delete NAMESPACES_BY_ID[name];
  NAMESPACES.splice(NAMESPACES.indexOf(namespace), 1);
  if (name in context.lookup && namespace === context.lookup[name]) {
    context.lookup[name] = undefined;
  }
}

export function findNamespaces(): void {
  if (!flags.unprocessedNamespaces) {
    return;
  }
  let lookup = context.lookup;
  let keys = Object.keys(lookup);
  for (let key of keys) {
    // Only process entities that start with uppercase A-Z
    if (!isUppercase(key.charCodeAt(0))) {
      continue;
    }
    let obj = tryIsNamespace(lookup, key);
    if (obj) {
      setName(obj, key);
    }
  }
}

export function findNamespace(name: string): Namespace | undefined {
  if (!searchDisabled) {
    processAllNamespaces();
  }
  return NAMESPACES_BY_ID[name];
}

export function processNamespace(namespace: Namespace): void {
  _processNamespace([namespace.toString()], namespace, new Set());
}

export function processAllNamespaces(): void {
  let unprocessedNamespaces = flags.unprocessedNamespaces;
  if (unprocessedNamespaces) {
    findNamespaces();
    flags.unprocessedNamespaces = false;
  }

  if (unprocessedNamespaces || unprocessedMixins) {
    let namespaces = NAMESPACES;

    for (let namespace of namespaces) {
      processNamespace(namespace);
    }

    unprocessedMixins = false;
  }
}

export function isSearchDisabled(): boolean {
  return searchDisabled;
}

export function setSearchDisabled(flag: boolean): void {
  searchDisabled = Boolean(flag);
}

export function setUnprocessedMixins(): void {
  unprocessedMixins = true;
}

function _processNamespace<N extends Namespace>(
  paths: string[],
  root: N,
  seen: Set<Namespace>
): void {
  let idx = paths.length;

  let id = paths.join('.');

  NAMESPACES_BY_ID[id] = root;
  setName(root, id);

  // Loop over all of the keys in the namespace, looking for classes
  for (let key in root) {
    if (!hasOwnProperty.call(root, key)) {
      continue;
    }
    let obj: unknown = root[key];

    // If we are processing the `Ember` namespace, for example, the
    // `paths` will start with `["Ember"]`. Every iteration through
    // the loop will update the **second** element of this list with
    // the key, so processing `Ember.View` will make the Array
    // `['Ember', 'View']`.
    paths[idx] = key;

    // If we have found an unprocessed class
    if (obj && getName(obj as object) === void 0) {
      // Replace the class' `toString` with the dot-separated path
      setName(obj as object, paths.join('.'));
      // Support nested namespaces
    } else if (obj && isNamespace(obj)) {
      // Skip aliased namespaces
      if (seen.has(obj)) {
        continue;
      }
      seen.add(obj);
      // Process the child namespace
      _processNamespace(paths, obj, seen);
    }
  }

  paths.length = idx; // cut out last item
}

function isNamespace(obj: unknown): obj is Namespace {
  return obj != null && typeof obj === 'object' && (obj as Namespace).isNamespace;
}

function isUppercase(code: number): boolean {
  return (
    code >= 65 && code <= 90 // A
  ); // Z
}

function tryIsNamespace(lookup: { [k: string]: any }, prop: string): Namespace | void {
  try {
    let obj = lookup[prop];
    return (
      ((obj !== null && typeof obj === 'object') || typeof obj === 'function') &&
      obj.isNamespace &&
      obj
    );
  } catch (e) {
    // continue
  }
}

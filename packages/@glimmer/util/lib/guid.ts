let GUID = 0;

export interface HasGuid {
  _guid: number;
}

export function initializeGuid(object: HasGuid): number {
  return (object._guid = ++GUID);
}

export function ensureGuid(object: HasGuid): number {
  return object._guid || initializeGuid(object);
}
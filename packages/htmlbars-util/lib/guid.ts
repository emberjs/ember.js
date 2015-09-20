let GUID = 0;

export interface HasGuid {
  _guid: number;
}

export function installGuid(object: HasGuid): number {
  return (object._guid = object._guid || ++GUID);
}
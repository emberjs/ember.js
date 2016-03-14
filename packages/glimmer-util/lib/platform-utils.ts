interface InternedStringMarker {
  "d0850007-25c2-47d8-bb63-c4054016d539": boolean;
}

export type InternedString = InternedStringMarker & string;

export function intern(str: string): InternedString {
  return <InternedString>str;
  // let obj = {};
  // obj[str] = 1;
  // for (let key in obj) return <InternedString>key;
}

export type Opaque = {} | void;

export function opaque(value: Opaque): Opaque {
  return value;
}

export function numberKey(num: number): InternedString {
  return <InternedString>String(num);
}

export function LITERAL(str: string): InternedString {
  return <InternedString>str;
}

let BASE_KEY = intern(`__glimmer{+ new Date()}`);

export function symbol(debugName): InternedString {
  let number = +(new Date());
  return intern(debugName + ' [id=' + BASE_KEY + Math.floor(Math.random() * number) + ']');
}

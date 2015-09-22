interface InternedStringMarker {
  "d0850007-25c2-47d8-bb63-c4054016d539": boolean;
}

export type InternedString = InternedStringMarker & string;

export function intern(str: string): InternedString {
  var obj = {};
  obj[str] = 1;
  for (var key in obj) return <InternedString>key;
}

export function LITERAL(str: string): InternedString {
  return <InternedString>str;
}

let BASE_KEY = intern(`__htmlbars${+ new Date()}`);

export function symbol(debugName) {
  return intern(debugName + ' [id=' + BASE_KEY + Math.floor(Math.random() * new Date()) + ']');
}
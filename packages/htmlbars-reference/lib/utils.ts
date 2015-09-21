import { Dict, Set, HasGuid, installGuid } from 'htmlbars-util';
import { InternedString } from 'htmlbars-reference';

export function intern(str: string): InternedString {
  var obj = {};
  obj[str] = 1;
  for (var key in obj) return <InternedString>key;
}

export function LITERAL(str: string): InternedString {
  return <InternedString>str;
}

export function EMPTY_CACHE() {}

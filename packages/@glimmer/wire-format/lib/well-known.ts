import type {
  ATag,
  ClassAttr,
  DivTag,
  HrefAttr,
  IdAttr,
  NameAttr,
  PTag,
  SpanTag,
  StyleAttr,
  TypeAttr,
  ValueAttr,
} from '@glimmer/interfaces';

export const WellKnownAttrNames = {
  class: 0 satisfies ClassAttr,
  id: 1 satisfies IdAttr,
  value: 2 satisfies ValueAttr,
  name: 3 satisfies NameAttr,
  type: 4 satisfies TypeAttr,
  style: 5 satisfies StyleAttr,
  href: 6 satisfies HrefAttr,
} as const;

export const WellKnownTagNames = {
  div: 0 satisfies DivTag,
  span: 1 satisfies SpanTag,
  p: 2 satisfies PTag,
  a: 3 satisfies ATag,
} as const;

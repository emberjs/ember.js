import { FIXME, Option } from '../core';

export type FIX_REIFICATION<T> = FIXME<T, 'needs to be reified properly'>;

export {
  ElementNamespace,
  AttrNamespace,
  SimpleNode as Node,
  SimpleDocumentFragment as DocumentFragment,
  SimpleDocument as Document,
  SimpleText as Text,
  SimpleComment as Comment,
  SimpleAttr as Attribute,
  SimpleAttrs as Attributes,
  SimpleElement as Element,
} from '@simple-dom/interface';

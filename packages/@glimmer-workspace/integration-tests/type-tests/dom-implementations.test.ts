import type {
  SimpleAttr,
  SimpleComment,
  SimpleDocument,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleNode,
  SimpleText,
} from '@glimmer/interfaces';
import type createHTMLDocument from '@simple-dom/document';

import { expectTypeOf } from 'expect-type';

/**
 * Some tests render into a document from `@simple-dom/document`.
 * Its nodes must be subtypes of the Simple types,
 * so that the VM takes them with no cast.
 */
type NodeDocument = ReturnType<typeof createHTMLDocument>;
type NodeElement = ReturnType<NodeDocument['createElement']>;

expectTypeOf<NodeDocument>().toMatchTypeOf<SimpleDocument>();
expectTypeOf<NodeElement>().toMatchTypeOf<SimpleElement>();
expectTypeOf<NodeElement['attributes'][number]>().toMatchTypeOf<SimpleAttr>();
expectTypeOf<NonNullable<NodeElement['parentNode']>>().toMatchTypeOf<SimpleNode>();
expectTypeOf<ReturnType<NodeDocument['createTextNode']>>().toMatchTypeOf<SimpleText>();
expectTypeOf<ReturnType<NodeDocument['createComment']>>().toMatchTypeOf<SimpleComment>();
expectTypeOf<
  ReturnType<NodeDocument['createDocumentFragment']>
>().toMatchTypeOf<SimpleDocumentFragment>();

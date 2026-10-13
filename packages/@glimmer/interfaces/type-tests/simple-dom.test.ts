import type {
  SimpleAttr,
  SimpleComment,
  SimpleDocument,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleNode,
  SimpleText,
} from '@glimmer/interfaces';
import type * as SimpleDOM from '@simple-dom/interface';
import type createHTMLDocument from '@simple-dom/document';

import { expectTypeOf } from 'expect-type';

/**
 * Browser DOM types are subtypes of the Simple types.
 */
expectTypeOf<Node>().toMatchTypeOf<SimpleNode>();
expectTypeOf<ChildNode>().toMatchTypeOf<SimpleNode>();
expectTypeOf<ParentNode>().toMatchTypeOf<SimpleNode>();

expectTypeOf<Element>().toMatchTypeOf<SimpleElement>();
expectTypeOf<HTMLElement>().toMatchTypeOf<SimpleElement>();
expectTypeOf<HTMLInputElement>().toMatchTypeOf<SimpleElement>();
expectTypeOf<SVGElement>().toMatchTypeOf<SimpleElement>();
expectTypeOf<MathMLElement>().toMatchTypeOf<SimpleElement>();

expectTypeOf<Text>().toMatchTypeOf<SimpleText>();
expectTypeOf<Comment>().toMatchTypeOf<SimpleComment>();
expectTypeOf<DocumentFragment>().toMatchTypeOf<SimpleDocumentFragment>();
expectTypeOf<ShadowRoot>().toMatchTypeOf<SimpleDocumentFragment>();
expectTypeOf<Document>().toMatchTypeOf<SimpleDocument>();
expectTypeOf<Attr>().toMatchTypeOf<SimpleAttr>();

/**
 * An element is a node in both type sets.
 */
expectTypeOf<SimpleElement>().toMatchTypeOf<SimpleNode>();
expectTypeOf<SimpleDocument>().toMatchTypeOf<SimpleNode>();

/**
 * `@simple-dom/interface` types are subtypes of the Simple types too.
 */
expectTypeOf<SimpleDOM.SimpleNode>().toMatchTypeOf<SimpleNode>();
expectTypeOf<SimpleDOM.SimpleElement>().toMatchTypeOf<SimpleElement>();
expectTypeOf<SimpleDOM.SimpleText>().toMatchTypeOf<SimpleText>();
expectTypeOf<SimpleDOM.SimpleComment>().toMatchTypeOf<SimpleComment>();
expectTypeOf<SimpleDOM.SimpleDocumentFragment>().toMatchTypeOf<SimpleDocumentFragment>();
expectTypeOf<SimpleDOM.SimpleDocument>().toMatchTypeOf<SimpleDocument>();
expectTypeOf<SimpleDOM.SimpleAttr>().toMatchTypeOf<SimpleAttr>();
expectTypeOf<ReturnType<typeof createHTMLDocument>>().toMatchTypeOf<SimpleDocument>();

/**
 * The other direction does not hold. A Simple type has only the members
 * that the VM uses.
 */
expectTypeOf<SimpleNode>().not.toMatchTypeOf<Node>();
expectTypeOf<SimpleElement>().not.toMatchTypeOf<Element>();
expectTypeOf<SimpleDocument>().not.toMatchTypeOf<Document>();

/**
 * A node is not an element, and other objects are not nodes.
 */
expectTypeOf<SimpleNode>().not.toMatchTypeOf<SimpleElement>();
expectTypeOf<Text>().not.toMatchTypeOf<SimpleElement>();
expectTypeOf<Element>().not.toMatchTypeOf<SimpleDocument>();
expectTypeOf<Window>().not.toMatchTypeOf<SimpleDocument>();
expectTypeOf<string>().not.toMatchTypeOf<SimpleNode>();

/**
 * Members keep the Simple types, so a walk of the tree needs no cast.
 */
declare const element: SimpleElement;

expectTypeOf(element.parentNode).toEqualTypeOf<SimpleNode | null>();
expectTypeOf(element.firstChild).toEqualTypeOf<SimpleNode | null>();
expectTypeOf(element.ownerDocument).toEqualTypeOf<SimpleDocument | null>();
expectTypeOf(element.nodeValue).toEqualTypeOf<string | null>();
expectTypeOf(element.getAttribute('class')).toEqualTypeOf<string | null>();

declare const document: SimpleDocument;

expectTypeOf(document.createElement('div')).toEqualTypeOf<SimpleElement>();
expectTypeOf(document.createTextNode('text')).toEqualTypeOf<SimpleText>();

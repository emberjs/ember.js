import {
  Block,
  Append,
  DynamicAttr,
  DynamicProp,
  AddClass,
  Text,
  Comment,
  OpenElement,
  CloseElement,
  StaticAttr
} from './core';

import { StatementSyntax } from '../syntax';

// these are all constructors, indexed by statement type
export default function(name: string): typeof StatementSyntax {
  switch (name) {
    case 'block': return <any>Block;
    case 'append': return <any>Append;
    case 'dynamicAttr': return <any>DynamicAttr;
    case 'dynamicProp': return <any>DynamicProp;
    case 'addClass': return <any>AddClass;
    case 'text': return <any>Text;
    case 'comment': return <any>Comment;
    case 'openElement': return <any>OpenElement;
    case 'closeElement': return <any>CloseElement;
    case 'staticAttr': return <any>StaticAttr;
  }
};
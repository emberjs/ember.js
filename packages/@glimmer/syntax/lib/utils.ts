import { Option } from '@glimmer/interfaces';
import { expect } from '@glimmer/util';

import { GlimmerSyntaxError } from './syntax-error';
import * as ASTv1 from './v1/api';
import * as HBS from './v1/handlebars-ast';

// Regex to validate the identifier for block parameters.
// Based on the ID validation regex in Handlebars.

let ID_INVERSE_PATTERN = /[!"#%-,\.\/;->@\[-\^`\{-~]/;

// Checks the element's attributes to see if it uses block params.
// If it does, registers the block params with the program and
// removes the corresponding attributes from the element.

export function parseElementBlockParams(element: ASTv1.ElementNode): void {
  let params = parseBlockParams(element);
  if (params) element.blockParams = params;
}

function parseBlockParams(element: ASTv1.ElementNode): Option<string[]> {
  let l = element.attributes.length;
  let attrNames = [];

  for (let i = 0; i < l; i++) {
    attrNames.push(element.attributes[i].name);
  }

  let asIndex = attrNames.indexOf('as');

  if (asIndex !== -1 && l > asIndex && attrNames[asIndex + 1].charAt(0) === '|') {
    // Some basic validation, since we're doing the parsing ourselves
    let paramsString = attrNames.slice(asIndex).join(' ');
    if (
      paramsString.charAt(paramsString.length - 1) !== '|' ||
      expect(paramsString.match(/\|/g), `block params must exist here`).length !== 2
    ) {
      throw new GlimmerSyntaxError(
        "Invalid block parameters syntax, '" + paramsString + "'",
        element.loc
      );
    }

    let params = [];
    for (let i = asIndex + 1; i < l; i++) {
      let param = attrNames[i].replace(/\|/g, '');
      if (param !== '') {
        if (ID_INVERSE_PATTERN.test(param)) {
          throw new GlimmerSyntaxError(
            "Invalid identifier for block parameters, '" + param + "'",
            element.loc
          );
        }
        params.push(param);
      }
    }

    if (params.length === 0) {
      throw new GlimmerSyntaxError('Cannot use zero block parameters', element.loc);
    }

    element.attributes = element.attributes.slice(0, asIndex);
    return params;
  }

  return null;
}

export function childrenFor(
  node: ASTv1.Block | ASTv1.Template | ASTv1.ElementNode
): ASTv1.TopLevelStatement[] {
  switch (node.type) {
    case 'Block':
    case 'Template':
      return node.body;
    case 'ElementNode':
      return node.children;
  }
}

export function appendChild(
  parent: ASTv1.Block | ASTv1.Template | ASTv1.ElementNode,
  node: ASTv1.Statement
): void {
  childrenFor(parent).push(node);
}

export function isHBSLiteral(path: HBS.Expression): path is HBS.Literal;
export function isHBSLiteral(path: ASTv1.Expression): path is ASTv1.Literal;
export function isHBSLiteral(
  path: HBS.Expression | ASTv1.Expression
): path is HBS.Literal | ASTv1.Literal {
  return (
    path.type === 'StringLiteral' ||
    path.type === 'BooleanLiteral' ||
    path.type === 'NumberLiteral' ||
    path.type === 'NullLiteral' ||
    path.type === 'UndefinedLiteral'
  );
}

export function printLiteral(literal: ASTv1.Literal): string {
  if (literal.type === 'UndefinedLiteral') {
    return 'undefined';
  } else {
    return JSON.stringify(literal.value);
  }
}

import type { Nullable } from '@glimmer/interfaces';
import { expect, unwrap } from '@glimmer/util';

import type * as src from './source/api';
import type * as ASTv1 from './v1/api';
import type * as HBS from './v1/handlebars-ast';

import { generateSyntaxError } from './syntax-error';

// Regex to validate the identifier for block parameters.
// Based on the ID validation regex in Handlebars.

let ID_INVERSE_PATTERN = /[!"#%&'()*+./;<=>@[\\\]^`{|}~]/u;

// Checks the element's attributes to see if it uses block params.
// If it does, registers the block params with the program and
// removes the corresponding attributes from the element.

export function parseElementBlockParams(element: ASTv1.ElementNode): void {
  let params = parseBlockParams(element);
  if (params) {
    element.blockParamNodes = params;
    element.blockParams = params.map((p) => p.value);
  }
}

export function parseProgramBlockParamsLocs(code: src.Source, block: ASTv1.BlockStatement) {
  const blockRange = [block.loc.getStart().offset!, block.loc.getEnd().offset!] as [number, number];
  let part = code.slice(...blockRange);
  let start = blockRange[0];
  let idx = part.indexOf('|') + 1;
  start += idx;
  part = part.slice(idx, -1);
  idx = part.indexOf('|');
  part = part.slice(0, idx);
  for (const param of block.program.blockParamNodes) {
    const regex = new RegExp(`\\b${param.value}\\b`);
    const match = regex.exec(part)!;
    const range = [start + match.index, 0] as [number, number];
    range[1] = range[0] + param.value.length;
    param.loc = code.spanFor({
      start: code.hbsPosFor(range[0])!,
      end: code.hbsPosFor(range[1])!,
    });
  }
}

export function parseElementPartLocs(code: src.Source, element: ASTv1.ElementNode) {
  const elementRange = [element.loc.getStart().offset!, element.loc.getEnd().offset!] as [
    number,
    number,
  ];
  let start = elementRange[0];
  let codeSlice = code.slice(...elementRange);
  for (const part of element.parts) {
    const idx = codeSlice.indexOf(part.value);
    const range = [start + idx, 0] as [number, number];
    range[1] = range[0] + part.value.length;
    codeSlice = code.slice(range[1], elementRange[1]);
    start = range[1];
    part.loc = code.spanFor({
      start: code.hbsPosFor(range[0])!,
      end: code.hbsPosFor(range[1])!,
    });
  }
}

function parseBlockParams(element: ASTv1.ElementNode): Nullable<ASTv1.BlockParam[]> {
  let l = element.attributes.length;
  let attrNames = [];

  for (let i = 0; i < l; i++) {
    attrNames.push(unwrap(element.attributes[i]).name);
  }

  let asIndex = attrNames.indexOf('as');

  if (
    asIndex === -1 &&
    attrNames.length > 0 &&
    unwrap(attrNames[attrNames.length - 1]).charAt(0) === '|'
  ) {
    throw generateSyntaxError(
      'Block parameters must be preceded by the `as` keyword, detected block parameters without `as`',
      element.loc
    );
  }

  if (asIndex !== -1 && l > asIndex && unwrap(attrNames[asIndex + 1]).charAt(0) === '|') {
    // Some basic validation, since we're doing the parsing ourselves
    let paramsString = attrNames.slice(asIndex).join(' ');
    if (
      paramsString.charAt(paramsString.length - 1) !== '|' ||
      expect(paramsString.match(/\|/gu), `block params must exist here`).length !== 2
    ) {
      throw generateSyntaxError(
        "Invalid block parameters syntax, '" + paramsString + "'",
        element.loc
      );
    }

    let params: ASTv1.BlockParam[] = [];
    for (let i = asIndex + 1; i < l; i++) {
      let param = unwrap(attrNames[i]).replace(/\|/gu, '');
      if (param !== '') {
        if (ID_INVERSE_PATTERN.test(param)) {
          throw generateSyntaxError(
            "Invalid identifier for block parameters, '" + param + "'",
            element.loc
          );
        }
        let loc = element.attributes[i]!.loc;
        if (attrNames[i]!.startsWith('|')) {
          loc = loc.slice({ skipStart: 1 });
        }
        if (attrNames[i]!.endsWith('|')) {
          loc = loc.slice({ skipEnd: 1 });
        }

        // fix hbs parser bug, the range contains the whitespace between attributes...
        if (loc.endPosition.column - loc.startPosition.column > param.length) {
          loc = loc.slice({
            skipEnd: loc.endPosition.column - loc.startPosition.column - param.length,
          });
        }

        params.push({
          type: 'BlockParam',
          value: param,
          loc,
        });
      }
    }

    if (params.length === 0) {
      throw generateSyntaxError('Cannot use zero block parameters', element.loc);
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

export function isUpperCase(tag: string): boolean {
  return tag[0] === tag[0]?.toUpperCase() && tag[0] !== tag[0]?.toLowerCase();
}

export function isLowerCase(tag: string): boolean {
  return tag[0] === tag[0]?.toLowerCase() && tag[0] !== tag[0]?.toUpperCase();
}

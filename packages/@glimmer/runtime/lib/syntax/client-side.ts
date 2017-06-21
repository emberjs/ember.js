import { Opaque, SymbolTable } from '@glimmer/interfaces';
import { VersionedPathReference } from '@glimmer/reference';
import { Ops as WireFormatOps } from '@glimmer/wire-format';
import { PublicVM } from '../vm';

export enum Ops {
  OpenComponentElement,
  DidCreateElement,
  SetComponentAttrs,
  DidRenderLayout,
  FunctionExpression,
  Debugger
}

import ClientSideStatement = WireFormatOps.ClientSideStatement;
import ClientSideExpression = WireFormatOps.ClientSideExpression;

export type OpenComponentElement  = [ClientSideStatement, Ops.OpenComponentElement, string];
export type DidCreateElement      = [ClientSideStatement, Ops.DidCreateElement];
export type SetComponentAttrs     = [ClientSideStatement, Ops.SetComponentAttrs, boolean];
export type DidRenderLayout       = [ClientSideStatement, Ops.DidRenderLayout];

export type FunctionExpression    = [ClientSideExpression, Ops.FunctionExpression, FunctionExpressionCallback<Opaque>];
export type FunctionExpressionCallback<T> = (VM: PublicVM, symbolTable: SymbolTable) => VersionedPathReference<T>;

export type ClientSideStatement =
    OpenComponentElement
  | DidCreateElement
  | SetComponentAttrs
  | DidRenderLayout
  ;

export type ClientSideExpression = FunctionExpression;

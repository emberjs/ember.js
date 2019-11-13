import { Simple, Template, Option } from '@glimmer/interfaces';
import { Factory, Owner } from '@ember/-internals/owner';
import { TemplateFactory } from '@ember/-internals/glimmer';

export interface StaticTemplateMeta {
  moduleName: string;
  managerId?: string;
}

export interface OwnedTemplateMeta extends StaticTemplateMeta {
  owner: Owner;
  moduleName: string;
  managerId?: string;
}

export const ActionSupport: any;
export const ChildViewsSupport: any;
export const ClassNamesSupport: any;
export const CoreView: any;
export const ViewMixin: any;
export const ViewStateSupport: any;
export const TextSupport: any;

export function getElementView(element: Simple.Element): unknown;
export function getViewElement(view: unknown): Option<Simple.Element>;
export function setElementView(element: Simple.Element, view: unknown): void;
export function setViewElement(view: unknown, element: Simple.Element): void;
export function clearElementView(element: Simple.Element): void;
export function clearViewElement(view: unknown): void;

export function addChildView(parent: unknown, child: unknown): void;

export function isSimpleClick(event: Event): boolean;

export function constructStyleDeprecationMessage(affectedStyle: any): string;

export function getViewId(view: any): string;

export const MUTABLE_CELL: string;

export const ActionManager: {
  registeredActions: {
    [id: string]: any | undefined;
  };
};

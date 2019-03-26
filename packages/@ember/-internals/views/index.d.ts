import { Simple, Template, Option } from '@glimmer/interfaces';
import { Opaque } from '@glimmer/util';
import { Factory, Owner } from '@ember/-internals/owner';

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

export function getElementView(element: Simple.Element): Opaque;
export function getViewElement(view: Opaque): Option<Simple.Element>;
export function setElementView(element: Simple.Element, view: Opaque): void;
export function setViewElement(view: Opaque, element: Simple.Element): void;
export function clearElementView(element: Simple.Element): void;
export function clearViewElement(view: Opaque): void;

export function addChildView(parent: Opaque, child: Opaque): void;

export function isSimpleClick(event: Event): boolean;

export function constructStyleDeprecationMessage(affectedStyle: any): string;

export function hasPartial(name: string, owner: any): boolean;

export function lookupComponent(
  owner: Owner,
  name: string,
  options?: { source?: string }
): {
  layout: Template<OwnedTemplateMeta> | undefined;
  component: Factory<any, any> | undefined;
};

export function lookupPartial(templateName: string, owner: Owner): any;

export function getViewId(view: any): string;

export const MUTABLE_CELL: string;

export const ActionManager: {
  registeredActions: {
    [id: string]: any | undefined;
  };
};

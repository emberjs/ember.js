import { Opaque } from '@glimmer/util';

export const ActionSupport: any;
export const ChildViewsSupport: any;
export const ClassNamesSupport: any;
export const CoreView: any;
export const ViewMixin: any;
export const ViewStateSupport: any;
export const TextSupport: any;

export function getViewElement(view: Opaque): Element;
export function setViewElement(view: Opaque, element: Element | null);

export function isSimpleClick(event: Event): boolean;

export function constructStyleDeprecationMessage(affectedStyle: string): string;

export function hasPartial(name: string, owner: any): boolean;

export function lookupComponent(owner: any, name: string, options: any): any;

export function lookupPartial(templateName: string, owner: any): any;

export function getViewId(view: any): string;

export const fallbackViewRegistry: {
  [id: string]: any | undefined;
}

export const MUTABLE_CELL: string;

export const ActionManager: {
  registeredActions: {
    [id: string]: any | undefined;
  }
};

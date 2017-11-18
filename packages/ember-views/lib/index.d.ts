import { Opaque } from '@glimmer/util';
import { Simple } from '@glimmer/interfaces';
import { Template } from '@glimmer/runtime';
import { Owner, Factory } from 'ember-utils';

export interface TemplateMeta {
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

export function getViewElement(view: Opaque): Simple.Element;
export function setViewElement(view: Opaque, element: Simple.Element | null): void;

export function isSimpleClick(event: Event): boolean;

export function constructStyleDeprecationMessage(affectedStyle: any): string;

export function hasPartial(name: string, owner: any): boolean;

export function lookupComponent(owner: Owner, name: string, options?: { source?: string }): {
  layout: Template<TemplateMeta>;
  component: Factory<Opaque>;
};

export function lookupPartial(templateName: string, owner: Owner): any;

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

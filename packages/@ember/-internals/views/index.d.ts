import { Option } from '@glimmer/interfaces';
import { SimpleElement } from '@simple-dom/interface';

export const ActionSupport: any;
export const ChildViewsSupport: any;
export const ClassNamesSupport: any;
export const CoreView: any;
export const ViewMixin: any;
export const ViewStateSupport: any;
export const TextSupport: any;

export function getElementView(element: SimpleElement): unknown;
export function getViewElement(view: unknown): Option<SimpleElement>;
export function setElementView(element: SimpleElement, view: unknown): void;
export function setViewElement(view: unknown, element: SimpleElement): void;
export function clearElementView(element: SimpleElement): void;
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

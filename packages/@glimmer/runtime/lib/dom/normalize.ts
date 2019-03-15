import { Dict } from '@glimmer/interfaces';
import { SimpleNode, SimpleDocumentFragment } from '@simple-dom/interface';

export interface SafeString {
  toHTML(): string;
}

export type Insertion = CautiousInsertion | TrustingInsertion;
export type CautiousInsertion = string | SafeString | SimpleNode;
export type TrustingInsertion = string | SimpleNode;

export function normalizeStringValue(value: unknown): string {
  if (isEmpty(value)) {
    return '';
  }
  return String(value);
}

export function normalizeTrustedValue(value: unknown): TrustingInsertion {
  if (isEmpty(value)) {
    return '';
  }
  if (isString(value)) {
    return value;
  }
  if (isSafeString(value)) {
    return value.toHTML();
  }
  if (isNode(value)) {
    return value;
  }
  return String(value);
}

export function shouldCoerce(value: unknown) {
  return (
    isString(value) || isEmpty(value) || typeof value === 'boolean' || typeof value === 'number'
  );
}

export function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || typeof (value as Dict).toString !== 'function';
}

export function isSafeString(value: unknown): value is SafeString {
  return typeof value === 'object' && value !== null && typeof (value as any).toHTML === 'function';
}

export function isNode(value: unknown): value is SimpleNode {
  return typeof value === 'object' && value !== null && typeof (value as any).nodeType === 'number';
}

export function isFragment(value: unknown): value is SimpleDocumentFragment {
  return isNode(value) && value.nodeType === 11;
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

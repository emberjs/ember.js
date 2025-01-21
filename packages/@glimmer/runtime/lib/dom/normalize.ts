import type { Dict, Indexable, SimpleDocumentFragment, SimpleNode } from '@glimmer/interfaces';

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

export function shouldCoerce(
  value: unknown
): value is string | number | boolean | null | undefined {
  return (
    isString(value) || isEmpty(value) || typeof value === 'boolean' || typeof value === 'number'
  );
}

export function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || typeof (value as Dict).toString !== 'function';
}

export function isIndexable(value: unknown): value is Indexable {
  return value !== null && typeof value === 'object';
}

export function isSafeString(value: unknown): value is SafeString {
  return isIndexable(value) && typeof value['toHTML'] === 'function';
}

export function isNode(value: unknown): value is SimpleNode {
  return isIndexable(value) && typeof value['nodeType'] === 'number';
}

export function isFragment(value: unknown): value is SimpleDocumentFragment {
  return isIndexable(value) && value['nodeType'] === 11;
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

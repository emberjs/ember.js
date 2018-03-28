import { Tag } from '@glimmer/reference';

export function tagForProperty(object: any, propertyKey: string | symbol, _meta?: any): Tag;

export function tagFor(object: any | null, _meta?: any): Tag;

export function dirty(tag: Tag): void;

export function update(outer: Tag, inner: Tag): void;

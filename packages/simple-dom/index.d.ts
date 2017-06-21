import { Simple } from '@glimmer/interfaces';
import { Dict } from '@glimmer/util';

interface DocumentConstructor {
  new(): Document;
}

export interface Document extends Simple.Document {
  createRawHTMLSection(html: string): Simple.Node;
}

export const voidMap: Dict<boolean>;

interface HTMLSerializerConstructor {
  new(voidMap: Dict<Boolean>): HTMLSerializer;
}

export interface HTMLSerializer {
  serializeChildren(root: Simple.Node): string;
  serialize(root: Simple.Node): string;
}

export const HTMLSerializer: HTMLSerializerConstructor;

export const Document: DocumentConstructor;

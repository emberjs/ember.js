import { Simple } from '@glimmer/runtime';
import { Dict } from '@glimmer/util';

interface DocumentConstructor {
  new(): Document;
}

export interface Document extends Simple.Document {
  createRawHTMLSection(html: string): Simple.Node;
}

export var voidMap: Dict<boolean>;

interface HTMLSerializerConstructor {
  new(voidMap: Dict<Boolean>): HTMLSerializer;
}

export interface HTMLSerializer {
  serializeChildren(root: Simple.Node): string;
  serialize(root: Simple.Node): string;
}

export var HTMLSerializer: HTMLSerializerConstructor;

export var Document: DocumentConstructor;

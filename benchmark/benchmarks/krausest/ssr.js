import createDocument from '@simple-dom/document';
import Serializer from '@simple-dom/serializer';
import voidMap from '@simple-dom/void-map';

import render from './lib/index';

export default async function run() {
  performance.mark('navigationStart');
  const document = createDocument();
  await render(document.body, false);
  const serializer = new Serializer(voidMap);
  return serializer.serializeChildren(document.body);
}

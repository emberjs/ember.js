import { SimpleElement } from '@simple-dom/interface';

export function qunitFixture(): SimpleElement {
  return document.getElementById('qunit-fixture') as SimpleElement;
}

import { guidFor as emberGuidFor } from '@ember/-internals/utils';

// it can happen that different ember apps/iframes have the same id for different objects
// since the implementation is just a counter, so we add a prefix per iframe & app
let perIframePrefix = parseInt(String(Math.random() * 1000)).toString() + '-';
let prefix = '';
let guidFor = (obj: any, pref?: string) =>
  `${perIframePrefix + (pref || prefix)}-${emberGuidFor(obj)}`;

export function setGuidPrefix(pref: string) {
  prefix = pref;
}

export { guidFor };

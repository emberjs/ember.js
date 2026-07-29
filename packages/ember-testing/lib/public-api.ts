export { default as Test } from './test';
// bare specifier (rather than relative) so variant builds can swap the
// adapter implementation at resolve time
export { default as Adapter } from 'ember-testing/lib/adapters/adapter';

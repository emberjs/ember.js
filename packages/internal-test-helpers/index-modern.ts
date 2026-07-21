/*
  The modern-variant subset of internal-test-helpers (see vite.config.mjs's
  MODERN mode): only the helpers whose import closure is free of the classic
  object model. Grow this as more helpers become modern-clean.
*/
export { default as moduleFor, moduleForDevelopment } from './lib/module-for';
export { default as AbstractTestCase } from './lib/test-cases/abstract';
export { default as buildOwner } from './lib/build-owner';
export { default as factory } from './lib/factory';
export { runAppend, runDestroy, runTask, runTaskNext, runLoopSettled } from './lib/run';

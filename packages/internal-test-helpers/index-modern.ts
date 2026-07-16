/*
  The modern-variant subset of internal-test-helpers (see vite.config.mjs's
  MODERN mode): only the helpers whose import closure is free of the classic
  object model. Grow this as more helpers become modern-clean.
*/
export { default as moduleFor } from './lib/module-for';
export { default as AbstractTestCase } from './lib/test-cases/abstract';
export { runAppend, runDestroy, runTask, runTaskNext, runLoopSettled } from './lib/run';

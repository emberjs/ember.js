import { createRequire } from 'node:module';

import * as prettier from 'prettier';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

/**
 * See: https://github.com/glimmerjs/glimmer-vm/issues/1688
 */
describe('Prettier', () => {
  it(`SMOKE: we've symlinked to the in-repo copy of @glimmer/syntax`, () => {
    let workspacePath = require.resolve('@glimmer/syntax');
    let prettierPath = require.resolve('prettier');
    let prettierGlimmer = require.resolve('@glimmer/syntax', { paths: [prettierPath] });

    expect(prettierGlimmer).toBe(workspacePath);
  });

  it('Underlynig preprocess API works', async () => {
    let result = (await import('@glimmer/syntax')).preprocess('<h1></h1>');

    expect(result, `It can be await import()'d, and doesn't error`).toBeTruthy();
  });

  it('Prettier can call preprocess', async () => {
    let result = await prettier.format(`     <div>\n</div>`, { parser: 'glimmer' });

    expect(result).toMatchInlineSnapshot(`
      "<div>
      </div>"
    `);
  });
});

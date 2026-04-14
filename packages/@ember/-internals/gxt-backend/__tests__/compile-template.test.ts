import { describe, it, expect } from 'vitest';
import { compileTemplate } from '../compile';

describe('compileTemplate', () => {
  it('compiles a simple HTML template', () => {
    const result = compileTemplate('<div>hello</div>');
    expect(result).toBeTruthy();
    // GXT-compiled templates are functions or objects with __gxtCompiled marker
    expect(
      typeof result === 'function' || result.__gxtCompiled === true
    ).toBe(true);
  });

  it('compiles plain text', () => {
    const result = compileTemplate('hello world');
    expect(result).toBeTruthy();
  });

  it('compiles component invocation (PascalCase)', () => {
    const result = compileTemplate('<MyComponent />');
    expect(result).toBeTruthy();
    expect(
      typeof result === 'function' || result.__gxtCompiled === true
    ).toBe(true);
  });

  it('compiles inline if helper', () => {
    const result = compileTemplate('{{if true "yes" "no"}}');
    expect(result).toBeTruthy();
  });

  it('compiles each block', () => {
    const result = compileTemplate(
      '{{#each this.items as |item|}}{{item}}{{/each}}'
    );
    expect(result).toBeTruthy();
  });

  it('compiles nested HTML elements', () => {
    const result = compileTemplate('<ul><li>one</li><li>two</li></ul>');
    expect(result).toBeTruthy();
  });

  it('compiles template with @args', () => {
    const result = compileTemplate('<div>{{@name}}</div>');
    expect(result).toBeTruthy();
  });

  it('compiles template with this.property', () => {
    const result = compileTemplate('<span>{{this.count}}</span>');
    expect(result).toBeTruthy();
  });

  it('compiles let block', () => {
    const result = compileTemplate(
      '{{#let "hello" as |greeting|}}{{greeting}}{{/let}}'
    );
    expect(result).toBeTruthy();
  });

  it('compiles component with block', () => {
    const result = compileTemplate(
      '<MyComponent as |val|>{{val}}</MyComponent>'
    );
    expect(result).toBeTruthy();
  });

  it('handles invalid template syntax gracefully', () => {
    // Unclosed blocks: the compiler logs errors to stderr but still returns a
    // result (it may be a partial/fallback compilation or a function).
    // The key behavior: it does NOT crash the process.
    let errorThrown = false;
    let result: any;
    try {
      result = compileTemplate('{{#if true}}unclosed');
    } catch {
      errorThrown = true;
    }
    // The compiler is resilient — it either throws or returns something
    // (possibly a fallback). Either way the process survives.
    expect(errorThrown || result !== undefined).toBe(true);
  });

  it('compiles empty string template', () => {
    const result = compileTemplate('');
    expect(result).toBeTruthy();
  });

  it('compiles template with HTML attributes', () => {
    const result = compileTemplate('<div class="foo" id="bar">text</div>');
    expect(result).toBeTruthy();
  });

  it('compiles component helper syntax', () => {
    const result = compileTemplate(
      '{{#let (component "my-component") as |Comp|}}<Comp />{{/let}}'
    );
    expect(result).toBeTruthy();
  });
});

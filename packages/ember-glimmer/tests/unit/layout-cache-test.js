import { RenderingTest, moduleFor } from '../utils/test-case';
import { CompiledBlock } from '@glimmer/runtime';
import { OWNER } from 'ember-utils';

class Counter {
  constructor() {
    this.reset();
  }

  increment(key) {
    this.total++;
    return this.counts[key] = (this.counts[key] || 0) + 1;
  }

  get(key) {
    return this.counts[key] || 0;
  }

  reset() {
    this.total  = 0;
    this.counts = Object.create(null);
  }
}

const COUNTER = new Counter();

class BasicCompiler {
  constructor(template) {
    this.template = template;
  }

  compile(builder) {
    let { template } = this;
    COUNTER.increment(`${this.constructor.id}+${template.id}`);
    builder.wrapLayout(template.asLayout());
  }
}

class TypeOneCompiler extends BasicCompiler {}
class TypeTwoCompiler extends BasicCompiler {}

TypeOneCompiler.id = 'type-one';
TypeTwoCompiler.id = 'type-two';

moduleFor('Layout cache test', class extends RenderingTest {

  constructor() {
    super();
    COUNTER.reset();
  }

  templateFor(content) {
    let Factory = this.compile(content);
    return this.env.getTemplate(Factory, this.owner);
  }

  ['@test each template is only compiled once'](assert) {
    let { env } = this;

    let template1 = this.templateFor('Hello world!');
    let template2 = this.templateFor('{{foo}} {{bar}}');

    assert.ok(env.getCompiledBlock(TypeOneCompiler, template1) instanceof CompiledBlock, 'should return a CompiledBlock');
    assert.strictEqual(COUNTER.get(`type-one+${template1.id}`), 1);
    assert.strictEqual(COUNTER.get(`type-one+${template2.id}`), 0);
    assert.strictEqual(COUNTER.total, 1);

    assert.ok(env.getCompiledBlock(TypeOneCompiler, template1) instanceof CompiledBlock, 'should return a CompiledBlock');
    assert.strictEqual(COUNTER.get(`type-one+${template1.id}`), 1);
    assert.strictEqual(COUNTER.get(`type-one+${template2.id}`), 0);
    assert.strictEqual(COUNTER.total, 1);

    assert.ok(env.getCompiledBlock(TypeOneCompiler, template2) instanceof CompiledBlock, 'should return a CompiledBlock');
    assert.strictEqual(COUNTER.get(`type-one+${template1.id}`), 1);
    assert.strictEqual(COUNTER.get(`type-one+${template2.id}`), 1);
    assert.strictEqual(COUNTER.total, 2);

    assert.ok(env.getCompiledBlock(TypeOneCompiler, template1) instanceof CompiledBlock, 'should return a CompiledBlock');
    assert.ok(env.getCompiledBlock(TypeOneCompiler, template1) instanceof CompiledBlock, 'should return a CompiledBlock');
    assert.ok(env.getCompiledBlock(TypeOneCompiler, template2) instanceof CompiledBlock, 'should return a CompiledBlock');
    assert.ok(env.getCompiledBlock(TypeOneCompiler, template1) instanceof CompiledBlock, 'should return a CompiledBlock');
    assert.ok(env.getCompiledBlock(TypeOneCompiler, template1) instanceof CompiledBlock, 'should return a CompiledBlock');
    assert.ok(env.getCompiledBlock(TypeOneCompiler, template1) instanceof CompiledBlock, 'should return a CompiledBlock');
    assert.ok(env.getCompiledBlock(TypeOneCompiler, template2) instanceof CompiledBlock, 'should return a CompiledBlock');
    assert.ok(env.getCompiledBlock(TypeOneCompiler, template2) instanceof CompiledBlock, 'should return a CompiledBlock');

    assert.strictEqual(COUNTER.get(`type-one+${template1.id}`), 1);
    assert.strictEqual(COUNTER.get(`type-one+${template2.id}`), 1);
    assert.strictEqual(COUNTER.total, 2);
  }

  ['@test each template/compiler pair is treated as unique'](assert) {
    let { env } = this;

    let template = this.templateFor('Hello world!');

    assert.ok(env.getCompiledBlock(TypeOneCompiler, template) instanceof CompiledBlock, 'should return a CompiledBlock');
    assert.strictEqual(COUNTER.get(`type-one+${template.id}`), 1);
    assert.strictEqual(COUNTER.get(`type-two+${template.id}`), 0);
    assert.strictEqual(COUNTER.total, 1);

    assert.ok(env.getCompiledBlock(TypeOneCompiler, template) instanceof CompiledBlock, 'should return a CompiledBlock');
    assert.strictEqual(COUNTER.get(`type-one+${template.id}`), 1);
    assert.strictEqual(COUNTER.get(`type-two+${template.id}`), 0);
    assert.strictEqual(COUNTER.total, 1);

    assert.ok(env.getCompiledBlock(TypeTwoCompiler, template) instanceof CompiledBlock, 'should return a CompiledBlock');
    assert.strictEqual(COUNTER.get(`type-one+${template.id}`), 1);
    assert.strictEqual(COUNTER.get(`type-two+${template.id}`), 1);
    assert.strictEqual(COUNTER.total, 2);

    assert.ok(env.getCompiledBlock(TypeOneCompiler, template) instanceof CompiledBlock, 'should return a CompiledBlock');
    assert.ok(env.getCompiledBlock(TypeOneCompiler, template) instanceof CompiledBlock, 'should return a CompiledBlock');
    assert.ok(env.getCompiledBlock(TypeTwoCompiler, template) instanceof CompiledBlock, 'should return a CompiledBlock');
    assert.ok(env.getCompiledBlock(TypeOneCompiler, template) instanceof CompiledBlock, 'should return a CompiledBlock');
    assert.ok(env.getCompiledBlock(TypeOneCompiler, template) instanceof CompiledBlock, 'should return a CompiledBlock');
    assert.ok(env.getCompiledBlock(TypeOneCompiler, template) instanceof CompiledBlock, 'should return a CompiledBlock');
    assert.ok(env.getCompiledBlock(TypeTwoCompiler, template) instanceof CompiledBlock, 'should return a CompiledBlock');
    assert.ok(env.getCompiledBlock(TypeTwoCompiler, template) instanceof CompiledBlock, 'should return a CompiledBlock');

    assert.strictEqual(COUNTER.get(`type-one+${template.id}`), 1);
    assert.strictEqual(COUNTER.get(`type-two+${template.id}`), 1);
    assert.strictEqual(COUNTER.total, 2);
  }

  ['@test a template instance is returned (ensures templates can be injected into layout property)'](assert) {
    let { owner, env } = this;

    let templateInstanceFor = (content) => {
      let Factory = this.compile(content);
      return Factory.create({ [OWNER]: owner, env });
    };

    let template1 = templateInstanceFor('Hello world!');
    let template2 = templateInstanceFor('{{foo}} {{bar}}');

    assert.ok(env.getCompiledBlock(TypeOneCompiler, template1) instanceof CompiledBlock, 'should return a CompiledBlock');
    assert.ok(env.getCompiledBlock(TypeOneCompiler, template2) instanceof CompiledBlock, 'should return a CompiledBlock');
  }
});

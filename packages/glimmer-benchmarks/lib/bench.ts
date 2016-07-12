// Goals:
//
// 1. ability to create new benchmark examples with templates etc. (ideally
//    in separate subclasses)
// 2. unit test the examples to make sure they actually work before benchmarking
// 3. clean up the UI of the report (post-MVP)

import { dict } from 'glimmer-util';

Benchmark.support.decompilation = false;

type BenchmarkDescription = string;

export abstract class BenchmarkScenario {
  protected moe: number;
  protected elapsed: number;
  private reporter: BenchmarkReporter;
  private env: BenchmarkEnvironment;

  constructor(reporter: BenchmarkReporter, env: BenchmarkEnvironment) {
    this.reporter = reporter;
    this.env = env;
  }

  start() {
  }

  tick(target: Benchmark, event?: Benchmark.Event) {
    let { stats, times } = target;

    this.moe = target.stats.moe;
    let elapsed = this.env.elapsed(times.timeStamp);
    this.reporter.progress(stats.sample.length, elapsed / 1000, stats);
  }

  error(error: Error) {
    this.reporter.error(error);
  }

  complete(event: Benchmark.Event) {
    this.reporter.complete(event.target as Benchmark, event);
  }

  abstract name: string;
  abstract description: string;

  abstract run();
}

export abstract class BenchmarkEnvironment {
  abstract elapsed(timestamp: number): number;
}

interface BenchmarkReporterClass {
  new(description: BenchmarkDescription): BenchmarkReporter;
}

export abstract class BenchmarkReporter {
  abstract progress(count: number, elapsed: number, stats: Benchmark.Stats);
  abstract error(error: Error);
  abstract complete(benchmark: Benchmark, event: Benchmark.Event);
}

export class BenchmarkSuite {
  public scenarios = dict<Benchmark>();

  add(scenario: BenchmarkScenario) {
    let bench = new Benchmark({
      minSamples: 200,
      name: scenario.name,
      fn: scenario.run.bind(scenario),
      onStart: scenario.start.bind(scenario),
      onCycle(event: Benchmark.Event) {
        if ((event.target as Benchmark).aborted) return;
        scenario.tick(event.target as Benchmark, event);
      },
      onError: (error: any) => {
        scenario.error(error.message);
      },
      onComplete: scenario.complete.bind(scenario)
    });

    this.scenarios[scenario.name] = bench;
  }

  run(name: string) {
    return this.scenarios[name].run({ async: true });
  }
}

/// INIT

/// TEMPLATE BENCHMARKS

import { Template } from "glimmer-runtime";
import { TestEnvironment, TestDynamicScope, compile } from "glimmer-test-helpers";
import { UpdatableReference } from 'glimmer-object-reference';

export abstract class TemplateBenchmarkScenario extends BenchmarkScenario {
  private compiled: Template = null;
  private context: Object = null;
  protected glimmerEnv: TestEnvironment = new TestEnvironment();

  abstract template(): string;
  abstract renderContext(): Object;

  // make sure to warm
  abstract test(render: () => HTMLElement);

  start() {
    let { glimmerEnv } = this;
    this.compiled = compile(this.template(), { env: this.glimmerEnv });
    this.context = this.renderContext();

    try {
      this.test(() => {
        let parent = glimmerEnv.getDOM().createElement('div', document.body) as HTMLElement;
        let contextRef = new UpdatableReference(this.context);
        glimmerEnv.begin();
        this.compiled.render(contextRef, glimmerEnv, { appendTo: parent, dynamicScope: new TestDynamicScope(null) });
        glimmerEnv.commit();
        return parent;
      });
    } catch(e) {
      // console.assert(e);
      this.error(e);
      throw e;
    }
  }

  run() {
    let { glimmerEnv, compiled } = this;
    let parent = glimmerEnv.getDOM().createElement('div', document.body);
    let context = new UpdatableReference(this.context);
    glimmerEnv.begin();
    compiled.render(context, glimmerEnv, { appendTo: parent, dynamicScope: new TestDynamicScope(null) });
    glimmerEnv.commit();
  }
}

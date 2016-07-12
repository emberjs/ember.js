import { BenchmarkReporter, BenchmarkEnvironment } from './bench';
import Stats from './stats';

export class TestReporter extends BenchmarkReporter {
  private pre: HTMLPreElement = document.createElement('pre');
  private cycle: HTMLPreElement = document.createElement('pre');

  constructor() {
    super();
    this.cycle.id = "cycle";
    this.pre.id = "benchmark-log";
    document.body.appendChild(this.cycle);
    document.body.appendChild(this.pre);
  }

  progress(count: number, elapsed: number, stats: Benchmark.Stats) {
    let error = stats.rme.toFixed(2);
    this.cycle.innerHTML = `${count} samples in ${toHumanTime(elapsed)} (${toHumanTime(stats.mean)} ± ${error}%)`;
  }

  error(error: Error) {
    this.logln(error['stack']);
    this.cycle.innerHTML = "Errored";
  }

  complete(benchmark: Benchmark, event: Benchmark.Event) {
    let rawStats = benchmark.stats;
    if (rawStats.sample.length === 0) return;
    let stats = new Stats({ bucket_precision: rawStats.moe });
    stats.push(rawStats.sample);

    this.cycle.innerHTML = "Idle";

    let unit = humanUnitFor(stats.median(), stats.percentile(95), stats.percentile(99), stats.moe());

    this.logln('Samples:    '  + rawStats.sample.length);
    this.logln('Median:     '  + toHumanTime(stats.median(), unit, 4));
    this.logln('95%:        '  + toHumanTime(stats.percentile(95), unit, 4));
    this.logln('99%:        '  + toHumanTime(stats.percentile(99), unit, 4));
    this.logln('Confidence: ±' + toHumanTime(stats.moe(), unit, 4));
    this.logln('\n');
    this.logln('Distribution:');

    let div = document.createElement('div');
    div.className = 'histogram';

    let distribution = stats.iqr().distribution();

    let maxHeight = Math.max(...distribution.filter(d => d).map(d => d.count));
    let widthPercentage = 100 / distribution.length;

    distribution.forEach((d, i) => {
      let bar = document.createElement('div');
      bar.style.width = `${widthPercentage}%`;
      bar.style.height = `${95 * d.count / maxHeight}%`;
      bar.style.bottom = '0px';
      bar.style.left = `${i * widthPercentage}%`;
      bar.className = 'bar';
      bar.title = d.count;
      div.appendChild(bar);

      let label = document.createElement('span');
      label.style.width = '100px';
      label.style.height = '20px';
      label.style.bottom = '-20px';
      label.style.left = `${i * widthPercentage}%`;
      label.style.transform = 'translateX(-50px)';
      label.style.textAlign = 'center';
      label.style.lineHeight = '20px';
      label.style.fontSize = '10px';
      label.className = 'label';
      label.innerText = toHumanTime(d.range[0], unit, 2, false);
      div.appendChild(label);

      let label2 = label.cloneNode(false) as HTMLSpanElement;
      label2.style.left = `${(i+1) * widthPercentage}%`;
      label2.innerText = toHumanTime(d.range[1], unit, 2, false);
      div.appendChild(label2);
    });

    document.body.appendChild(div);

    this.logln('\n');
  }

  private logln(message) {
    let child = document.createElement('pre');
    child.innerText = message;
    this.pre.appendChild(child);
  }
}

enum TimeUnit {
  ns = 1000000000,
  µs = 1000000,
  ms = 1000,
  s  = 1
};

function humanUnitFor(...seconds: number[]): TimeUnit {
  let units = seconds.map(time => {
    if (time < (1 / 10000000)) {
      return TimeUnit.ns;
    } else if (time < (1 / 10000)) {
      return TimeUnit.µs;
    } else if (time < 1 / 10) {
      return TimeUnit.ms;
    } else {
      return TimeUnit.s;
    }
  });

  return Math.min(...units);
}

function toHumanTime(seconds: number, base: TimeUnit = humanUnitFor(seconds), precision = 2, displayUnit = true) {
  let number = (seconds * base).toFixed(precision);
  let unit = displayUnit ? TimeUnit[base] : '';
  return `${number}${unit}`;
}

export class TestBenchmarkEnvironment extends BenchmarkEnvironment {
  elapsed(timestamp: number): number {
    return Date.now() - timestamp;
  }
}

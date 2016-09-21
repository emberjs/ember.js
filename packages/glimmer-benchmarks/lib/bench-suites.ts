import If from './benchmarks/if';
import Baseline from './benchmarks/baseline';
import Partials from './benchmarks/partials';
import Components from './benchmarks/components';
import { BenchmarkScenario } from './bench';

export default <{ [name: string]: typeof BenchmarkScenario[] }>{
  Baseline,
  If,
  Partials,
  Components
};

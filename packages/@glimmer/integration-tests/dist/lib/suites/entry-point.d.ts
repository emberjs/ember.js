import { RenderTest, Count } from '../render-test';
import { ComponentKind } from '../components/types';
export declare class EntryPointTest extends RenderTest {
    static suiteName: string;
    readonly testType: ComponentKind;
    readonly count: Count;
    'an entry point'(): void;
    'does not leak args between invocations'(): void;
    'can render different components per call'(): void;
}
//# sourceMappingURL=entry-point.d.ts.map
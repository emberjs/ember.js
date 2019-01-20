import { EmberishComponentTests } from './emberish-components';
import { AotRenderDelegate } from '../modes/aot/delegate';
export declare class BundleCompilerEmberTests extends EmberishComponentTests {
    protected delegate: AotRenderDelegate;
    'should not serialize the locator with static component helpers'(): void;
    'should not serialize if there are no args'(): void;
    'should serialize the locator with dynamic component helpers'(): void;
}
//# sourceMappingURL=bundle-compiler.d.ts.map
import { CompileOp } from '@glimmer/interfaces';
import RuntimeResolver from './resolver';

export interface ICompilerOptions {
  environment: {
    isInteractive: boolean;
  };
}

// factory for DI
export default {
  create({ environment }: ICompilerOptions): CompileOp {
    return new RuntimeResolver(environment.isInteractive).compiler;
  },
};

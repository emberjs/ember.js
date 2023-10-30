import { rimraf } from 'rimraf';

await rimraf('**/{dist,.turbo,node_modules}/', { glob: true });

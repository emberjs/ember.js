import type * as rollup from 'rollup';
import type * as vite from 'vite';

export interface PackageInfo {
  readonly name: string;
  readonly root: string;
  readonly exports: string;
}

export type JsonArray = JsonValue[];
export type JsonObject = Record<string, JsonValue>;

export type JsonValue = string | number | boolean | null | JsonArray | { [key: string]: JsonValue };

// importing from typescript using a static import massively slows down eslint for some reason.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export type CompilerOptions = import('typescript').CompilerOptions;

export type Setting<T extends keyof CompilerOptions> = CompilerOptions[T] & string;

export type PackageJsonInline = string | [ExternalOperator, string];

export interface PackageJSON {
  readonly exports: string;
  readonly types: string;
  readonly private: boolean;
  readonly name: string;
}

type SimpleExternal = { [P in string]: 'inline' | 'external' };
type ExternalOperator = 'startsWith' | 'is';

export type ExternalOption =
  | SimpleExternal
  | [ExternalOperator, SimpleExternal]
  | [ExternalOperator, string[], 'inline' | 'external'];

export type RollupExport = rollup.RollupOptions | rollup.RollupOptions[];
export type ViteConfig = Pick<vite.UserConfig, 'plugins' | 'esbuild' | 'optimizeDeps' | 'build'>;
export type ViteExport = ViteConfig | Promise<ViteConfig>;

export class Package {
  static root(meta: ImportMeta): string;
  static at(meta: ImportMeta | string): Package | undefined;
  static config(meta: ImportMeta | string): RollupExport;
  static viteConfig(meta: ImportMeta | string): ViteConfig;

  readonly entry: Record<string, string>;

  config(): RollupExport;
}

declare module 'require' {
  export function has(path: string): boolean;
  export default function require(path: string): any;
}

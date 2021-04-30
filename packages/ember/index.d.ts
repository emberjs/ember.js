declare module 'ember' {
  const Ember: any;

  export default Ember;
}

declare module 'require' {
  export function has(path: string): boolean;
  export default function require(path: string): any;
}

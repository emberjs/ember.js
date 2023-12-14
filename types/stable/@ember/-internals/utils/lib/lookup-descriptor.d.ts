declare module '@ember/-internals/utils/lib/lookup-descriptor' {
  export default function lookupDescriptor(
    obj: object,
    keyName: string | symbol
  ): PropertyDescriptor | null;
}

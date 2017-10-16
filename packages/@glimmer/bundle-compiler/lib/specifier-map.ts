import { Specifier } from "./specifiers";

/**
 * Maps a specifier to its associated handle, or unique integer ID. Host
 * environments can use the specifier map provided at the end of compilation to
 * build a data structure for converting handles into actual module values.
 */
export class SpecifierMap {
  public bySpecifier = new Map<Specifier, number>();
  public byHandle = new Map<number, Specifier>();

  public byVMHandle = new Map<number, Specifier>();
  public vmHandleBySpecifier = new Map<Specifier, number>();
}

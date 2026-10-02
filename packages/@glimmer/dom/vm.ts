/**
 * EXPERIMENTAL
 *
 * Interop between compiled templates and the VM, in both directions:
 *
 * - compiled templates can render components that only have a VM template
 *   (e.g. from addons), and
 * - the VM (the router, `@ember/renderer`, VM-rendered components) can render
 *   components whose template was compiled to DOM operations, including
 *   route templates that use `{{outlet}}`.
 *
 * The codegen babel plugin imports from here when `vmInterop` is enabled.
 * Apps that never hand a compiled component to the VM don't need this module,
 * and then don't pay for the VM.
 */
export { outlet, setTemplate, template, vmCompatible } from './lib/vm';

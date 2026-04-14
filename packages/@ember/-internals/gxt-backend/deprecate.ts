export function deprecateUntil() {}
export const DEPRECATIONS = {
  DEPRECATE_TEMPLATE_ACTION: {
    isRemoved: true,
  },
  DEPRECATE_IMPLICIT_ROUTE_MODEL: {
    isRemoved: true,
  },
  DEPRECATE_IMPORT_EMBER() {
    return { isRemoved: true };
  },
  DEPRECATE_COMPONENT_TEMPLATE_RESOLVING: {
    isEnabled: true,
  },
};

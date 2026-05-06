/**
 * Debug logging utilities for GXT-Ember integration
 *
 * Set globalThis.GXT_DEBUG = true to enable verbose logging
 * Set globalThis.GXT_DEBUG_CATEGORIES = ['compile', 'render', 'manager'] to filter
 */

// Check if debug mode is enabled
export function isDebugEnabled(category?: string): boolean {
  if (typeof globalThis === 'undefined') return false;

  const debugFlag = (globalThis as any).GXT_DEBUG;
  if (!debugFlag) return false;

  // If no category specified or debug is just 'true', allow all
  if (!category || debugFlag === true) return true;

  // Check if this category is in the allowed list
  const categories = (globalThis as any).GXT_DEBUG_CATEGORIES;
  if (Array.isArray(categories)) {
    return categories.includes(category);
  }

  return true;
}

// Log a debug message
export function debugLog(category: string, message: string, ...args: any[]): void {
  if (isDebugEnabled(category)) {
    console.log(`[${category}]`, message, ...args);
  }
}

// Log a debug warning
export function debugWarn(category: string, message: string, ...args: any[]): void {
  if (isDebugEnabled(category)) {
    console.warn(`[${category}]`, message, ...args);
  }
}

// Log a debug error (always logs, not filtered)
export function debugError(category: string, message: string, ...args: any[]): void {
  console.error(`[${category}]`, message, ...args);
}

// Categories used in the codebase
export const DEBUG_CATEGORIES = {
  COMPILE: 'compile',
  RENDER: 'render',
  MANAGER: 'manager',
  TEMPLATE: 'template',
  FACTORY: 'gxt-factory',
  CONTEXT: 'context',
} as const;

// Enable debug mode (call from console or test setup)
export function enableDebug(categories?: string[]): void {
  (globalThis as any).GXT_DEBUG = true;
  if (categories) {
    (globalThis as any).GXT_DEBUG_CATEGORIES = categories;
  }
}

// Disable debug mode
export function disableDebug(): void {
  (globalThis as any).GXT_DEBUG = false;
  (globalThis as any).GXT_DEBUG_CATEGORIES = undefined;
}

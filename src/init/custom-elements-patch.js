/**
 * Custom Elements Patch
 *
 * This script must be loaded BEFORE any other scripts that define custom elements
 * (including TinyMCE, overlay bundles, etc.).
 *
 * It patches the customElements.define method to prevent the error:
 * "Uncaught Error: A custom element with name 'mce-autosize-textarea' has already been defined."
 *
 * Usage:
 * Include this script as the FIRST script in your HTML:
 *   <script src="./init/custom-elements-patch.js"></script>
 *
 * Or import at the very top of your entry point:
 *   import './init/custom-elements-patch.js';
 */

(function() {
  'use strict';

  // Only patch if customElements exists (it should in modern browsers)
  if (typeof customElements === 'undefined') {
    console.warn('customElements API not available. Patch not applied.');
    return;
  }

  // Store reference to the original define method
  const originalDefine = customElements.define.bind(customElements);

  // Override the define method with a safe version
  customElements.define = function(name, constructor, options) {
    // Check if the element is already defined
    if (customElements.get(name)) {
      // Log in development, silent in production
      if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'production') {
        console.debug(
          `[Custom Elements Patch] Element '${name}' is already defined. ` +
          `Skipping duplicate registration.`
        );
      }
      return;
    }

    // Call the original define method
    return originalDefine(name, constructor, options);
  };

  // Mark that the patch has been applied
  window.__customElementsPatchApplied = true;

  console.debug('[Custom Elements Patch] Successfully applied. Duplicate registrations will be ignored.');
})();

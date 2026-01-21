/**
 * Utility to safely define custom elements without throwing errors
 * when an element with the same name has already been defined.
 *
 * This fixes the error:
 * "Uncaught Error: A custom element with name 'mce-autosize-textarea' has already been defined."
 */

/**
 * Safely defines a custom element, checking if it already exists first.
 * @param {string} name - The name of the custom element (e.g., 'mce-autosize-textarea')
 * @param {CustomElementConstructor} constructor - The custom element class
 * @param {ElementDefinitionOptions} [options] - Optional element definition options
 * @returns {boolean} - Returns true if the element was defined, false if it already existed
 */
export function safeDefine(name, constructor, options) {
  if (customElements.get(name)) {
    console.debug(`Custom element '${name}' is already defined. Skipping registration.`);
    return false;
  }

  customElements.define(name, constructor, options);
  return true;
}

/**
 * Wraps the global customElements.define to prevent duplicate registration errors.
 * Call this function once at application startup before any custom elements are loaded.
 *
 * This is useful when you can't control the code that's defining custom elements
 * (e.g., third-party libraries like TinyMCE).
 */
export function patchCustomElementsDefine() {
  const originalDefine = customElements.define.bind(customElements);

  customElements.define = function(name, constructor, options) {
    if (customElements.get(name)) {
      console.debug(`Custom element '${name}' is already defined. Skipping registration.`);
      return;
    }
    return originalDefine(name, constructor, options);
  };

  console.debug('customElements.define has been patched to prevent duplicate registration errors.');
}

/**
 * Checks if a custom element is already defined.
 * @param {string} name - The name of the custom element
 * @returns {boolean} - Returns true if the element is defined
 */
export function isElementDefined(name) {
  return customElements.get(name) !== undefined;
}

/**
 * Waits for a custom element to be defined.
 * @param {string} name - The name of the custom element
 * @returns {Promise<CustomElementConstructor>} - Resolves when the element is defined
 */
export function whenDefined(name) {
  return customElements.whenDefined(name);
}

export default {
  safeDefine,
  patchCustomElementsDefine,
  isElementDefined,
  whenDefined
};

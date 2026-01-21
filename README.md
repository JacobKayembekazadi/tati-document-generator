# tati-document-generator

## Fix for Duplicate Custom Element Error

This repository contains a fix for the error:

```
Uncaught Error: A custom element with name 'mce-autosize-textarea' has already been defined.
```

This error commonly occurs when:
- Hot Module Replacement (HMR) reloads scripts during development
- TinyMCE or similar editors are loaded multiple times
- Bundlers include the same custom element registration code in multiple chunks

## Solution

### Option 1: Early Initialization Patch (Recommended)

Load the patch script **before** any other scripts that define custom elements:

```html
<!-- Load this FIRST, before TinyMCE or other component libraries -->
<script src="./src/init/custom-elements-patch.js"></script>

<!-- Then load your other scripts -->
<script src="./overlay_bundle.js"></script>
```

Or in a module-based setup, import at the very top of your entry point:

```javascript
// This must be the FIRST import
import './init/custom-elements-patch.js';

// Then import everything else
import { initTinyMCE } from './editor';
```

### Option 2: Use the Safe Define Utility

For more control, use the utility functions directly:

```javascript
import { safeDefine, patchCustomElementsDefine } from './utils/safe-custom-elements.js';

// Option A: Patch globally at startup
patchCustomElementsDefine();

// Option B: Use safeDefine for individual registrations
class MyCustomElement extends HTMLElement {
  // ...
}
safeDefine('my-custom-element', MyCustomElement);
```

## API Reference

### `patchCustomElementsDefine()`

Patches the global `customElements.define` method to silently skip duplicate registrations.

### `safeDefine(name, constructor, options)`

Safely defines a custom element, returning `true` if defined or `false` if already exists.

### `isElementDefined(name)`

Checks if a custom element is already registered.

### `whenDefined(name)`

Returns a Promise that resolves when the element is defined.

## Fix for Favicon 404 Error

Add this to your HTML `<head>` to prevent the `/favicon.ico` 404 error:

```html
<link rel="icon" href="data:,">
```

Or use an inline SVG favicon:

```html
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📄</text></svg>">
```

## File Structure

```
src/
  init/
    custom-elements-patch.js  # Early initialization script
  snippets/
    favicon-fix.html          # Favicon 404 fix snippet
  utils/
    safe-custom-elements.js   # Utility functions for custom elements
```

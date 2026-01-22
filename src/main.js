/**
 * Tati Document Generator - Main Application
 */

// Initialize TinyMCE editor
document.addEventListener('DOMContentLoaded', function() {
  if (typeof tinymce !== 'undefined') {
    tinymce.init({
      selector: '#editor',
      height: 500,
      plugins: [
        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
        'insertdatetime', 'media', 'table', 'help', 'wordcount'
      ],
      toolbar: 'undo redo | blocks | bold italic backcolor | ' +
        'alignleft aligncenter alignright alignjustify | ' +
        'bullist numlist outdent indent | removeformat | help',
      content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px }',
      setup: function(editor) {
        editor.on('init', function() {
          console.log('TinyMCE editor initialized successfully');
        });
      }
    });
  } else {
    console.warn('TinyMCE not loaded. Editor will be a plain textarea.');
  }
});

// Export document as HTML
function exportDocument() {
  if (typeof tinymce !== 'undefined') {
    const content = tinymce.get('editor').getContent();
    return content;
  }
  return document.getElementById('editor').value;
}

// Make exportDocument available globally
window.exportDocument = exportDocument;

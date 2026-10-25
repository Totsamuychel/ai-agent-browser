/**
 * Skill: typeText
 * Types text into a form field on the active page.
 */

var webviews = require('webviews.js')

var definition = {
  name: 'typeText',
  description: 'Types text into a form input or textarea on the currently active page. Specify the CSS selector of the input field and the text to type.',
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS selector of the input field (e.g., "input[name=\'q\']", "#search-input", "textarea.message")'
      },
      text: {
        type: 'string',
        description: 'The text to type into the field'
      },
      clearFirst: {
        type: 'boolean',
        description: 'Whether to clear the field before typing. Defaults to true.'
      },
      pressEnter: {
        type: 'boolean',
        description: 'Whether to press Enter after typing. Defaults to false.'
      }
    },
    required: ['selector', 'text']
  }
}

async function execute (context, args) {
  var tabId = context.activeTabId
  if (!tabId) {
    return { error: 'No active tab' }
  }

  var clearFirst = args.clearFirst !== false
  var pressEnter = args.pressEnter === true

  var script = `
    (function() {
      try {
        var el = document.querySelector('${args.selector.replace(/'/g, "\\'")}');
        if (!el) {
          return 'Element not found: ${args.selector.replace(/'/g, "\\'")}';
        }
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        ${clearFirst ? 'el.value = "";' : ''}
        
        // Use native setter to trigger React/Vue/Angular change detection
        var nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        ).set || Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 'value'
        ).set;
        
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(el, ${clearFirst ? '' : 'el.value + '}'${args.text.replace(/'/g, "\\'")}');
        } else {
          el.value = ${clearFirst ? '' : 'el.value + '}'${args.text.replace(/'/g, "\\'")}';
        }
        
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        
        ${pressEnter ? `
        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        // Also submit the form if exists
        var form = el.closest('form');
        if (form) { form.submit(); }
        ` : ''}
        
        return 'Typed text into ' + el.tagName + (el.name ? '[name=' + el.name + ']' : '') + (${pressEnter} ? ' and pressed Enter' : '');
      } catch(e) {
        return 'Error: ' + e.message;
      }
    })()
  `

  return new Promise(function (resolve) {
    webviews.callAsync(tabId, 'executeJavaScript', script, function (err, result) {
      if (err) {
        resolve({ error: 'Type failed: ' + err.message })
      } else {
        resolve({ result: result })
      }
    })
  })
}

module.exports = { definition, execute }

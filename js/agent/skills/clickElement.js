/**
 * Skill: clickElement
 * Clicks an element on the page by CSS selector or by visible text.
 */

var webviews = require('webviews.js')

var definition = {
  name: 'clickElement',
  description: 'Clicks an element on the currently active page. You can specify a CSS selector or the visible text of the element to click.',
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS selector of the element to click (e.g., "button.submit", "#login-btn", "a[href=\'/about\']")'
      },
      text: {
        type: 'string',
        description: 'Visible text of the element to click. Used when CSS selector is not known. The first element containing this text will be clicked.'
      }
    }
  }
}

async function execute (context, args) {
  var tabId = context.activeTabId
  if (!tabId) {
    return { error: 'No active tab' }
  }

  var script
  if (args.selector) {
    script = `
      (function() {
        try {
          var el = document.querySelector('${args.selector.replace(/'/g, "\\'")}');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.click();
            return 'Clicked element: ' + (el.tagName || '') + ' ' + (el.textContent || '').substring(0, 50);
          }
          return 'Element not found for selector: ${args.selector.replace(/'/g, "\\'")}';
        } catch(e) {
          return 'Error: ' + e.message;
        }
      })()
    `
  } else if (args.text) {
    script = `
      (function() {
        try {
          var searchText = '${args.text.replace(/'/g, "\\'")}';
          var all = document.querySelectorAll('a, button, input[type="submit"], input[type="button"], [role="button"], [onclick]');
          for (var i = 0; i < all.length; i++) {
            if (all[i].textContent.trim().toLowerCase().includes(searchText.toLowerCase())) {
              all[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
              all[i].click();
              return 'Clicked element with text: ' + all[i].textContent.trim().substring(0, 50);
            }
          }
          return 'No clickable element found with text: ' + searchText;
        } catch(e) {
          return 'Error: ' + e.message;
        }
      })()
    `
  } else {
    return { error: 'Either "selector" or "text" parameter is required' }
  }

  return new Promise(function (resolve) {
    webviews.callAsync(tabId, 'executeJavaScript', script, function (err, result) {
      if (err) {
        resolve({ error: 'Click failed: ' + err.message })
      } else {
        resolve({ result: result })
      }
    })
  })
}

module.exports = { definition, execute }

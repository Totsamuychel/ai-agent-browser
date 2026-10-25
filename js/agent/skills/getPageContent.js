/**
 * Skill: getPageContent
 * Extracts readable text content from the active tab.
 */

var webviews = require('webviews.js')

var definition = {
  name: 'getPageContent',
  description: 'Extracts the readable text content from the currently active browser tab. Returns the first 8000 characters of page text.',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  }
}

async function execute (context) {
  var tabId = context.activeTabId
  if (!tabId) {
    return { error: 'No active tab' }
  }

  return new Promise(function (resolve) {
    webviews.callAsync(tabId, 'executeJavaScript', `
      (function() {
        try {
          var text = document.body.innerText || '';
          return text.substring(0, 8000);
        } catch(e) {
          return 'Error extracting content: ' + e.message;
        }
      })()
    `, function (err, result) {
      if (err) {
        resolve({ error: 'Failed to get page content: ' + err.message })
      } else {
        resolve({ content: result || '(empty page)' })
      }
    })
  })
}

module.exports = { definition, execute }

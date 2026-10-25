/**
 * Skill: navigate
 * Opens a URL in the current tab or creates a new tab.
 */

var webviews = require('webviews.js')
var browserUI = require('browserUI.js')

var definition = {
  name: 'navigate',
  description: 'Navigates to a URL. Can open in the current tab or in a new tab.',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to navigate to (e.g., "https://google.com")'
      },
      newTab: {
        type: 'boolean',
        description: 'Whether to open the URL in a new tab. Defaults to false (navigates in current tab).'
      }
    },
    required: ['url']
  }
}

async function execute (context, args) {
  try {
    var url = args.url

    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
      url = 'https://' + url
    }

    if (args.newTab) {
      var newTabId = tabs.add({ url: url })
      browserUI.addTab(newTabId, {
        enterEditMode: false,
        openInBackground: false
      })
      return { result: 'Opened new tab with URL: ' + url, tabId: newTabId }
    } else {
      var tabId = context.activeTabId || tabs.getSelected()
      webviews.update(tabId, url)
      return { result: 'Navigated to: ' + url, tabId: tabId }
    }
  } catch (e) {
    return { error: 'Navigation failed: ' + e.message }
  }
}

module.exports = { definition, execute }

/**
 * Skill: scrollPage
 * Scrolls the active page up or down.
 */

var webviews = require('webviews.js')

var definition = {
  name: 'scrollPage',
  description: 'Scrolls the currently active page up or down by a specified amount.',
  parameters: {
    type: 'object',
    properties: {
      direction: {
        type: 'string',
        enum: ['up', 'down', 'top', 'bottom'],
        description: 'Scroll direction: "up", "down", "top" (scroll to top), or "bottom" (scroll to bottom)'
      },
      amount: {
        type: 'number',
        description: 'Amount to scroll in pixels. Defaults to 500. Ignored for "top" and "bottom" directions.'
      }
    },
    required: ['direction']
  }
}

async function execute (context, args) {
  var tabId = context.activeTabId
  if (!tabId) {
    return { error: 'No active tab' }
  }

  var amount = args.amount || 500
  var scrollScript

  switch (args.direction) {
    case 'up':
      scrollScript = 'window.scrollBy(0, -' + amount + ')'
      break
    case 'down':
      scrollScript = 'window.scrollBy(0, ' + amount + ')'
      break
    case 'top':
      scrollScript = 'window.scrollTo(0, 0)'
      break
    case 'bottom':
      scrollScript = 'window.scrollTo(0, document.body.scrollHeight)'
      break
    default:
      return { error: 'Invalid direction: ' + args.direction }
  }

  var script = `
    (function() {
      try {
        ${scrollScript};
        return 'Scrolled ${args.direction}. Current position: ' + window.scrollY + '/' + document.body.scrollHeight;
      } catch(e) {
        return 'Error: ' + e.message;
      }
    })()
  `

  return new Promise(function (resolve) {
    webviews.callAsync(tabId, 'executeJavaScript', script, function (err, result) {
      if (err) {
        resolve({ error: 'Scroll failed: ' + err.message })
      } else {
        resolve({ result: result })
      }
    })
  })
}

module.exports = { definition, execute }

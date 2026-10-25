/**
 * Skill: getPageInfo
 * Gets metadata and interactive elements list from the active page.
 */

var webviews = require('webviews.js')

var definition = {
  name: 'getPageInfo',
  description: 'Gets information about the currently active page: title, URL, meta description, and a list of interactive elements (links, buttons, inputs) with their selectors. Useful for understanding what actions are available on the page.',
  parameters: {
    type: 'object',
    properties: {
      includeLinks: {
        type: 'boolean',
        description: 'Whether to include links in the output. Defaults to true.'
      },
      maxElements: {
        type: 'number',
        description: 'Maximum number of interactive elements to return. Defaults to 30.'
      }
    }
  }
}

async function execute (context, args) {
  var tabId = context.activeTabId
  if (!tabId) {
    return { error: 'No active tab' }
  }

  var includeLinks = args.includeLinks !== false
  var maxElements = args.maxElements || 30

  var script = `
    (function() {
      try {
        var info = {
          title: document.title,
          url: window.location.href,
          description: '',
          elements: []
        };

        // Get meta description
        var metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) info.description = metaDesc.content || '';

        // Collect interactive elements
        var selectors = 'button, input, textarea, select, [role="button"]';
        ${includeLinks ? 'selectors += ", a[href]";' : ''}
        
        var elements = document.querySelectorAll(selectors);
        var count = 0;
        
        for (var i = 0; i < elements.length && count < ${maxElements}; i++) {
          var el = elements[i];
          var rect = el.getBoundingClientRect();
          
          // Skip hidden elements
          if (rect.width === 0 || rect.height === 0) continue;
          if (window.getComputedStyle(el).display === 'none') continue;
          if (window.getComputedStyle(el).visibility === 'hidden') continue;
          
          var elInfo = {
            tag: el.tagName.toLowerCase(),
            type: el.type || '',
            text: (el.textContent || '').trim().substring(0, 60),
            placeholder: el.placeholder || '',
            name: el.name || '',
            id: el.id || '',
            href: el.href || ''
          };
          
          // Build a usable selector
          if (el.id) {
            elInfo.selector = '#' + el.id;
          } else if (el.name) {
            elInfo.selector = el.tagName.toLowerCase() + '[name="' + el.name + '"]';
          } else if (el.className && typeof el.className === 'string') {
            elInfo.selector = el.tagName.toLowerCase() + '.' + el.className.trim().split(/\\s+/).join('.');
          } else {
            elInfo.selector = el.tagName.toLowerCase() + ':nth-of-type(' + (Array.from(el.parentNode.children).filter(c => c.tagName === el.tagName).indexOf(el) + 1) + ')';
          }
          
          info.elements.push(elInfo);
          count++;
        }
        
        return JSON.stringify(info);
      } catch(e) {
        return JSON.stringify({ error: e.message });
      }
    })()
  `

  return new Promise(function (resolve) {
    webviews.callAsync(tabId, 'executeJavaScript', script, function (err, result) {
      if (err) {
        resolve({ error: 'Failed to get page info: ' + err.message })
      } else {
        try {
          resolve(JSON.parse(result))
        } catch (e) {
          resolve({ raw: result })
        }
      }
    })
  })
}

module.exports = { definition, execute }

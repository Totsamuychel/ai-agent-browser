/**
 * Skill: fetchPageContent
 * Fetches an external webpage in the background and extracts clean, readable text.
 * Allows the agent to read articles, documentations, and search results autonomously.
 */

var definition = {
  name: 'fetchPageContent',
  description: 'Fetches any webpage by URL in the background and extracts its readable text content (stripping HTML tags, ads, and scripts). Use this after searchWeb to read the full content of relevant links.',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The full URL of the webpage to fetch and parse (e.g. "https://en.wikipedia.org/wiki/Artificial_intelligence")'
      },
      maxLength: {
        type: 'number',
        description: 'Maximum characters of text to extract (default 4000, max 10000)'
      }
    },
    required: ['url']
  }
}

async function execute (context, args) {
  var url = args.url
  if (!url || !url.trim()) {
    return { error: 'URL parameter is required' }
  }

  url = url.trim()
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }

  var maxLength = Math.min(Math.max(args.maxLength || 4000, 500), 10000)

  try {
    var response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    })

    if (!response.ok) {
      return {
        url: url,
        error: 'Failed to fetch webpage (' + response.status + ' ' + response.statusText + ')'
      }
    }

    var html = await response.text()

    // Extract title if present
    var titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    var title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : ''

    // Clean HTML to readable plain text
    var cleanText = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<svg[\s\S]*?<\/svg>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim()

    var truncated = false
    if (cleanText.length > maxLength) {
      cleanText = cleanText.substring(0, maxLength)
      truncated = true
    }

    return {
      url: url,
      title: title,
      textLength: cleanText.length,
      truncated: truncated,
      content: cleanText || '(No readable text extracted from page)'
    }
  } catch (err) {
    return {
      url: url,
      error: 'Error reading page: ' + err.message
    }
  }
}

module.exports = { definition, execute }

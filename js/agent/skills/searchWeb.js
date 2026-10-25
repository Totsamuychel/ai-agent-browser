/**
 * Skill: searchWeb
 * Searches the web using DuckDuckGo HTML without requiring any API keys.
 * Returns structured search results with title, URL, and snippet.
 */

var definition = {
  name: 'searchWeb',
  description: 'Searches the live web for a query and returns top results with titles, URLs, and snippets. Use this whenever the user asks about current events, facts, news, documentation, or requests a web search.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query string (e.g. "latest AI news 2026", "how to install docker linux")'
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results to return (1-10, default 5)'
      }
    },
    required: ['query']
  }
}

async function execute (context, args) {
  var query = args.query
  if (!query || !query.trim()) {
    return { error: 'Search query cannot be empty' }
  }

  var maxResults = Math.min(Math.max(args.maxResults || 5, 1), 10)

  try {
    var searchUrl = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query.trim())

    var response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8'
      }
    })

    if (!response.ok) {
      return { error: 'Search request failed with status ' + response.status }
    }

    var html = await response.text()
    var parts = html.split('<div class="result results_links')
    var results = []

    for (var i = 1; i < parts.length && results.length < maxResults; i++) {
      var part = parts[i]
      var titleMatch = part.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/)
      var snippetMatch = part.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/)

      if (titleMatch) {
        var rawUrl = titleMatch[1]
        var actualUrl = rawUrl

        // Extract real destination from DDG redirect (uddg parameter)
        var uddgMatch = rawUrl.match(/uddg=([^&]+)/)
        if (uddgMatch) {
          try {
            actualUrl = decodeURIComponent(uddgMatch[1])
          } catch (e) {
            actualUrl = uddgMatch[1]
          }
        } else if (rawUrl.startsWith('//')) {
          actualUrl = 'https:' + rawUrl
        }

        var title = titleMatch[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").trim()
        var snippet = snippetMatch
          ? snippetMatch[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").trim()
          : ''

        results.push({
          title: title,
          url: actualUrl,
          snippet: snippet
        })
      }
    }

    if (results.length === 0) {
      return {
        query: query,
        count: 0,
        results: [],
        message: 'No web search results found for: ' + query
      }
    }

    return {
      query: query,
      count: results.length,
      results: results
    }
  } catch (err) {
    return { error: 'Web search failed: ' + err.message }
  }
}

module.exports = { definition, execute }

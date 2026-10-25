/**
 * Skill: deepResearch
 * Autonomous multi-step research engine:
 * 1. Executes web search
 * 2. Fetches and parses content from top relevant sources
 * 3. Compiles structured intelligence with sources and citations
 */

var searchWeb = require('agent/skills/searchWeb.js')
var fetchPageContent = require('agent/skills/fetchPageContent.js')

var definition = {
  name: 'deepResearch',
  description: 'Conducts autonomous deep research on a topic by performing live web searches, reading top multiple sources in full, and gathering comprehensive evidence with citations. Use this when the user asks for deep research, detailed analysis, comparisons, or multi-source investigation.',
  parameters: {
    type: 'object',
    properties: {
      topic: {
        type: 'string',
        description: 'The research topic or question to investigate deeply'
      },
      numSources: {
        type: 'number',
        description: 'Number of top web sources to fetch and analyze in-depth (default 3, max 5)'
      }
    },
    required: ['topic']
  }
}

async function execute (context, args) {
  var topic = args.topic
  if (!topic || !topic.trim()) {
    return { error: 'Topic cannot be empty' }
  }

  var numSources = Math.min(Math.max(args.numSources || 3, 1), 5)

  try {
    // Step 1: Search the web
    var searchResult = await searchWeb.execute(context, {
      query: topic,
      maxResults: numSources + 2
    })

    if (searchResult.error || !searchResult.results || searchResult.results.length === 0) {
      return {
        topic: topic,
        error: searchResult.error || 'No search results found to conduct research'
      }
    }

    var selectedSources = searchResult.results.slice(0, numSources)
    var parsedSources = []

    // Step 2: Fetch and read top sources in parallel
    var fetchPromises = selectedSources.map(async function (source, index) {
      var pageData = await fetchPageContent.execute(context, {
        url: source.url,
        maxLength: 3500
      })

      return {
        id: index + 1,
        title: source.title || pageData.title || ('Source ' + (index + 1)),
        url: source.url,
        snippet: source.snippet || '',
        content: pageData.content || source.snippet || '',
        fetchSuccess: !pageData.error
      }
    })

    parsedSources = await Promise.all(fetchPromises)

    return {
      topic: topic,
      sourcesCount: parsedSources.length,
      sources: parsedSources.map(function (s) {
        return {
          id: s.id,
          title: s.title,
          url: s.url,
          contentSummary: s.content ? s.content.substring(0, 2500) : s.snippet
        }
      }),
      instructions: 'You have gathered in-depth data from ' + parsedSources.length + ' live web sources. ' +
        'Synthesize a comprehensive, well-structured research report. Cite your sources using [1], [2], etc., ' +
        'and include a markdown sources section at the end with clickable links.'
    }
  } catch (err) {
    return {
      topic: topic,
      error: 'Deep research failed: ' + err.message
    }
  }
}

module.exports = { definition, execute }

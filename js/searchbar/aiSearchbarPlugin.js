/**
 * AI Searchbar Plugin
 * Integrates the AI agent into Min's address/search bar.
 * Triggered by "?query", "/ai query", "@ai query", or any question.
 */

var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var sidebar = require('agent/sidebar.js')

function parseQuery (text) {
  if (text.startsWith('?')) {
    return text.substring(1).trim()
  }
  if (text.startsWith('/ai ') || text.startsWith('/ai')) {
    return text.replace(/^\/ai\s*/, '').trim()
  }
  if (text.startsWith('@ai ') || text.startsWith('@ai')) {
    return text.replace(/^@ai\s*/, '').trim()
  }
  if (text.endsWith('?') && text.length > 5) {
    return text.trim()
  }
  return null
}

function showAiResult (text, input, inputFlags) {
  searchbarPlugins.reset('aiSearchbarPlugin')

  var cleanQuery = parseQuery(text)
  if (!cleanQuery) return

  searchbarPlugins.addResult('aiSearchbarPlugin', {
    icon: 'carbon:bot',
    title: '🤖 Спросить ИИ: ' + cleanQuery,
    descriptionBlock: 'Запустить агента (поиск в сети, анализ страницы, Deep Research)',
    fakeURL: 'ai://' + encodeURIComponent(cleanQuery)
  })

  var container = searchbarPlugins.getContainer('aiSearchbarPlugin')
  if (container && container.childNodes.length > 0) {
    var item = container.childNodes[0]
    item.addEventListener('click', function (e) {
      e.preventDefault()
      e.stopPropagation()
      sidebar.ask(cleanQuery)
    })
  }
}

function initialize () {
  searchbarPlugins.register('aiSearchbarPlugin', {
    index: 0, // High priority in dropdown
    trigger: function (text) {
      return parseQuery(text) !== null
    },
    showResults: debounce(showAiResult, 100)
  })
}

module.exports = {
  initialize
}

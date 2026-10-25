/**
 * LLM Client - Unified interface for local (Ollama) and cloud (OpenAI-compatible) LLMs.
 * Supports function calling / tool use.
 */

var settings = require('util/settings/settings.js')

var DEFAULT_OLLAMA_ENDPOINT = 'http://localhost:11434/v1/chat/completions'
var DEFAULT_OLLAMA_MODEL = 'qwen2.5:7b'

function getConfig () {
  return {
    provider: settings.get('aiProvider') || 'ollama',
    ollamaEndpoint: settings.get('aiOllamaEndpoint') || DEFAULT_OLLAMA_ENDPOINT,
    ollamaModel: settings.get('aiOllamaModel') || DEFAULT_OLLAMA_MODEL,
    cloudEndpoint: settings.get('aiCloudEndpoint') || 'https://api.openai.com/v1/chat/completions',
    cloudModel: settings.get('aiCloudModel') || 'gpt-4o-mini',
    cloudApiKey: settings.get('aiCloudApiKey') || ''
  }
}

function getEndpoint (config) {
  if (config.provider === 'ollama') {
    return config.ollamaEndpoint
  }
  return config.cloudEndpoint
}

function getModel (config) {
  if (config.provider === 'ollama') {
    return config.ollamaModel
  }
  return config.cloudModel
}

function getHeaders (config) {
  var headers = {
    'Content-Type': 'application/json'
  }
  if (config.provider !== 'ollama' && config.cloudApiKey) {
    headers['Authorization'] = 'Bearer ' + config.cloudApiKey
  }
  return headers
}

/**
 * Send a chat completion request with optional tools.
 * @param {Array} messages - Chat messages array [{role, content}]
 * @param {Array} tools - Array of tool definitions (OpenAI function calling format)
 * @param {Object} options - Additional options (temperature, max_tokens, etc.)
 * @returns {Promise<Object>} - The API response
 */
async function chatCompletion (messages, tools, options) {
  var config = getConfig()
  options = options || {}

  var body = {
    model: getModel(config),
    messages: messages,
    temperature: options.temperature || 0.3
  }

  if (options.max_tokens) {
    body.max_tokens = options.max_tokens
  }

  if (tools && tools.length > 0) {
    body.tools = tools.map(function (tool) {
      return {
        type: 'function',
        function: tool
      }
    })
    body.tool_choice = 'auto'
  }

  var response = await fetch(getEndpoint(config), {
    method: 'POST',
    headers: getHeaders(config),
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    var errorText = await response.text()
    throw new Error('LLM API error (' + response.status + '): ' + errorText)
  }

  return await response.json()
}

/**
 * Extract the assistant message from an API response.
 */
function getAssistantMessage (response) {
  if (response.choices && response.choices.length > 0) {
    return response.choices[0].message
  }
  return null
}

/**
 * Check if the response contains tool calls.
 */
function hasToolCalls (message) {
  return message && message.tool_calls && message.tool_calls.length > 0
}

module.exports = {
  chatCompletion,
  getAssistantMessage,
  hasToolCalls,
  getConfig
}

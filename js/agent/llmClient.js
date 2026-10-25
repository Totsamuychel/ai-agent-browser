/**
 * LLM Client - Unified interface for local (Ollama) and cloud (OpenAI-compatible) LLMs.
 * Supports function calling / tool use.
 */

var settings = require('util/settings/settings.js')

var DEFAULT_OLLAMA_ENDPOINT = 'http://localhost:11434/v1/chat/completions'
var DEFAULT_OLLAMA_MODEL = 'qwen2.5:7b'

var POPULAR_LOCAL_MODELS = [
  { id: 'qwen2.5:7b', name: 'Qwen 2.5 7B (Рекомендуется)' },
  { id: 'qwen2.5:14b', name: 'Qwen 2.5 14B (Мощная)' },
  { id: 'llama3.1:8b', name: 'Llama 3.1 8B' },
  { id: 'deepseek-r1:8b', name: 'DeepSeek R1 8B' },
  { id: 'mistral:7b', name: 'Mistral 7B' }
]

var POPULAR_CLOUD_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Быстрая)' },
  { id: 'gpt-4o', name: 'GPT-4o (Максимальная точность)' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'deepseek-chat', name: 'DeepSeek V3' }
]

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

function saveConfig (updates) {
  if (!updates) return
  if (updates.provider !== undefined) settings.set('aiProvider', updates.provider)
  if (updates.ollamaEndpoint !== undefined) settings.set('aiOllamaEndpoint', updates.ollamaEndpoint)
  if (updates.ollamaModel !== undefined) settings.set('aiOllamaModel', updates.ollamaModel)
  if (updates.cloudEndpoint !== undefined) settings.set('aiCloudEndpoint', updates.cloudEndpoint)
  if (updates.cloudModel !== undefined) settings.set('aiCloudModel', updates.cloudModel)
  if (updates.cloudApiKey !== undefined) settings.set('aiCloudApiKey', updates.cloudApiKey)
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
 * Check Ollama connection status and fetch available models if possible.
 */
async function checkOllamaStatus () {
  var config = getConfig()
  try {
    var tagsUrl = config.ollamaEndpoint.replace('/v1/chat/completions', '/api/tags')
    var res = await fetch(tagsUrl, { signal: AbortSignal.timeout(3000) })
    if (res.ok) {
      var data = await res.json()
      var modelList = (data.models || []).map(function (m) { return m.name })
      return { online: true, installedModels: modelList }
    }
    return { online: false, installedModels: [] }
  } catch (e) {
    return { online: false, installedModels: [] }
  }
}

/**
 * Send a chat completion request with optional tools.
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

function getAssistantMessage (response) {
  if (response.choices && response.choices.length > 0) {
    return response.choices[0].message
  }
  return null
}

function hasToolCalls (message) {
  return message && message.tool_calls && message.tool_calls.length > 0
}

module.exports = {
  chatCompletion,
  getAssistantMessage,
  hasToolCalls,
  getConfig,
  saveConfig,
  checkOllamaStatus,
  POPULAR_LOCAL_MODELS,
  POPULAR_CLOUD_MODELS
}

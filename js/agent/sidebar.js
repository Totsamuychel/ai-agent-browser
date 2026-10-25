/**
 * AI Sidebar
 * The chat UI panel for interacting with the AI agent.
 */

var agentLoop = require('agent/agentLoop.js')
var llmClient = require('agent/llmClient.js')
var settings = require('util/settings/settings.js')

var sidebar = {
  container: null,
  messagesContainer: null,
  input: null,
  isVisible: false,
  isProcessing: false,
  conversationHistory: []
}

function createSidebar () {
  // Main container
  sidebar.container = document.createElement('div')
  sidebar.container.id = 'ai-sidebar'
  sidebar.container.className = 'ai-sidebar-hidden'

  // Header
  var header = document.createElement('div')
  header.className = 'ai-sidebar-header'

  var titleContainer = document.createElement('div')
  titleContainer.className = 'ai-sidebar-title-container'

  var title = document.createElement('span')
  title.className = 'ai-sidebar-title'
  title.textContent = '🤖 AI Agent'

  var statusDot = document.createElement('span')
  statusDot.id = 'ai-status-dot'
  statusDot.className = 'ai-status-dot ai-status-offline'

  titleContainer.appendChild(title)
  titleContainer.appendChild(statusDot)

  var headerButtons = document.createElement('div')
  headerButtons.className = 'ai-sidebar-header-buttons'

  var settingsBtn = document.createElement('button')
  settingsBtn.className = 'ai-sidebar-btn'
  settingsBtn.textContent = '⚙️'
  settingsBtn.title = 'Settings'
  settingsBtn.addEventListener('click', toggleSettings)

  var clearBtn = document.createElement('button')
  clearBtn.className = 'ai-sidebar-btn'
  clearBtn.textContent = '🗑️'
  clearBtn.title = 'Clear conversation'
  clearBtn.addEventListener('click', clearConversation)

  var closeBtn = document.createElement('button')
  closeBtn.className = 'ai-sidebar-btn'
  closeBtn.textContent = '✕'
  closeBtn.title = 'Close sidebar'
  closeBtn.addEventListener('click', function () { toggle() })

  headerButtons.appendChild(settingsBtn)
  headerButtons.appendChild(clearBtn)
  headerButtons.appendChild(closeBtn)

  header.appendChild(titleContainer)
  header.appendChild(headerButtons)

  // Settings panel (hidden by default)
  var settingsPanel = document.createElement('div')
  settingsPanel.id = 'ai-settings-panel'
  settingsPanel.className = 'ai-settings-panel'
  settingsPanel.hidden = true
  settingsPanel.innerHTML = `
    <div class="ai-settings-group">
      <label>Provider</label>
      <select id="ai-provider-select">
        <option value="ollama">Ollama (Local)</option>
        <option value="openai">OpenAI</option>
        <option value="custom">Custom API</option>
      </select>
    </div>
    <div class="ai-settings-group" id="ai-ollama-settings">
      <label>Ollama Model</label>
      <input type="text" id="ai-ollama-model" placeholder="qwen2.5:7b" />
      <label>Ollama Endpoint</label>
      <input type="text" id="ai-ollama-endpoint" placeholder="http://localhost:11434/v1/chat/completions" />
    </div>
    <div class="ai-settings-group" id="ai-cloud-settings" hidden>
      <label>API Key</label>
      <input type="password" id="ai-cloud-apikey" placeholder="sk-..." />
      <label>Model</label>
      <input type="text" id="ai-cloud-model" placeholder="gpt-4o-mini" />
      <label>Endpoint</label>
      <input type="text" id="ai-cloud-endpoint" placeholder="https://api.openai.com/v1/chat/completions" />
    </div>
    <button id="ai-settings-save" class="ai-settings-save-btn">Save Settings</button>
  `

  // Messages area
  sidebar.messagesContainer = document.createElement('div')
  sidebar.messagesContainer.className = 'ai-sidebar-messages'

  // Add welcome message
  addMessage('assistant', 'Привет! Я ваш ИИ-ассистент в браузере. Я могу:\n\n• Читать содержимое страниц\n• Кликать по элементам\n• Заполнять формы\n• Переходить по ссылкам\n• Прокручивать страницы\n\nЧем могу помочь?')

  // Input area
  var inputArea = document.createElement('div')
  inputArea.className = 'ai-sidebar-input-area'

  sidebar.input = document.createElement('textarea')
  sidebar.input.className = 'ai-sidebar-input'
  sidebar.input.placeholder = 'Напишите задачу...'
  sidebar.input.rows = 2
  sidebar.input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
    // Auto-resize
    this.style.height = 'auto'
    this.style.height = Math.min(this.scrollHeight, 120) + 'px'
  })

  var sendBtn = document.createElement('button')
  sendBtn.className = 'ai-sidebar-send-btn'
  sendBtn.textContent = '➤'
  sendBtn.addEventListener('click', sendMessage)

  inputArea.appendChild(sidebar.input)
  inputArea.appendChild(sendBtn)

  // Assemble
  sidebar.container.appendChild(header)
  sidebar.container.appendChild(settingsPanel)
  sidebar.container.appendChild(sidebar.messagesContainer)
  sidebar.container.appendChild(inputArea)

  document.body.appendChild(sidebar.container)

  // Load saved settings
  loadSettings()
  checkConnection()
}

function addMessage (role, content, type) {
  var msg = document.createElement('div')
  msg.className = 'ai-message ai-message-' + role

  if (type === 'tool_call') {
    msg.className += ' ai-message-tool'
    msg.innerHTML = '<span class="ai-tool-icon">🔧</span> ' + escapeHtml(content)
  } else if (type === 'tool_result') {
    msg.className += ' ai-message-tool-result'
    msg.innerHTML = '<span class="ai-tool-icon">📋</span> ' + escapeHtml(content)
  } else if (type === 'thinking') {
    msg.className += ' ai-message-thinking'
    msg.innerHTML = '<span class="ai-thinking-dots">⏳</span> ' + escapeHtml(content)
    msg.id = 'ai-thinking-msg'
  } else if (type === 'error') {
    msg.className += ' ai-message-error'
    msg.innerHTML = '❌ ' + escapeHtml(content)
  } else {
    // Format content with basic markdown (bold, newlines)
    var formatted = escapeHtml(content)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
      .replace(/• /g, '&bull; ')
    msg.innerHTML = formatted
  }

  sidebar.messagesContainer.appendChild(msg)
  sidebar.messagesContainer.scrollTop = sidebar.messagesContainer.scrollHeight
  return msg
}

function removeThinkingMessage () {
  var el = document.getElementById('ai-thinking-msg')
  if (el) el.remove()
}

function escapeHtml (text) {
  var div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

async function sendMessage () {
  if (sidebar.isProcessing) return

  var text = sidebar.input.value.trim()
  if (!text) return

  sidebar.input.value = ''
  sidebar.input.style.height = 'auto'

  // Show user message
  addMessage('user', text)

  sidebar.isProcessing = true
  updateStatus('working')

  try {
    var result = await agentLoop.run(text, sidebar.conversationHistory, function (type, data) {
      switch (type) {
        case 'thinking':
          removeThinkingMessage()
          addMessage('assistant', 'Думаю... (шаг ' + data.iteration + ')', 'thinking')
          break
        case 'tool_call':
          removeThinkingMessage()
          var argsStr = Object.keys(data.args).map(function (k) { return k + '=' + JSON.stringify(data.args[k]) }).join(', ')
          addMessage('assistant', data.name + '(' + argsStr + ')', 'tool_call')
          break
        case 'tool_result':
          var resultStr = typeof data.result === 'object' ? JSON.stringify(data.result).substring(0, 200) : String(data.result).substring(0, 200)
          addMessage('assistant', resultStr, 'tool_result')
          break
        case 'error':
          removeThinkingMessage()
          addMessage('assistant', data.message, 'error')
          break
        // 'response' is handled below
      }
    })

    removeThinkingMessage()

    if (result.response) {
      addMessage('assistant', result.response)
    }

    sidebar.conversationHistory = result.history || []
  } catch (e) {
    removeThinkingMessage()
    addMessage('assistant', 'Ошибка: ' + e.message, 'error')
  }

  sidebar.isProcessing = false
  updateStatus('online')
}

function clearConversation () {
  sidebar.conversationHistory = []
  while (sidebar.messagesContainer.firstChild) {
    sidebar.messagesContainer.removeChild(sidebar.messagesContainer.firstChild)
  }
  addMessage('assistant', 'Разговор очищен. Чем могу помочь?')
}

function toggle () {
  sidebar.isVisible = !sidebar.isVisible
  if (sidebar.isVisible) {
    sidebar.container.className = 'ai-sidebar-visible'
    document.getElementById('webviews').classList.add('ai-sidebar-active')
    sidebar.input.focus()
  } else {
    sidebar.container.className = 'ai-sidebar-hidden'
    document.getElementById('webviews').classList.remove('ai-sidebar-active')
  }
}

function toggleSettings () {
  var panel = document.getElementById('ai-settings-panel')
  panel.hidden = !panel.hidden
}

function loadSettings () {
  var providerSelect = document.getElementById('ai-provider-select')
  var ollamaModel = document.getElementById('ai-ollama-model')
  var ollamaEndpoint = document.getElementById('ai-ollama-endpoint')
  var cloudApiKey = document.getElementById('ai-cloud-apikey')
  var cloudModel = document.getElementById('ai-cloud-model')
  var cloudEndpoint = document.getElementById('ai-cloud-endpoint')

  providerSelect.value = settings.get('aiProvider') || 'ollama'
  ollamaModel.value = settings.get('aiOllamaModel') || 'qwen2.5:7b'
  ollamaEndpoint.value = settings.get('aiOllamaEndpoint') || 'http://localhost:11434/v1/chat/completions'
  cloudApiKey.value = settings.get('aiCloudApiKey') || ''
  cloudModel.value = settings.get('aiCloudModel') || 'gpt-4o-mini'
  cloudEndpoint.value = settings.get('aiCloudEndpoint') || 'https://api.openai.com/v1/chat/completions'

  updateProviderUI(providerSelect.value)

  providerSelect.addEventListener('change', function () {
    updateProviderUI(this.value)
  })

  document.getElementById('ai-settings-save').addEventListener('click', saveSettings)
}

function updateProviderUI (provider) {
  var ollamaSettings = document.getElementById('ai-ollama-settings')
  var cloudSettings = document.getElementById('ai-cloud-settings')

  if (provider === 'ollama') {
    ollamaSettings.hidden = false
    cloudSettings.hidden = true
  } else {
    ollamaSettings.hidden = true
    cloudSettings.hidden = false
  }
}

function saveSettings () {
  var provider = document.getElementById('ai-provider-select').value
  settings.set('aiProvider', provider)
  settings.set('aiOllamaModel', document.getElementById('ai-ollama-model').value)
  settings.set('aiOllamaEndpoint', document.getElementById('ai-ollama-endpoint').value)
  settings.set('aiCloudApiKey', document.getElementById('ai-cloud-apikey').value)
  settings.set('aiCloudModel', document.getElementById('ai-cloud-model').value)
  settings.set('aiCloudEndpoint', document.getElementById('ai-cloud-endpoint').value)

  toggleSettings()
  checkConnection()
}

async function checkConnection () {
  try {
    var config = llmClient.getConfig()
    var endpoint = config.provider === 'ollama'
      ? config.ollamaEndpoint.replace('/v1/chat/completions', '/api/tags')
      : config.cloudEndpoint

    if (config.provider === 'ollama') {
      var resp = await fetch(config.ollamaEndpoint.replace('/v1/chat/completions', '/api/tags'))
      if (resp.ok) {
        updateStatus('online')
        return
      }
    }
    updateStatus('offline')
  } catch (e) {
    updateStatus('offline')
  }
}

function updateStatus (status) {
  var dot = document.getElementById('ai-status-dot')
  if (!dot) return
  dot.className = 'ai-status-dot ai-status-' + status
}

function initialize () {
  createSidebar()

  // Check connection periodically
  setInterval(checkConnection, 30000)
}

module.exports = {
  initialize,
  toggle,
  isVisible: function () { return sidebar.isVisible }
}

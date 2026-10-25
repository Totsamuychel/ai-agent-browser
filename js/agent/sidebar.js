/**
 * AI Sidebar
 * The chat UI panel for interacting with the AI agent.
 */

var agentLoop = require('agent/agentLoop.js')
var llmClient = require('agent/llmClient.js')
var settings = require('util/settings/settings.js')
var browserUI = require('browserUI.js')

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
  title.textContent = '🤖 Comet AI Agent'

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
  settingsBtn.title = 'Настройки моделей (Ollama / Cloud)'
  settingsBtn.addEventListener('click', toggleSettings)

  var clearBtn = document.createElement('button')
  clearBtn.className = 'ai-sidebar-btn'
  clearBtn.textContent = '🗑️'
  clearBtn.title = 'Очистить контекст'
  clearBtn.addEventListener('click', clearConversation)

  var closeBtn = document.createElement('button')
  closeBtn.className = 'ai-sidebar-btn'
  closeBtn.textContent = '✕'
  closeBtn.title = 'Закрыть панель'
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
      <label>Провайдер модели</label>
      <select id="ai-provider-select">
        <option value="ollama">Ollama (Локально: Qwen 2.5, Llama 3.1)</option>
        <option value="openai">OpenAI / Compatible</option>
        <option value="custom">Пользовательский API</option>
      </select>
    </div>
    <div class="ai-settings-group" id="ai-ollama-settings">
      <label>Модель Ollama</label>
      <input type="text" id="ai-ollama-model" placeholder="qwen2.5:7b" />
      <label>Ollama Endpoint</label>
      <input type="text" id="ai-ollama-endpoint" placeholder="http://localhost:11434/v1/chat/completions" />
    </div>
    <div class="ai-settings-group" id="ai-cloud-settings" hidden>
      <label>API Key</label>
      <input type="password" id="ai-cloud-apikey" placeholder="sk-..." />
      <label>Модель</label>
      <input type="text" id="ai-cloud-model" placeholder="gpt-4o-mini" />
      <label>Endpoint</label>
      <input type="text" id="ai-cloud-endpoint" placeholder="https://api.openai.com/v1/chat/completions" />
    </div>
    <button id="ai-settings-save" class="ai-settings-save-btn">Сохранить настройки</button>
  `

  // Messages area
  sidebar.messagesContainer = document.createElement('div')
  sidebar.messagesContainer.className = 'ai-sidebar-messages'

  // Quick Action Chips bar
  var quickActionsBar = document.createElement('div')
  quickActionsBar.className = 'ai-quick-actions-bar'
  quickActionsBar.innerHTML = `
    <button class="ai-chip" data-action="summarize_tab">📝 Суммаризировать</button>
    <button class="ai-chip" data-action="deep_research">🔬 Deep Research</button>
    <button class="ai-chip" data-action="web_search">🌐 Поиск в сети</button>
    <button class="ai-chip" data-action="tabs_info">📑 Все вкладки</button>
  `

  quickActionsBar.addEventListener('click', function (e) {
    var chip = e.target.closest('.ai-chip')
    if (!chip) return
    var action = chip.getAttribute('data-action')
    handleQuickAction(action)
  })

  // Add welcome message
  addMessage('assistant', 'Привет! Я агент браузера типа Comet с поддержкой поиска в реальном времени и глубокого исследования.\n\n' +
    '• **🌐 Поиск в сети** — найду свежую информацию со ссылками на источники\n' +
    '• **🔬 Deep Research** — исследую тему сразу по нескольким источникам\n' +
    '• **📝 Суммаризация** — кратко перескажу текущую или любую страницу\n' +
    '• **⚡ Действия на странице** — кликаю, заполняю формы, перехожу по ссылкам\n\n' +
    'Напишите задачу или выберите быстрое действие выше!')

  // Input area
  var inputArea = document.createElement('div')
  inputArea.className = 'ai-sidebar-input-area'

  sidebar.input = document.createElement('textarea')
  sidebar.input.className = 'ai-sidebar-input'
  sidebar.input.placeholder = 'Спросить или дать команду агенту...'
  sidebar.input.rows = 2
  sidebar.input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
    this.style.height = 'auto'
    this.style.height = Math.min(this.scrollHeight, 120) + 'px'
  })

  var sendBtn = document.createElement('button')
  sendBtn.className = 'ai-sidebar-send-btn'
  sendBtn.textContent = '➤'
  sendBtn.title = 'Отправить'
  sendBtn.addEventListener('click', function () { sendMessage() })

  inputArea.appendChild(sidebar.input)
  inputArea.appendChild(sendBtn)

  // Delegate clicks on source links inside messages to open in new tab
  sidebar.messagesContainer.addEventListener('click', function (e) {
    var target = e.target.closest('a')
    if (target && target.href) {
      e.preventDefault()
      browserUI.addTab(tabs.add({ url: target.href }), { enterEditMode: false, openInBackground: false })
    }
  })

  // Assemble
  sidebar.container.appendChild(header)
  sidebar.container.appendChild(settingsPanel)
  sidebar.container.appendChild(quickActionsBar)
  sidebar.container.appendChild(sidebar.messagesContainer)
  sidebar.container.appendChild(inputArea)

  document.body.appendChild(sidebar.container)

  // Load saved settings
  loadSettings()
  checkConnection()
}

function handleQuickAction (action) {
  if (action === 'summarize_tab') {
    var tab = tabs.get(tabs.getSelected())
    var title = tab ? (tab.title || tab.url) : 'эту страницу'
    ask('Пожалуйста, прочитай и суммаризируй текущую вкладку ("' + title + '"). Выдели 4-6 ключевых тезисов и выводов.')
  } else if (action === 'deep_research') {
    sidebar.input.value = 'Сделай Deep Research по теме: '
    sidebar.input.focus()
  } else if (action === 'web_search') {
    sidebar.input.value = 'Найди в интернете и дай ссылки на источники: '
    sidebar.input.focus()
  } else if (action === 'tabs_info') {
    ask('Покажи список всех открытых вкладок и кратко опиши, что в них открыто.')
  }
}

function formatMarkdown (content) {
  var escaped = escapeHtml(content)

  // Code blocks ```code```
  escaped = escaped.replace(/```([\s\S]*?)```/g, function (match, p1) {
    return '<pre class="ai-code-block"><code>' + p1 + '</code></pre>'
  })

  // Inline code `code`
  escaped = escaped.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>')

  // Markdown links [Text](URL) -> <a href="URL" class="ai-source-link">Text</a>
  escaped = escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" class="ai-source-link" target="_blank" title="$2">$1 ↗</a>')

  // Headers ###, ##, #
  escaped = escaped.replace(/^### (.*$)/gim, '<h4 class="ai-md-h4">$1</h4>')
  escaped = escaped.replace(/^## (.*$)/gim, '<h3 class="ai-md-h3">$1</h3>')
  escaped = escaped.replace(/^# (.*$)/gim, '<h3 class="ai-md-h3">$1</h3>')

  // Bold **text**
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

  // Lists
  escaped = escaped.replace(/^\s*[-*•] (.*$)/gim, '<li class="ai-md-li">$1</li>')

  // Line breaks
  escaped = escaped.replace(/\n/g, '<br>')

  return escaped
}

function addMessage (role, content, type) {
  var msg = document.createElement('div')
  msg.className = 'ai-message ai-message-' + role

  if (type === 'tool_call') {
    msg.className += ' ai-message-tool'
    msg.innerHTML = '<span class="ai-tool-icon">⚡</span> ' + escapeHtml(content)
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
    msg.innerHTML = formatMarkdown(content)
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
  div.textContent = text || ''
  return div.innerHTML
}

async function sendMessage (customText) {
  if (sidebar.isProcessing) return

  var text = customText || sidebar.input.value.trim()
  if (!text) return

  if (!customText) {
    sidebar.input.value = ''
    sidebar.input.style.height = 'auto'
  }

  // Show user message
  addMessage('user', text)

  sidebar.isProcessing = true
  updateStatus('working')

  try {
    var result = await agentLoop.run(text, sidebar.conversationHistory, function (type, data) {
      switch (type) {
        case 'thinking':
          removeThinkingMessage()
          addMessage('assistant', 'Агент размышляет и выполняет действия... (шаг ' + data.iteration + ')', 'thinking')
          break
        case 'tool_call':
          removeThinkingMessage()
          var argsSummary = Object.keys(data.args).map(function (k) {
            var val = data.args[k]
            if (typeof val === 'string' && val.length > 50) val = val.substring(0, 47) + '...'
            return k + '=' + JSON.stringify(val)
          }).join(', ')
          addMessage('assistant', data.name + '(' + argsSummary + ')', 'tool_call')
          break
        case 'tool_result':
          var resultStr = ''
          if (data.result && data.result.results && Array.isArray(data.result.results)) {
            resultStr = 'Найдено источников: ' + data.result.results.length
          } else if (typeof data.result === 'object') {
            resultStr = JSON.stringify(data.result).substring(0, 180)
          } else {
            resultStr = String(data.result).substring(0, 180)
          }
          addMessage('assistant', resultStr, 'tool_result')
          break
        case 'error':
          removeThinkingMessage()
          addMessage('assistant', data.message, 'error')
          break
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

function ask (prompt) {
  if (!sidebar.isVisible) {
    toggle()
  }
  sendMessage(prompt)
}

function clearConversation () {
  sidebar.conversationHistory = []
  while (sidebar.messagesContainer.firstChild) {
    sidebar.messagesContainer.removeChild(sidebar.messagesContainer.firstChild)
  }
  addMessage('assistant', 'Контекст очищен. Чем могу помочь?')
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

function open () {
  if (!sidebar.isVisible) {
    toggle()
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
    if (config.provider === 'ollama') {
      var endpoint = config.ollamaEndpoint.replace('/v1/chat/completions', '/api/tags')
      var resp = await fetch(endpoint)
      if (resp.ok) {
        updateStatus('online')
        return
      }
    } else {
      updateStatus('online')
      return
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
  setInterval(checkConnection, 30000)
}

module.exports = {
  initialize,
  toggle,
  open,
  ask,
  formatMarkdown,
  isVisible: function () { return sidebar.isVisible }
}

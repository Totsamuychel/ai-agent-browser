/**
 * New Tab Page AI Hub
 * Comet-style interactive New Tab Page:
 * - Animated greeting "Добро пожаловать, мистер батник"
 * - Toggle between standard search engine and AI agent search
 * - Model switcher between Local (Ollama) and Cloud (API)
 * - Deep research, live answer stream, and citations
 */

var agentLoop = require('agent/agentLoop.js')
var sidebar = require('agent/sidebar.js')
var browserUI = require('browserUI.js')
var webviews = require('webviews.js')
var llmClient = require('agent/llmClient.js')
var settings = require('util/settings/settings.js')

var SEARCH_ENGINES = {
  duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s' },
  google: { name: 'Google', url: 'https://www.google.com/search?q=%s' },
  yandex: { name: 'Яндекс', url: 'https://yandex.ru/search/?text=%s' }
}

var ntpAiHub = {
  searchMode: 'ai_search', // 'standard' | 'ai_search' | 'research' | 'chat'
  standardEngine: 'duckduckgo',
  isProcessing: false,
  history: []
}

function initialize () {
  var ntpContent = document.getElementById('ntp-content')
  if (!ntpContent) return

  // Remove existing hub if any
  var oldHub = document.getElementById('ntp-ai-hub')
  if (oldHub) oldHub.remove()

  var config = llmClient.getConfig()
  var currentProvider = config.provider // 'ollama' | 'openai' | 'custom'
  var isLocal = currentProvider === 'ollama'
  var currentModel = isLocal ? config.ollamaModel : config.cloudModel

  var hub = document.createElement('div')
  hub.id = 'ntp-ai-hub'
  hub.innerHTML = `
    <!-- Animated Greeting Hero -->
    <div class="ntp-hero-section">
      <div class="ntp-badge">
        <span class="ntp-badge-icon">☄️</span>
        <span>Comet AI Browser</span>
      </div>
      <h1 class="ntp-greeting-title">
        <span class="ntp-greeting-wave">👋</span>
        <span class="ntp-greeting-text">Добро пожаловать, мистер батник</span>
      </h1>
      <p class="ntp-subtitle">Интеллектуальный браузер • Поиск в реальном времени, Deep Research и локальные модели</p>
    </div>

    <!-- Main Search Card -->
    <div class="ntp-search-card">
      <!-- Mode Tabs (Standard Search vs AI Agent Search vs Deep Research vs Chat) -->
      <div class="ntp-mode-selector">
        <button class="ntp-mode-tab active" data-mode="ai_search">
          <span class="ntp-tab-icon">🤖</span>
          <span>ИИ-поиск Comet</span>
        </button>
        <button class="ntp-mode-tab" data-mode="research">
          <span class="ntp-tab-icon">🔬</span>
          <span>Deep Research</span>
        </button>
        <button class="ntp-mode-tab" data-mode="standard">
          <span class="ntp-tab-icon">🌐</span>
          <span>Обычный веб-поиск</span>
        </button>
        <button class="ntp-mode-tab" data-mode="chat">
          <span class="ntp-tab-icon">💬</span>
          <span>Диалог с ИИ</span>
        </button>
      </div>

      <!-- Engine Selector for Standard Search (hidden by default) -->
      <div class="ntp-standard-engine-bar" id="ntp-engine-bar" hidden>
        <span class="ntp-engine-label">Поисковик:</span>
        <div class="ntp-engine-pills">
          <button class="ntp-engine-pill active" data-engine="duckduckgo">DuckDuckGo</button>
          <button class="ntp-engine-pill" data-engine="google">Google</button>
          <button class="ntp-engine-pill" data-engine="yandex">Яндекс</button>
        </div>
      </div>

      <!-- Input Field -->
      <div class="ntp-input-wrapper">
        <textarea id="ntp-hub-input" placeholder="Задайте вопрос с поиском по интернету в реальном времени..." rows="2"></textarea>
      </div>

      <!-- Bottom Toolbar: Model Switcher & Submit Button -->
      <div class="ntp-card-footer">
        <!-- Model Selection Pills -->
        <div class="ntp-model-bar">
          <div class="ntp-provider-toggle">
            <button class="ntp-prov-btn ${isLocal ? 'active' : ''}" id="ntp-prov-local" data-provider="ollama">
              <span class="prov-icon">🏠</span> Локальная (Ollama)
            </button>
            <button class="ntp-prov-btn ${!isLocal ? 'active' : ''}" id="ntp-prov-cloud" data-provider="openai">
              <span class="prov-icon">☁️</span> Облачная (API)
            </button>
          </div>

          <!-- Model Dropdown -->
          <select id="ntp-model-select" class="ntp-model-dropdown">
            ${renderModelOptions(isLocal, currentModel)}
          </select>

          <!-- Status Indicator & Settings Button -->
          <div class="ntp-model-status-wrap">
            <span class="ntp-live-dot" id="ntp-live-dot"></span>
            <span class="ntp-live-status-text" id="ntp-live-status-text">Проверка...</span>
            <button id="ntp-btn-quick-settings" class="ntp-quick-settings-btn" title="Настройки подключения (API ключ, хост)">⚙️</button>
          </div>
        </div>

        <!-- Submit Button -->
        <button id="ntp-submit-btn" class="ntp-btn-submit">
          <span id="ntp-submit-label">Спросить ИИ</span>
          <span class="ntp-arrow">➤</span>
        </button>
      </div>
    </div>

    <!-- Quick Suggestions Bar -->
    <div class="ntp-suggestions-bar">
      <button class="ntp-sug-chip" data-query="Сделай Deep Research по последним трендам ИИ 2026 года с источниками">
        🔬 Тренды ИИ 2026
      </button>
      <button class="ntp-sug-chip" data-query="Найди главные новости технологий за сегодня и дай ссылки на источники">
        🌐 Новости технологий
      </button>
      <button class="ntp-sug-chip" data-query="Суммаризируй все открытые вкладки в браузере">
        📑 Анализ открытых вкладок
      </button>
      <button class="ntp-sug-chip" data-query="Объясни простыми словами, как работают квантовые компьютеры">
        💡 Квантовые компьютеры
      </button>
    </div>

    <!-- Live Answer & Research Results Box -->
    <div id="ntp-answer-box" class="ntp-answer-box" hidden>
      <div class="ntp-answer-header">
        <div class="ntp-answer-title" id="ntp-answer-title">
          <span class="ntp-ans-icon">✨</span> Результат исследования
        </div>
        <div class="ntp-answer-controls">
          <button id="ntp-btn-sidebar" class="ntp-control-btn" title="Открыть этот диалог в боковой панели">В боковую панель ↗</button>
          <button id="ntp-btn-clear" class="ntp-control-btn">Очистить</button>
        </div>
      </div>

      <div id="ntp-steps-trail" class="ntp-steps-trail" hidden></div>
      <div id="ntp-sources-container" class="ntp-sources-container" hidden></div>
      <div id="ntp-answer-text" class="ntp-answer-text"></div>
    </div>

    <!-- Quick Settings Modal (Popup) -->
    <div id="ntp-modal-settings" class="ntp-modal-backdrop" hidden>
      <div class="ntp-modal-box">
        <div class="ntp-modal-header">
          <h3>⚙️ Настройки моделей</h3>
          <button id="ntp-modal-close" class="ntp-modal-close-btn">✕</button>
        </div>
        <div class="ntp-modal-body">
          <div class="ntp-field-group">
            <label>Адрес Ollama (локально)</label>
            <input type="text" id="ntp-set-ollama-url" value="${config.ollamaEndpoint}" placeholder="http://localhost:11434/v1/chat/completions" />
          </div>
          <div class="ntp-field-group">
            <label>API Ключ для облачных моделей (OpenAI / OpenRouter / Custom)</label>
            <input type="password" id="ntp-set-cloud-key" value="${config.cloudApiKey}" placeholder="sk-..." />
          </div>
          <div class="ntp-field-group">
            <label>Эндпоинт облачного API</label>
            <input type="text" id="ntp-set-cloud-url" value="${config.cloudEndpoint}" placeholder="https://api.openai.com/v1/chat/completions" />
          </div>
        </div>
        <div class="ntp-modal-footer">
          <button id="ntp-modal-save" class="ntp-btn-modal-save">Сохранить</button>
        </div>
      </div>
    </div>
  `

  ntpContent.appendChild(hub)

  bindEvents()
  checkLiveStatus()
}

function renderModelOptions (isLocal, currentModel) {
  var list = isLocal ? llmClient.POPULAR_LOCAL_MODELS : llmClient.POPULAR_CLOUD_MODELS
  var html = ''
  var found = false

  list.forEach(function (m) {
    var selected = m.id === currentModel ? 'selected' : ''
    if (selected) found = true
    html += '<option value="' + m.id + '" ' + selected + '>' + m.name + '</option>'
  })

  if (!found && currentModel) {
    html += '<option value="' + currentModel + '" selected>' + currentModel + ' (Пользовательская)</option>'
  }

  return html
}

function bindEvents () {
  var input = document.getElementById('ntp-hub-input')
  var submitBtn = document.getElementById('ntp-submit-btn')
  var submitLabel = document.getElementById('ntp-submit-label')
  var modeSelector = document.querySelector('.ntp-mode-selector')
  var engineBar = document.getElementById('ntp-engine-bar')
  var sugBar = document.querySelector('.ntp-suggestions-bar')
  var sidebarBtn = document.getElementById('ntp-btn-sidebar')
  var clearBtn = document.getElementById('ntp-btn-clear')
  var provLocalBtn = document.getElementById('ntp-prov-local')
  var provCloudBtn = document.getElementById('ntp-prov-cloud')
  var modelSelect = document.getElementById('ntp-model-select')
  var quickSettingsBtn = document.getElementById('ntp-btn-quick-settings')
  var modalSettings = document.getElementById('ntp-modal-settings')
  var modalCloseBtn = document.getElementById('ntp-modal-close')
  var modalSaveBtn = document.getElementById('ntp-modal-save')

  // Mode switching
  modeSelector.addEventListener('click', function (e) {
    var btn = e.target.closest('.ntp-mode-tab')
    if (!btn) return
    document.querySelectorAll('.ntp-mode-tab').forEach(function (b) { b.classList.remove('active') })
    btn.classList.add('active')
    ntpAiHub.searchMode = btn.getAttribute('data-mode')

    if (ntpAiHub.searchMode === 'standard') {
      engineBar.hidden = false
      submitLabel.textContent = 'Искать в ' + SEARCH_ENGINES[ntpAiHub.standardEngine].name
      input.placeholder = 'Введите поисковый запрос для перехода на сайт...'
    } else if (ntpAiHub.searchMode === 'research') {
      engineBar.hidden = true
      submitLabel.textContent = 'Исследовать тему'
      input.placeholder = 'Введите тему для глубокого анализа сразу по нескольким источникам...'
    } else if (ntpAiHub.searchMode === 'chat') {
      engineBar.hidden = true
      submitLabel.textContent = 'Отправить ИИ'
      input.placeholder = 'Пообщаться с ИИ или попросить выполнить команду...'
    } else {
      engineBar.hidden = true
      submitLabel.textContent = 'Спросить ИИ'
      input.placeholder = 'Задайте вопрос с поиском по интернету в реальном времени...'
    }
  })

  // Engine pills for standard search
  engineBar.addEventListener('click', function (e) {
    var pill = e.target.closest('.ntp-engine-pill')
    if (!pill) return
    document.querySelectorAll('.ntp-engine-pill').forEach(function (p) { p.classList.remove('active') })
    pill.classList.add('active')
    ntpAiHub.standardEngine = pill.getAttribute('data-engine')
    submitLabel.textContent = 'Искать в ' + SEARCH_ENGINES[ntpAiHub.standardEngine].name
  })

  // Provider toggle (Local vs Cloud)
  provLocalBtn.addEventListener('click', function () {
    provLocalBtn.classList.add('active')
    provCloudBtn.classList.remove('active')
    llmClient.saveConfig({ provider: 'ollama' })
    modelSelect.innerHTML = renderModelOptions(true, llmClient.getConfig().ollamaModel)
    checkLiveStatus()
  })

  provCloudBtn.addEventListener('click', function () {
    provCloudBtn.classList.add('active')
    provLocalBtn.classList.remove('active')
    llmClient.saveConfig({ provider: 'openai' })
    modelSelect.innerHTML = renderModelOptions(false, llmClient.getConfig().cloudModel)
    checkLiveStatus()
  })

  // Model select change
  modelSelect.addEventListener('change', function () {
    var val = this.value
    var config = llmClient.getConfig()
    if (config.provider === 'ollama') {
      llmClient.saveConfig({ ollamaModel: val })
    } else {
      llmClient.saveConfig({ cloudModel: val })
    }
  })

  // Quick settings modal
  quickSettingsBtn.addEventListener('click', function () {
    modalSettings.hidden = false
  })

  modalCloseBtn.addEventListener('click', function () {
    modalSettings.hidden = true
  })

  modalSaveBtn.addEventListener('click', function () {
    var ollamaUrl = document.getElementById('ntp-set-ollama-url').value.trim()
    var cloudKey = document.getElementById('ntp-set-cloud-key').value.trim()
    var cloudUrl = document.getElementById('ntp-set-cloud-url').value.trim()

    llmClient.saveConfig({
      ollamaEndpoint: ollamaUrl,
      cloudApiKey: cloudKey,
      cloudEndpoint: cloudUrl
    })

    modalSettings.hidden = true
    checkLiveStatus()
  })

  // Submit on button or Enter
  submitBtn.addEventListener('click', function () {
    handleSubmit()
  })

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  })

  // Suggestions
  sugBar.addEventListener('click', function (e) {
    var chip = e.target.closest('.ntp-sug-chip')
    if (!chip) return
    var query = chip.getAttribute('data-query')
    input.value = query
    handleSubmit()
  })

  // Transfer to sidebar
  sidebarBtn.addEventListener('click', function () {
    sidebar.open()
  })

  // Clear answer
  clearBtn.addEventListener('click', function () {
    var box = document.getElementById('ntp-answer-box')
    box.hidden = true
    document.getElementById('ntp-steps-trail').innerHTML = ''
    document.getElementById('ntp-steps-trail').hidden = true
    document.getElementById('ntp-sources-container').innerHTML = ''
    document.getElementById('ntp-sources-container').hidden = true
    document.getElementById('ntp-answer-text').innerHTML = ''
  })

  // Clicks on sources inside answer
  document.getElementById('ntp-answer-box').addEventListener('click', function (e) {
    var link = e.target.closest('a')
    if (link && link.href) {
      e.preventDefault()
      browserUI.addTab(tabs.add({ url: link.href }), { enterEditMode: false, openInBackground: false })
    }
  })
}

async function checkLiveStatus () {
  var dot = document.getElementById('ntp-live-dot')
  var text = document.getElementById('ntp-live-status-text')
  if (!dot || !text) return

  var config = llmClient.getConfig()

  if (config.provider === 'ollama') {
    text.textContent = 'Проверка Ollama...'
    var status = await llmClient.checkOllamaStatus()
    if (status.online) {
      dot.className = 'ntp-live-dot dot-online'
      text.textContent = 'Ollama подключена (' + (status.installedModels.length > 0 ? status.installedModels.length + ' мод.' : 'сервер готов') + ')'
    } else {
      dot.className = 'ntp-live-dot dot-offline'
      text.textContent = 'Ollama не запущена (localhost:11434)'
    }
  } else {
    if (config.cloudApiKey) {
      dot.className = 'ntp-live-dot dot-online'
      text.textContent = 'Cloud API готов'
    } else {
      dot.className = 'ntp-live-dot dot-warn'
      text.textContent = 'Требуется API ключ (⚙️)'
    }
  }
}

async function handleSubmit () {
  var input = document.getElementById('ntp-hub-input')
  var text = input.value.trim()
  if (!text) return

  // If STANDARD SEARCH is selected, open the search engine directly in the current tab!
  if (ntpAiHub.searchMode === 'standard') {
    var engine = SEARCH_ENGINES[ntpAiHub.standardEngine] || SEARCH_ENGINES.duckduckgo
    var searchUrl = engine.url.replace('%s', encodeURIComponent(text))
    var currentTabId = tabs.getSelected()
    webviews.update(currentTabId, searchUrl)
    return
  }

  // Otherwise, run AI Agent search / Deep Research / Chat
  if (ntpAiHub.isProcessing) return

  var prompt = text
  if (ntpAiHub.searchMode === 'research' && !text.toLowerCase().includes('research') && !text.toLowerCase().includes('исслед')) {
    prompt = 'Проведи deep research по теме: ' + text + '. Найди несколько источников, изучи их и дай структурированный отчет со ссылками.'
  } else if (ntpAiHub.searchMode === 'ai_search' && !text.toLowerCase().includes('найди') && !text.toLowerCase().includes('поиск')) {
    prompt = 'Найди в интернете актуальную информацию по запросу: ' + text + '. Обязательно дай ссылки на источники.'
  }

  var answerBox = document.getElementById('ntp-answer-box')
  var stepsTrail = document.getElementById('ntp-steps-trail')
  var sourcesContainer = document.getElementById('ntp-sources-container')
  var answerText = document.getElementById('ntp-answer-text')

  answerBox.hidden = false
  stepsTrail.hidden = false
  stepsTrail.innerHTML = '<span class="ntp-step-badge ntp-step-active">⏳ Инициализация агента...</span>'
  sourcesContainer.hidden = true
  sourcesContainer.innerHTML = ''
  answerText.innerHTML = ''

  ntpAiHub.isProcessing = true
  var submitBtn = document.getElementById('ntp-submit-btn')
  submitBtn.disabled = true
  submitBtn.classList.add('loading')

  try {
    var result = await agentLoop.run(prompt, ntpAiHub.history, function (type, data) {
      switch (type) {
        case 'thinking':
          stepsTrail.innerHTML = '<span class="ntp-step-badge ntp-step-active">🧠 Размышление и анализ (шаг ' + data.iteration + ')...</span>'
          break
        case 'tool_call':
          if (data.name === 'searchWeb') {
            stepsTrail.innerHTML = '<span class="ntp-step-badge ntp-step-tool">🌐 Поиск в интернете: "' + (data.args.query || '') + '"</span>'
          } else if (data.name === 'fetchPageContent') {
            stepsTrail.innerHTML = '<span class="ntp-step-badge ntp-step-tool">📖 Чтение страницы: ' + (data.args.url || '').substring(0, 50) + '...</span>'
          } else if (data.name === 'deepResearch') {
            stepsTrail.innerHTML = '<span class="ntp-step-badge ntp-step-tool">🔬 Запуск автономного Deep Research...</span>'
          } else {
            stepsTrail.innerHTML = '<span class="ntp-step-badge ntp-step-tool">⚡ Выполняю: ' + data.name + '</span>'
          }
          break
        case 'tool_result':
          if (data.result && data.result.results && Array.isArray(data.result.results)) {
            sourcesContainer.hidden = false
            renderSourcesCards(sourcesContainer, data.result.results)
          } else if (data.result && data.result.sources && Array.isArray(data.result.sources)) {
            sourcesContainer.hidden = false
            renderSourcesCards(sourcesContainer, data.result.sources)
          }
          break
        case 'error':
          stepsTrail.innerHTML = '<span class="ntp-step-badge ntp-step-error">❌ ' + data.message + '</span>'
          break
      }
    })

    stepsTrail.innerHTML = '<span class="ntp-step-badge ntp-step-done">✅ Ответ сформирован</span>'

    if (result.response) {
      answerText.innerHTML = sidebar.formatMarkdown(result.response)
    }

    ntpAiHub.history = result.history || []
  } catch (err) {
    stepsTrail.innerHTML = '<span class="ntp-step-badge ntp-step-error">❌ Ошибка: ' + err.message + '</span>'
  }

  ntpAiHub.isProcessing = false
  submitBtn.disabled = false
  submitBtn.classList.remove('loading')
}

function renderSourcesCards (container, sources) {
  var html = '<div class="ntp-sources-title">Источники информации (' + sources.length + '):</div><div class="ntp-sources-list">'
  sources.forEach(function (s, idx) {
    var domain = ''
    try {
      domain = new URL(s.url).hostname.replace('www.', '')
    } catch (e) {
      domain = s.url || ''
    }
    html += `
      <a href="${s.url}" class="ntp-source-card" target="_blank" title="${s.url}">
        <div class="ntp-source-domain">🌐 ${domain}</div>
        <div class="ntp-source-name">${s.title || ('Источник ' + (idx + 1))}</div>
      </a>
    `
  })
  html += '</div>'
  container.innerHTML = html
}

module.exports = {
  initialize
}

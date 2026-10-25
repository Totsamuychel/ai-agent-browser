/**
 * New Tab Page AI Hub
 * Provides a Comet / Perplexity-style AI search, chat, and deep research interface
 * directly on the New Tab Page.
 */

var agentLoop = require('agent/agentLoop.js')
var sidebar = require('agent/sidebar.js')
var browserUI = require('browserUI.js')
var llmClient = require('agent/llmClient.js')

var ntpAiHub = {
  currentMode: 'search', // 'search' | 'research' | 'chat'
  isProcessing: false,
  history: []
}

function initialize () {
  var ntpContent = document.getElementById('ntp-content')
  if (!ntpContent) return

  // Build the AI Hub container
  var hub = document.createElement('div')
  hub.id = 'ntp-ai-hub'
  hub.innerHTML = `
    <div class="ntp-hero-section">
      <div class="ntp-badge">✨ Comet AI Browser</div>
      <h1 class="ntp-title">О чем хотите узнать?</h1>
      <p class="ntp-subtitle">Поиск по интернету, глубокое исследование (Deep Research) и выполнение задач</p>
    </div>

    <div class="ntp-search-card">
      <div class="ntp-tabs-bar">
        <button class="ntp-mode-tab active" data-mode="search">🌐 Поиск в сети</button>
        <button class="ntp-mode-tab" data-mode="research">🔬 Deep Research</button>
        <button class="ntp-mode-tab" data-mode="chat">💬 Диалог с ИИ</button>
      </div>

      <div class="ntp-input-wrapper">
        <textarea id="ntp-hub-input" placeholder="Задайте вопрос, тему для исследования или команду браузеру..." rows="2"></textarea>
        <div class="ntp-input-footer">
          <div class="ntp-status-pill" id="ntp-status-pill">⚡ Готов к работе</div>
          <button id="ntp-submit-btn" class="ntp-btn-submit">
            <span>Спросить</span> <span class="ntp-arrow">➤</span>
          </button>
        </div>
      </div>
    </div>

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

    <!-- Live research and answer container -->
    <div id="ntp-answer-box" class="ntp-answer-box" hidden>
      <div class="ntp-answer-header">
        <div class="ntp-answer-title" id="ntp-answer-title">Ответ ассистента</div>
        <div class="ntp-answer-controls">
          <button id="ntp-btn-sidebar" class="ntp-control-btn" title="Открыть этот диалог в боковой панели">В боковую панель ↗</button>
          <button id="ntp-btn-clear" class="ntp-control-btn">Очистить</button>
        </div>
      </div>

      <div id="ntp-steps-trail" class="ntp-steps-trail" hidden></div>
      <div id="ntp-sources-container" class="ntp-sources-container" hidden></div>
      <div id="ntp-answer-text" class="ntp-answer-text"></div>
    </div>
  `

  ntpContent.appendChild(hub)

  bindEvents()
  updateModelStatus()
}

function updateModelStatus () {
  var pill = document.getElementById('ntp-status-pill')
  if (!pill) return
  var config = llmClient.getConfig()
  var providerLabel = config.provider === 'ollama' ? '⚡ ' + config.ollamaModel + ' (Ollama)' : '☁️ ' + config.cloudModel
  pill.textContent = providerLabel
}

function bindEvents () {
  var input = document.getElementById('ntp-hub-input')
  var submitBtn = document.getElementById('ntp-submit-btn')
  var tabsBar = document.querySelector('.ntp-tabs-bar')
  var sugBar = document.querySelector('.ntp-suggestions-bar')
  var sidebarBtn = document.getElementById('ntp-btn-sidebar')
  var clearBtn = document.getElementById('ntp-btn-clear')
  var sourcesContainer = document.getElementById('ntp-sources-container')

  // Mode switching
  tabsBar.addEventListener('click', function (e) {
    var btn = e.target.closest('.ntp-mode-tab')
    if (!btn) return
    document.querySelectorAll('.ntp-mode-tab').forEach(function (b) { b.classList.remove('active') })
    btn.classList.add('active')
    ntpAiHub.currentMode = btn.getAttribute('data-mode')

    if (ntpAiHub.currentMode === 'research') {
      input.placeholder = 'Введите сложную тему для глубокого анализа нескольких источников...'
    } else if (ntpAiHub.currentMode === 'search') {
      input.placeholder = 'Задайте вопрос с поиском по интернету в реальном времени...'
    } else {
      input.placeholder = 'Пообщаться с ИИ или попросить выполнить команду в браузере...'
    }
  })

  // Submit on button or Enter
  submitBtn.addEventListener('click', function () {
    handleSearch()
  })

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  })

  // Suggestion chips
  sugBar.addEventListener('click', function (e) {
    var chip = e.target.closest('.ntp-sug-chip')
    if (!chip) return
    var query = chip.getAttribute('data-query')
    input.value = query
    handleSearch()
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

async function handleSearch () {
  if (ntpAiHub.isProcessing) return
  var input = document.getElementById('ntp-hub-input')
  var text = input.value.trim()
  if (!text) return

  var prompt = text
  if (ntpAiHub.currentMode === 'research' && !text.toLowerCase().includes('research') && !text.toLowerCase().includes('исслед')) {
    prompt = 'Проведи deep research по теме: ' + text + '. Найди несколько источников, изучи их и дай структурированный отчет со ссылками.'
  } else if (ntpAiHub.currentMode === 'search' && !text.toLowerCase().includes('найди') && !text.toLowerCase().includes('поиск')) {
    prompt = 'Найди в интернете актуальную информацию по запросу: ' + text + '. Обязательно дай ссылки на источники.'
  }

  // Display answer box
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
            // Render sources cards!
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

    stepsTrail.innerHTML = '<span class="ntp-step-badge ntp-step-done">✅ Исследование завершено</span>'

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

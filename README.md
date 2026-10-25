# 🤖 Comet AI Browser

An advanced AI-powered web browser with built-in agentic intelligence, real-time web search, multi-source Deep Research, and page automation. Based on [Min Browser](https://github.com/minbrowser/min).

## 🚀 Key Features

- **🧠 Deeply Integrated AI Agent** — Embedded assistant that controls your browser, navigates tabs, fills forms, and extracts data.
- **🌐 Live Web Search & Scraping** — Autonomous web searching via DuckDuckGo without requiring any API keys.
- **🔬 Deep Research Engine** — Gathers intelligence across 3-5 live sources, parses their content, and synthesizes structured reports with citations.
- **📑 New Tab AI Hub (Comet / Perplexity style)** — Opening a new tab opens a full-fledged AI search & chat interface.
- **⚡ Toolbar Quick Actions Menu (`✨`)** — 1-click page summarization, deep research, and cross-tab analysis.
- **🖱️ Context Menu AI Integration** — Right-click any selection to explain, summarize, or research it with AI.
- **🔍 Address Bar AI Search** — Type `?query` or `/ai query` in the URL bar for instant AI answers.
- **🏠 100% Local LLM Support** — Works offline/privately with [Ollama](https://ollama.ai/) (Qwen 2.5, Llama 3.1, DeepSeek).
- **☁️ Cloud API Support** — Supports OpenAI (GPT-4o), Anthropic Claude, and custom OpenAI-compatible endpoints.

---

## 🛠️ Built-in Skills (Tools)

| Skill | Description |
|-------|-------------|
| `searchWeb` | Searches the live web using DuckDuckGo, returning titles, links, and snippets |
| `fetchPageContent` | Background HTTP crawler: parses full readable text from any web URL |
| `deepResearch` | Autonomous multi-source investigation with citations and source links |
| `manageTabs` | Cross-tab intelligence: list, switch, close, or summarize all open tabs |
| `getPageContent` | Reads clean text from the active tab |
| `getPageInfo` | Extracts interactive elements (buttons, inputs, links) with CSS selectors |
| `clickElement` | Clicks elements by CSS selector or visible text |
| `typeText` | Types into inputs with React/Vue synthetic event triggers |
| `navigate` | Opens URLs in current or new tabs |
| `scrollPage` | Smooth page scrolling up, down, top, or bottom |

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js** 18+ and **npm**
- **Ollama** (for local models): [ollama.ai](https://ollama.ai/)

### 2. Installation & Run
```bash
# Clone the repository
git clone https://github.com/Totsamuychel/ai-agent-browser.git
cd ai-agent-browser

# Install dependencies
npm install

# Pull a high-quality model for Ollama (recommended for agentic tasks)
ollama pull qwen2.5:7b

# Start the browser
npm start
```

---

## 💡 How to Use

### 1. New Tab AI Hub (Perplexity / Comet style)
Open a new tab to access the AI Hub:
- **🌐 Web Search Mode:** Ask real-time questions and get answers with clickable source cards.
- **🔬 Deep Research Mode:** Enter complex questions to have the agent research multiple articles in the background and write a synthesized report.
- **💬 Chat Mode:** Converse directly with the model.

### 2. AI Sidebar
Click **🤖** in the toolbar or press `Ctrl+Shift+A` to open the sidebar.
- Use quick-action chips: `📝 Суммаризировать`, `🔬 Deep Research`, `🌐 Поиск в сети`, `📑 Все вкладки`.
- Chat and watch the agent's live reasoning, tool executions, and source links.

### 3. Toolbar Quick Actions (`✨`)
Click the `✨` button in the top right to instantly:
- Summarize the current page
- Run Deep Research on the current page's topic
- Analyze all currently open tabs

### 4. Right-Click Context Menu
Highlight any text on a page, right-click, and select:
- `🤖 Спросить ИИ об этом`
- `🔬 Deep Research по этой теме`
- `📝 Суммаризировать выделенное`

### 5. Address Bar (Searchbar)
Type `?` or `/ai` followed by your question:
```text
? кто создал linux kernel
/ai последние новости квантовых вычислений 2026
```

---

## 🏗️ Architecture

```
js/agent/
├── llmClient.js         # Unified client for Ollama & OpenAI-compatible APIs
├── agentLoop.js         # ReAct reasoning loop with tool execution
├── skillRegistry.js     # Central registry of agent capabilities
├── sidebar.js           # Chat UI with quick chips & markdown citation parser
├── ntpAiHub.js          # New Tab Page AI Search & Research Hub
└── skills/
    ├── searchWeb.js         # DuckDuckGo live web search
    ├── fetchPageContent.js  # Background HTML scraper & text extractor
    ├── deepResearch.js      # Multi-step deep research engine
    ├── manageTabs.js        # Cross-tab management & intelligence
    ├── getPageContent.js    # Active tab text extractor
    ├── getPageInfo.js       # Interactive DOM element analyzer
    ├── clickElement.js      # Element clicker
    ├── typeText.js          # Input typing simulator
    ├── navigate.js          # Navigation & tab creator
    └── scrollPage.js        # Page scroller
```

---

## 🔌 Adding Custom Skills

Create a file in `js/agent/skills/mySkill.js`:

```javascript
var definition = {
  name: 'mySkill',
  description: 'What your skill does',
  parameters: {
    type: 'object',
    properties: {
      param: { type: 'string', description: 'Parameter description' }
    },
    required: ['param']
  }
}

async function execute(context, args) {
  // context.activeTabId — current tab
  return { result: 'Success with: ' + args.param }
}

module.exports = { definition, execute }
```

Register it in `js/agent/skillRegistry.js`:
```javascript
var mySkill = require('agent/skills/mySkill.js')
register(mySkill)
```

---

## ⌨️ Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+A` | Toggle AI Agent Sidebar |
| `?` in Searchbar | Instant AI Query |

---

## 📜 License

Apache-2.0. Based on [Min Browser](https://github.com/minbrowser/min).

# 🤖 AI Agent Browser

An AI-powered web browser with a built-in agent that can navigate, read, click, and fill forms on web pages. Based on [Min Browser](https://github.com/minbrowser/min).

## Features

- **🧠 Built-in AI Agent** — Chat with an AI assistant that can control your browser
- **🔧 Modular Skills System** — Easily add new capabilities to the agent
- **🏠 Local LLM Support** — Works with [Ollama](https://ollama.ai/) (Qwen 2.5, Llama 3.1, etc.)
- **☁️ Cloud API Support** — OpenAI, Anthropic Claude, Google Gemini, or any OpenAI-compatible API
- **🔒 Privacy First** — Your data stays on your machine when using local models

## Agent Skills (MVP)

| Skill | Description |
|-------|-------------|
| `getPageContent` | Reads text content from the active tab |
| `getPageInfo` | Lists interactive elements (buttons, links, inputs) on the page |
| `clickElement` | Clicks elements by CSS selector or visible text |
| `typeText` | Types text into form fields with React/Vue compatibility |
| `navigate` | Opens URLs in current or new tabs |
| `scrollPage` | Scrolls pages up/down/top/bottom |

## Quick Start

### Prerequisites

- **Node.js** 18+ and **npm**
- **Ollama** (for local AI): [Install Ollama](https://ollama.ai/download)

### Setup

```bash
# Clone the repository
git clone https://github.com/Totsamuychel/ai-agent-browser.git
cd ai-agent-browser

# Install dependencies
npm install

# Pull a model for Ollama (if using local AI)
ollama pull qwen2.5:7b

# Start the browser
npm start
```

### Usage

1. Click the **🤖** button in the toolbar (or press `Ctrl+Shift+A`) to open the AI sidebar
2. Configure your AI provider in the settings (⚙️ icon):
   - **Ollama** (default): Runs locally, no API key needed
   - **OpenAI / Custom**: Enter your API key and endpoint
3. Type a task in the chat, for example:
   - "Прочитай текст на этой странице"
   - "Найди кнопку 'Sign In' и нажми на неё"
   - "Заполни поле поиска текстом 'AI browser' и нажми Enter"
   - "Открой новую вкладку с google.com"

## Architecture

```
js/agent/
├── llmClient.js       # Unified LLM client (Ollama / OpenAI / Custom)
├── agentLoop.js       # ReAct reasoning loop
├── skillRegistry.js   # Central skill registry
├── sidebar.js         # Chat UI sidebar
└── skills/
    ├── getPageContent.js
    ├── getPageInfo.js
    ├── clickElement.js
    ├── typeText.js
    ├── navigate.js
    └── scrollPage.js
```

## Adding Custom Skills

Create a new file in `js/agent/skills/` with this structure:

```javascript
var definition = {
  name: 'mySkill',
  description: 'What this skill does',
  parameters: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: 'Parameter description' }
    },
    required: ['param1']
  }
}

async function execute(context, args) {
  // context.activeTabId — current tab ID
  // args.param1 — parameter value
  return { result: 'success' }
}

module.exports = { definition, execute }
```

Then register it in `js/agent/skillRegistry.js`:

```javascript
var mySkill = require('agent/skills/mySkill.js')
register(mySkill)
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+A` | Toggle AI Sidebar |

## Credits

- Based on [Min Browser](https://github.com/minbrowser/min) by PalmerAL (Apache 2.0 License)
- AI integration by [Totsamuychel](https://github.com/Totsamuychel)

## License

Apache-2.0 (same as Min Browser)

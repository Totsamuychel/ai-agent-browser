/**
 * Agent Loop (ReAct Pattern)
 * Implements the core agent reasoning loop:
 *   User message → LLM (with tools) → Tool call → Execute → Result back to LLM → Repeat until done
 */

var llmClient = require('agent/llmClient.js')
var skillRegistry = require('agent/skillRegistry.js')

var MAX_ITERATIONS = 10

var SYSTEM_PROMPT = `You are an advanced AI Agent embedded inside a modern web browser (similar to Perplexity Comet).
You have full agency to navigate, search the internet, read and parse web pages, and automate workflows.

You have access to powerful browser tools:
- searchWeb(query, maxResults): Search the live web with DuckDuckGo. Always use this for queries about news, real-time facts, documentation, or finding links.
- fetchPageContent(url, maxLength): Fetch and read any external webpage in the background without needing the user to open it.
- deepResearch(topic, numSources): Conduct multi-source autonomous research on any complex topic with synthesis and citations.
- getPageContent(): Extract readable text from the user's currently active tab.
- getPageInfo(includeLinks, maxElements): Get interactive buttons, inputs, links on the active page.
- clickElement(selector, text): Click an element by CSS selector or visible text.
- typeText(selector, text, clearFirst, pressEnter): Fill in form inputs or search bars on the page.
- navigate(url, newTab): Go to a URL in the active tab or open a new tab.
- scrollPage(direction, amount): Scroll up, down, top, or bottom.
- manageTabs(action, tabId): List all open tabs ('list'), switch to a tab ('switch'), or get cross-tab intelligence ('summarize_all').

CRITICAL GUIDELINES:
1. CITATIONS & SOURCES: When you search the web or conduct research, ALWAYS provide the source links in Markdown format, e.g. [Source Title](URL). Group sources at the bottom or cite them inline.
2. RESEARCH & SYNTHESIS: For deep questions or complex topics, use deepResearch or searchWeb followed by fetchPageContent on the most relevant links.
3. WEBPAGE ACTIONS: Before clicking or typing on a page, use getPageInfo to inspect elements.
4. CONFIRMATION: Never perform irreversible or sensitive actions (purchases, account changes) without user confirmation.
5. LANGUAGE: Always respond in the language the user addresses you in (e.g. Russian if the user speaks Russian).`

function createContext () {
  return {
    activeTabId: tabs.getSelected(),
    getActiveTabUrl: function () {
      var tab = tabs.get(tabs.getSelected())
      return tab ? tab.url : null
    }
  }
}

/**
 * Run the agent loop for a user message.
 * @param {string} userMessage - The user's request
 * @param {Array} conversationHistory - Previous messages in the conversation
 * @param {function} onUpdate - Callback for UI updates: onUpdate(type, data)
 *   type: 'thinking' | 'tool_call' | 'tool_result' | 'response' | 'error'
 * @returns {Promise<Object>} - { response, history }
 */
async function run (userMessage, conversationHistory, onUpdate) {
  onUpdate = onUpdate || function () {}
  conversationHistory = conversationHistory || []

  var messages = [
    { role: 'system', content: SYSTEM_PROMPT }
  ].concat(conversationHistory)

  messages.push({ role: 'user', content: userMessage })

  var toolDefinitions = skillRegistry.getDefinitions()
  var iterations = 0

  while (iterations < MAX_ITERATIONS) {
    iterations++
    onUpdate('thinking', { iteration: iterations })

    try {
      var response = await llmClient.chatCompletion(messages, toolDefinitions)
      var assistantMessage = llmClient.getAssistantMessage(response)

      if (!assistantMessage) {
        onUpdate('error', { message: 'No response from LLM' })
        return { response: 'Error: No response from LLM', history: messages }
      }

      messages.push(assistantMessage)

      // Check if the model wants to call tools
      if (llmClient.hasToolCalls(assistantMessage)) {
        for (var i = 0; i < assistantMessage.tool_calls.length; i++) {
          var toolCall = assistantMessage.tool_calls[i]
          var functionName = toolCall.function.name
          var functionArgs = {}

          try {
            functionArgs = JSON.parse(toolCall.function.arguments || '{}')
          } catch (e) {
            functionArgs = {}
          }

          onUpdate('tool_call', {
            name: functionName,
            args: functionArgs,
            id: toolCall.id
          })

          // Execute the skill
          var context = createContext()
          var result = await skillRegistry.executeSkill(functionName, context, functionArgs)

          onUpdate('tool_result', {
            name: functionName,
            result: result,
            id: toolCall.id
          })

          // Add tool result to messages
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
          })
        }
        // Continue the loop — the model will process the tool results
      } else {
        // No tool calls — this is the final response
        var finalText = assistantMessage.content || ''
        onUpdate('response', { text: finalText })

        // Return updated history (without system prompt)
        var historyToSave = messages.slice(1) // remove system prompt
        return { response: finalText, history: historyToSave }
      }
    } catch (e) {
      onUpdate('error', { message: e.message })
      return { response: 'Error: ' + e.message, history: messages.slice(1) }
    }
  }

  // Max iterations reached
  var maxIterMsg = 'Reached maximum number of iterations (' + MAX_ITERATIONS + '). Stopping.'
  onUpdate('error', { message: maxIterMsg })
  return { response: maxIterMsg, history: messages.slice(1) }
}

module.exports = {
  run,
  MAX_ITERATIONS
}

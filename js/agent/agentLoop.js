/**
 * Agent Loop (ReAct Pattern)
 * Implements the core agent reasoning loop:
 *   User message → LLM (with tools) → Tool call → Execute → Result back to LLM → Repeat until done
 */

var llmClient = require('agent/llmClient.js')
var skillRegistry = require('agent/skillRegistry.js')

var MAX_ITERATIONS = 10

var SYSTEM_PROMPT = `You are an AI assistant embedded in a web browser. You help users by performing actions on web pages.

You have access to browser tools that let you:
- Read page content (getPageContent)
- Get interactive elements on a page (getPageInfo) 
- Click elements (clickElement)
- Type text into fields (typeText)
- Navigate to URLs (navigate)
- Scroll pages (scrollPage)

IMPORTANT RULES:
1. Always start by understanding what the user wants.
2. Use getPageInfo first to understand what's on the current page before taking actions.
3. Be precise with CSS selectors when clicking or typing.
4. If an action fails, try alternative approaches (e.g., use text-based click instead of selector).
5. Report what you did and what happened after each action.
6. NEVER perform destructive actions (delete, purchase, send money) without explicitly confirming with the user first.
7. Keep responses concise and actionable.
8. Respond in the same language the user writes to you.`

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

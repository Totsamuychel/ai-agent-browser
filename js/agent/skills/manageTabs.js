/**
 * Skill: manageTabs
 * Cross-tab intelligence: list tabs, switch tabs, close tabs, or summarize all open tabs.
 */

var browserUI = require('browserUI.js')

var definition = {
  name: 'manageTabs',
  description: 'Manages browser tabs or provides cross-tab intelligence. Can list all open tabs, switch to a specific tab, close a tab, or gather information across all open tabs.',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['list', 'switch', 'close', 'summarize_all'],
        description: 'Action to perform: "list" (get all tabs), "switch" (switch to tabId), "close" (close tabId), "summarize_all" (get overview of all tabs)'
      },
      tabId: {
        type: 'string',
        description: 'The tabId to switch to or close (required for "switch" and "close")'
      }
    },
    required: ['action']
  }
}

async function execute (context, args) {
  var action = args.action

  try {
    var allTabs = tabs.get()

    if (action === 'list' || action === 'summarize_all') {
      var tabList = allTabs.map(function (tab) {
        return {
          id: tab.id,
          title: tab.title || 'Untitled',
          url: tab.url || 'newtab',
          selected: tab.id === tabs.getSelected(),
          private: !!tab.private
        }
      })

      return {
        action: action,
        totalTabs: tabList.length,
        currentTabId: tabs.getSelected(),
        tabs: tabList
      }
    }

    if (action === 'switch') {
      if (!args.tabId) {
        return { error: 'tabId parameter is required for switch action' }
      }
      var targetTab = tabs.get(args.tabId)
      if (!targetTab) {
        return { error: 'Tab not found with id: ' + args.tabId }
      }
      browserUI.switchToTab(args.tabId)
      return { result: 'Switched to tab: ' + (targetTab.title || targetTab.url) }
    }

    if (action === 'close') {
      if (!args.tabId) {
        return { error: 'tabId parameter is required for close action' }
      }
      browserUI.closeTab(args.tabId)
      return { result: 'Closed tab: ' + args.tabId }
    }

    return { error: 'Unsupported action: ' + action }
  } catch (err) {
    return { error: 'Tab management error: ' + err.message }
  }
}

module.exports = { definition, execute }

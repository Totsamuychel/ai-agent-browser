/**
 * Skill Registry
 * Central registry for all agent skills (tools).
 * Each skill exports { definition, execute }.
 */

var getPageContent = require('agent/skills/getPageContent.js')
var clickElement = require('agent/skills/clickElement.js')
var typeText = require('agent/skills/typeText.js')
var navigate = require('agent/skills/navigate.js')
var scrollPage = require('agent/skills/scrollPage.js')
var getPageInfo = require('agent/skills/getPageInfo.js')

var skills = {}

function register (skill) {
  skills[skill.definition.name] = skill
}

function getAll () {
  return skills
}

function getDefinitions () {
  return Object.values(skills).map(function (skill) {
    return skill.definition
  })
}

function get (name) {
  return skills[name] || null
}

async function executeSkill (name, context, args) {
  var skill = skills[name]
  if (!skill) {
    return { error: 'Unknown skill: ' + name }
  }
  try {
    return await skill.execute(context, args || {})
  } catch (e) {
    return { error: 'Skill execution error (' + name + '): ' + e.message }
  }
}

// Register built-in skills
register(getPageContent)
register(clickElement)
register(typeText)
register(navigate)
register(scrollPage)
register(getPageInfo)

module.exports = {
  register,
  getAll,
  getDefinitions,
  get,
  executeSkill
}

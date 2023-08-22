/*
global canvas, game
*/

import * as config from './config.js'
import * as orchestrator from './orchestrator.js'
import * as util from './util.js'

const SETTINGS = {
  orchestratorButtonIcon: 'fas fa-swords',
  orchestratorButtonObject: null
}

export function handler (controls) {
  util.log('Control Handler - Started')
  // If token control has not been created - create it
  if (game && SETTINGS.orchestratorButtonObject == null) {
    util.log('Control Handler - Creating')
    const orchestratorButton = {
      name: config.MODULE.identity,
      title: config.MODULE.name,
      icon: SETTINGS.orchestratorButtonIcon,
      visible: game.users.get(game.userId)?.isGM,
      toggle: false,
      active: false,
      button: true,
      onClick: function () {
        if (canvas.tokens.controlled.length > 0) {
          orchestrator.handler()
        } else {
          util.log('No Tokens Selected', 'warn')
        }
      }
    }
    SETTINGS.orchestratorButtonObject = orchestratorButton
  }
  // If token control has been created and not published - publish it
  if (SETTINGS.orchestratorButtonObject != null && !controls.includes(SETTINGS.orchestratorButtonObject)) {
    util.log('Control Handler - Pushing to Scene Controls')
    controls
      .find(c => c.name === 'token')
      .tools.push(SETTINGS.orchestratorButtonObject)
  }
  util.log('Control Handler - Ended')
}

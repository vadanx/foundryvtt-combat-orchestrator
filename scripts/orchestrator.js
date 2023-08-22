/*
global canvas, game, Hooks, socketlib, ui
*/

import * as config from './config.js'
import * as music from './music.js'
import * as util from './util.js'

let socket

let sidebarCollapsed

Hooks.once('socketlib.ready', () => {
  util.log('Main Hooks On socketlib.ready')

  socket = socketlib.registerModule(config.MODULE.identity)

  socket.register('setCombatUi', function () {
    sidebarCollapsed = ui.sidebar._collapsed
    ui.sidebar.expand()
    ui.chat.activate()
    ui.combat.renderPopout()
  })

  socket.register('revertCombatUi', function () {
    if (sidebarCollapsed) {
      ui.sidebar.collapse()
    }
  })
})

export async function handler () {
  util.log('Orchestrator Handler - Started')
  const combatBgm = music.getPlaylists(
    config.getMenuValue('playlistBgmName')
  )
  const previousBgm = music.getPlaylists('current')
  music.stopPlaylists(previousBgm)
  music.startPlaylists(combatBgm)
  // Initiaitive
  // TODO: set position of combat tracker and chat popouts
  if (config.getMenuValue('combatPopout')) {
    socket.executeForEveryone('setCombatUi')
  }
  await canvas.tokens.toggleCombat()
  game.combat.rollNPC()
  let waitInitiative = true
  while (waitInitiative) {
    util.log('Orchestrator Handler - Wait Initiative')
    await util.sleep()
    waitInitiative = game.combat?.combatants.filter(c => c.initiative == null).length > 0
  }
  // Combat
  await game.combat?.startCombat()
  let waitCombat = true
  while (waitCombat) {
    util.log('Orchestrator Handler - Wait Combat')
    await util.sleep()
    waitCombat = game.combat?.isActive || false
  }
  // Clean Up
  if (config.getMenuValue('combatPopout')) {
    socket.executeForEveryone('revertCombatUi')
  }
  music.stopPlaylists(combatBgm)
  music.startPlaylists(previousBgm)
}

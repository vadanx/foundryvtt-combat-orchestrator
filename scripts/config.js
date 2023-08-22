/*
global game
*/

import * as util from './util.js'

export const MODULE = {
  identity: 'vadanx-combat-orchestrator',
  name: 'Vadanx\'s Combat Orchestrator'
}

const SETTINGS = {
  menuItems: {
    combatPopout: {
      name: 'Popout Relevant Tabs during Combat',
      type: Boolean,
      default: true,
      scope: 'world',
      config: true,
      requiresReload: true
    },
    playlistBgmName: {
      name: 'Playlist Name for Background Music',
      type: String,
      default: MODULE.name + ' BGM',
      scope: 'world',
      config: true,
      requiresReload: true
    }
  }
}

export function handler () {
  util.log('Config Handler - Started')
  // For every menu item add it
  for (const [k, v] of Object.entries(SETTINGS.menuItems)) {
    addMenuItem(k, v)
  }
}

export function getMenuValue (itemK) {
  util.log('Config Get Menu Value - Getting ' + itemK)
  return game.settings.get(MODULE.identity, itemK)
}

export function addMenuItem (itemK, itemV) {
  util.log('Config Add Menu Item - Adding ' + itemK)
  game.settings.register(MODULE.identity, itemK, itemV)
}

/*
global canvas, game, Hooks, socketlib, ui
*/

const MODULE = {
  dependency: 'vadanx-common-functionality',
  id: 'vadanx-combat-orchestrator',
  name: 'Vadanx\'s Combat Orchestrator'
}

const CONTROL = {
  icon: 'fas fa-swords'
}

const MENU = {
  items: {
    combatPopout: {
      name: 'Popout Tabs During Combat',
      type: Boolean,
      default: true,
      scope: 'world',
      config: true,
      requiresReload: true
    },
    playlistBgmName: {
      name: 'Playlist For Background Music',
      type: String,
      default: MODULE.name + ' BGM',
      scope: 'world',
      config: true,
      requiresReload: true
    }
  }
}

const MUSIC = {
  bgmTracks: [
    {
      description: 'Music by Tabletop Audio: https://tabletopaudio.com',
      name: 'Tabletop Audio - Skirmish',
      path: 'modules/' + MODULE.id + '/music/tabletopaudio_92_Skirmish.mp3',
      volume: 0.3
    }
  ]
}

let config
let control
let log
let music
let sidebarCollapsed
let socket
let time

Hooks.on('vadanx.init', (common) => {
  log = new common.Log(MODULE.id)
  log.info('Hooked on vadanx.init')
  config = new common.Config(MODULE.id)
  config.setMenus(MENU.items)
  control = new common.Control(MODULE.id)
  music = new common.Music(MODULE.id)
  time = new common.Time(MODULE.id)
})

Hooks.once('socketlib.ready', () => {
  log?.info('Hooked on socketlib.ready') || console.log(MODULE.id + ' | Hooked on socketlib.ready [hook ran before vadanx.init]')
  socket = socketlib.registerModule(MODULE.id)
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

Hooks.once('ready', () => {
  log.info('Hooked on ready')
  music.createPlaylistWithTracks(config.getMenuValue('playlistBgmName'), MUSIC.bgmTracks)
})

Hooks.on('getSceneControlButtons', (controls) => {
  log.info('Hooked on getSceneControlButtons')
  control.create(controls, 'token', MODULE.name, CONTROL.icon, run)
})

async function run () {
  log.info('Orchestrator')
  if (canvas.tokens.controlled.length === 0) {
    log.warn('No Tokens Selected')
    return
  }
  const combatBgm = music.getPlaylists(
    config.getMenuValue('playlistBgmName')
  )
  const previousBgm = music.getPlaylists('current')
  music.stopPlaylists(previousBgm)
  music.startPlaylists(combatBgm)
  // Initiaitive
  log.info('Initiative Starting')
  // TODO: set position of combat tracker and chat popouts
  if (config.getMenuValue('combatPopout')) {
    log.info('UI Updating')
    socket.executeForEveryone('setCombatUi')
  }
  await canvas.tokens.toggleCombat()
  game.combat.rollNPC()
  let waitInitiative = true
  while (waitInitiative) {
    await time.wait()
    waitInitiative = game.combat?.combatants.filter(c => c.initiative == null).length > 0
  }
  // Combat
  log.info('Combat Starting')
  await game.combat?.startCombat()
  let waitCombat = true
  while (waitCombat) {
    await time.wait()
    waitCombat = game.combat?.isActive || false
  }
  // Clean Up
  if (config.getMenuValue('combatPopout')) {
    log.info('UI Reverting')
    socket.executeForEveryone('revertCombatUi')
  }
  music.stopPlaylists(combatBgm)
  music.startPlaylists(previousBgm)
}

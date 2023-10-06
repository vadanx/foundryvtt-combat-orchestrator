/*
global canvas, game, Hooks, socketlib, ui
*/

const MODULE = {
  id: 'vadanx-combat-orchestrator',
  name: 'Vadanx\'s Combat Orchestrator',
  icon: 'fas fa-swords',
  menu: {
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
      default: 'Vadanx\'s Combat Orchestrator BGM',
      scope: 'world',
      config: true,
      requiresReload: true
    }
  },
  music: [
    {
      description: 'Music by Tabletop Audio: https://tabletopaudio.com',
      name: 'Tabletop Audio - Skirmish',
      path: 'modules/vadanx-combat-orchestrator/assets/music/tabletopaudio_92_Skirmish.mp3',
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

async function orchestrateCombat () {
  log.debug('Orchestrator')
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
  log.debug('Initiative Starting')
  // TODO: set position of combat tracker and chat popouts
  if (config.getMenuValue('combatPopout')) {
    log.debug('UI Updating')
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
  log.debug('Combat Starting')
  await game.combat?.startCombat()
  let waitCombat = true
  while (waitCombat) {
    await time.wait()
    waitCombat = game.combat?.isActive || false
  }
  // Clean Up
  if (config.getMenuValue('combatPopout')) {
    log.debug('UI Reverting')
    socket.executeForEveryone('revertCombatUi')
  }
  music.stopPlaylists(combatBgm)
  music.startPlaylists(previousBgm)
}

Hooks.once('socketlib.ready', () => {
  log?.debug('Hooked socketlib.ready') || console.debug('Hooked socketlib.ready (before vadanx.init)')
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

Hooks.on('vadanx.init', (common) => {
  log = new common.Log(MODULE.id)
  log.debug('Hooked vadanx.init')
  config = new common.Config(MODULE.id)
  config.setMenus(MODULE.menu)
  time = new common.Time(MODULE.id)

  Hooks.once('ready', () => {
    log.debug('Hooked ready')
    const combatPlaylistName = config.getMenuValue('playlistBgmName')
    music = new common.Music(MODULE.id)
    music.createPlaylistWithTracks(combatPlaylistName, MODULE.music)
    const combatPlayLists = music.getPlaylists(combatPlaylistName)
    music.preloadPlaylists(combatPlayLists)
  })

  Hooks.on('getSceneControlButtons', (controls) => {
    log.debug('Hooked getSceneControlButtons')
    control = new common.Control(MODULE.id)
    const controlTools = [
      {
        name: MODULE.id,
        title: MODULE.name,
        icon: MODULE.icon,
        category: 'token',
        visible: game.user.isGM,
        toggle: false,
        active: false,
        button: true,
        onClick: orchestrateCombat
      }
    ]
    controlTools.forEach(c => control.create(controls, c))
  })
})

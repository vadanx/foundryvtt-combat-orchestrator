/*
global canvas, game, Hooks, Object, Playlist, socketlib, ui
*/

const MODULE = {
  id: 'vadanx-combat-orchestrator',
  name: 'Vadanx\'s Combat Orchestrator',
  icon: 'fas fa-swords',
  menu: {
    combatPopout: {
      name: 'Popout Tabs During Combat',
      hint: 'Chat and combat tabs popout when starting encounters.',
      type: Boolean,
      default: true,
      scope: 'world',
      config: true,
      requiresReload: true
    },
    selectActiveToken: {
      name: 'Select Active Combat Token (PCs)',
      hint: 'When more than one token is owned by a player, select the token in turn during encounters.',
      type: Boolean,
      default: true,
      scope: 'world',
      config: true,
      requiresReload: true
    },
    playlistBgmName: {
      name: 'Playlist For Background Music',
      hint: 'Name of the music playlist used during encounters.',
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
  ],
  toolclipUrl: 'https://vadanx.github.io/foundryvtt-combat-orchestrator/assets/video/usage.webm'
}

let config
let control
let log
let music
let sidebarCollapsed
let socket
let time

// eslint-disable-next-line no-unused-vars
class Control {
  constructor (id) {
    this.id = id
  }

  create (controls, control) {
    let controlsCategoryTools
    if (!control.category) {
      controlsCategoryTools = controls
    } else {
      controlsCategoryTools = controls.find(
        c => c.name === control.category
      ).tools
    }
    if (game && !controlsCategoryTools.includes(control)) {
      console.log(MODULE.name + ` | Creating control (name: ${control.name}, category: ${control.category}, layer: ${control.layer})`)
      controlsCategoryTools.push(control)
    }
  }
}

// eslint-disable-next-line no-unused-vars
class Config {
  constructor (id) {
    this.id = id
  }

  getMenuValue (itemKey) {
    console.log(MODULE.name + ` | Getting value from menu ${itemKey}`)
    return game.settings.get(this.id, itemKey)
  }

  setMenus (items) {
    for (const [itemKey, itemValue] of Object.entries(items)) {
      console.log(MODULE.name + ` | Setting menu ${itemKey}`)
      game.settings.register(this.id, itemKey, itemValue)
    }
  }
}

// eslint-disable-next-line no-unused-vars
class Music {
  constructor (id) {
    this.id = id
    this.soundsPlaying = new Map()
  }

  getPlaylists (playlistName) {
    console.log(MODULE.name + ` | Getting playlists ${playlistName}`)
    const playlists = []
    if (playlistName) {
      const newPlaylist = game.playlists.getName(playlistName)
      if (newPlaylist !== undefined) {
        console.log(MODULE.name + ` | Found playlists ${playlistName}`)
        playlists.push(newPlaylist)
      } else {
        console.log(MODULE.name + ` | Not found playlists ${playlistName}`)
      }
    } else {
      game.playlists.playing.forEach(
        p => {
          playlists.push(game.playlists.getName(p.name))
        }
      )
    }
    playlists.forEach(
      p => {
        if (p !== undefined) {
          this.soundsPlaying.set(p._id, [])
          p.sounds.forEach(
            s => {
              if (s.playing) {
                this.soundsPlaying.get(p._id).push(s._id)
              }
            }
          )
        }
      }
    )
    return playlists
  }

  preloadPlaylists (playlists) {
    if (playlists != null) {
      playlists.forEach(
        p => {
          console.log(MODULE.name + ' | Preloading playlist ' + p.name)
          game.playlists.getName(p.name).playbackOrder.forEach(
            s => {
              const path = game.playlists.getName(p.name).sounds.get(s).path
              if (path) {
                game.audio.preload(path)
              }
            }
          )
        }
      )
    }
  }

  startPlaylists (playlists) {
    let playAll = true
    if (playlists != null) {
      playlists.forEach(
        p => {
          p.sounds.forEach(
            s => {
              if (this.soundsPlaying.get(p._id)?.includes(s._id)) {
                playAll = false
                console.log(MODULE.name + ` | Playing sound "${s.name}" in playlist "${p.name}"`)
                p.playSound(s)
              }
            }
          )
          if (playAll) {
            console.log(MODULE.name + ` | Playing sound "all" in playlist "${p.name}"`)
            p.playAll()
          }
        }
      )
    }
  }

  stopPlaylists (playlists) {
    console.log(MODULE.name + ' | Stopping playlists ' + playlists)
    if (playlists != null) {
      playlists.forEach(
        p => {
          console.log(MODULE.name + ' | Stopping playlist ' + p.name)
          game.playlists.getName(p.name).stopAll()
        }
      )
    }
  }

  async createPlaylistWithTracks (playlistName, tracks) {
    if (game.user.isGM) {
      const playlists = this.getPlaylists(playlistName)
      if (playlists.length === 0) {
        console.log(MODULE.name + ' | Creating playlist ' + playlistName)
        await Playlist.create({
          description: 'Playlist created by ' + this.id,
          fade: 1000,
          mode: 1,
          name: playlistName,
          playing: false,
          sorting: 'a'
        })
        const playlist = await game.playlists?.contents.find((p) => p.name === playlistName)
        for (const track of tracks) {
          console.log(MODULE.name + ' | Adding playlist track ' + track.name)
          await playlist.createEmbeddedDocuments('PlaylistSound', [{
            description: track.description,
            fade: 1000,
            name: track.name,
            path: track.path,
            repeat: true,
            volume: track.volume
          }], {})
        }
      } else {
        console.log(MODULE.name + ' | Found playlist ' + playlistName)
      }
    }
  }
}

// eslint-disable-next-line no-unused-vars
class Time {
  constructor (id) {
    this.id = id
  }

  wait (ms = 500) {
    console.log(MODULE.name + ` | Waiting for ${ms} ms`)
    // eslint-disable-next-line promise/param-names
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

async function orchestrateCombat () {
  console.log(MODULE.name + ' | Orchestrator')
  if (canvas.tokens.controlled.length === 0) {
    log.warn('No Tokens Selected')
    return
  }
  const combatBgm = music.getPlaylists(
    config.getMenuValue('playlistBgmName')
  )
  const previousBgm = music.getPlaylists()
  music.stopPlaylists(previousBgm)
  music.startPlaylists(combatBgm)
  // Initiaitive
  console.log(MODULE.name + ' | Initiative Starting')
  // TODO: set position of combat tracker and chat popouts
  if (config.getMenuValue('combatPopout')) {
    console.log(MODULE.name + ' | UI Updating')
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
  console.log(MODULE.name + ' | Combat Starting')
  await game.combat?.startCombat()
  let waitCombat = true
  let combatTurnNew = null
  let combatTurnOld = null
  while (waitCombat) {
    combatTurnNew = game.combat?.current.turn
    if (combatTurnNew !== combatTurnOld) {
      console.log(MODULE.name + ' | New Combat Turn')
      if (config.getMenuValue('selectActiveToken')) {
        socket.executeForEveryone('selectActiveToken')
      }
    }
    await time.wait()
    combatTurnOld = combatTurnNew
    waitCombat = game.combat?.isActive || false
  }
  // Clean Up
  if (config.getMenuValue('combatPopout')) {
    console.log(MODULE.name + ' | UI Reverting')
    socket.executeForEveryone('revertCombatUi')
  }
  music.stopPlaylists(combatBgm)
  music.startPlaylists(previousBgm)
}

Hooks.once('socketlib.ready', () => {
  console.log('Hooked socketlib.ready')
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
  socket.register('selectActiveToken', function () {
    if (!game.user.isGM) {
      canvas.tokens.placeables.filter(
        token => token.isOwner && token.id === game.combat.current.tokenId
      ).forEach(
        token => token.control(
          {
            releaseOthers: true
          }
        )
      )
    }
  })
})

Hooks.on('init', () => {
  console.log(MODULE.name + ' | Hooked on init')
  config = new Config(MODULE.id)
  config.setMenus(MODULE.menu)
  time = new Time(MODULE.id)
  console.log(MODULE.name + ' | Calling hook ' + MODULE.hook)
})

Hooks.once('ready', () => {
  console.log(MODULE.name + ' | Hooked ready')
  const combatPlaylistName = config.getMenuValue('playlistBgmName')
  music = new Music(MODULE.id)
  music.createPlaylistWithTracks(combatPlaylistName, MODULE.music)
  const combatPlayLists = music.getPlaylists(combatPlaylistName)
  music.preloadPlaylists(combatPlayLists)
})

Hooks.on('getSceneControlButtons', (controls) => {
  console.log(MODULE.name + ' | Hooked getSceneControlButtons')
  control = new Control(MODULE.id)
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
      onClick: orchestrateCombat,
      toolclip: {
        src: MODULE.toolclipUrl,
        heading: MODULE.name,
        items: [
          { paragraph: 'Orchestrating smoother combat encounters.' }
        ]
      }
    }
  ]
  controlTools.forEach(c => control.create(controls, c))
})

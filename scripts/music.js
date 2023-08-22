/*
global game, Playlist
*/

import * as config from './config.js'
import * as util from './util.js'

const SETTINGS = {
  playlistBgm: {
    tracks: [
      {
        description: 'Music by Tabletop Audio: https://tabletopaudio.com',
        name: 'Tabletop Audio - Skirmish',
        path: 'modules/' + config.MODULE.identity + '/music/tabletopaudio_92_Skirmish.mp3',
        volume: 0.5
      }
    ]
  }
}

export async function handler () {
  util.log('Music Handler')
  const playlistBgmName = config.getMenuValue('playlistBgmName')
  const playlistBgm = getPlaylists(playlistBgmName)
  if (game.users.get(game.userId)?.isGM) {
    if (playlistBgm === undefined) {
      await createPlaylist(playlistBgmName)
      await addTracksToPlaylist(playlistBgmName, SETTINGS.playlistBgm.tracks)
    }
  }
  // TODO: preload combat playlist tracks
  // Ideally load first shuffled track in order,
  // then during combat when half way through first track,
  // load next shuffled, on and on.
}

export function getPlaylists (playlistName) {
  let playlists = null
  switch (playlistName) {
    case 'current':
      playlists = game.playlists.playing
      break
    default:
      playlists = game.playlists.getName(playlistName)
      break
  }
  util.log('Music Get Playlists - ' + playlistName + ' => ' + playlists)
  if (playlists === undefined) {
    return playlists
  } else {
    return [playlists].flat(Infinity)
  }
}

export function startPlaylists (playlists) {
  util.log('Music Start Playlists - ' + playlists)
  if (playlists != null) {
    playlists.forEach(p => game.playlists.getName(p.name).playAll())
  }
}

export function stopPlaylists (playlists) {
  util.log('Music Stop Playlists - ' + playlists)
  if (playlists != null) {
    playlists.forEach(p => game.playlists.getName(p.name).stopAll())
  }
}

async function createPlaylist (playlistName) {
  util.log('Music Create Playlist - ' + playlistName)
  return await Playlist.create({
    description: 'Playlist created by ' + config.MODULE.name,
    fade: 1000,
    mode: 1,
    name: playlistName,
    playing: false,
    sorting: 'a'
  })
}

async function addTracksToPlaylist (playlistName, tracks) {
  const playlist = await game.playlists?.contents.find((p) => p.name === playlistName)
  for (const track of tracks) {
    util.log('Music Add Tracks To Playlist - ' + track.name + ' => ' + playlistName)
    await playlist.createEmbeddedDocuments(
      'PlaylistSound',
      [{
        description: track.description,
        fade: 1000,
        name: track.name,
        path: track.path,
        repeat: true,
        volume: track.volume
      }],
      {}
    )
  }
}

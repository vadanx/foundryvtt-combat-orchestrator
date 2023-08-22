/*
global Hooks
*/

import * as config from './config.js'
import * as control from './control.js'
import * as music from './music.js'
import * as util from './util.js'

Hooks.on('init', function () {
  util.log('Main Hooks On init')
  config.handler()
})

Hooks.on('ready', function () {
  util.log('Main Hooks On ready')
  music.handler()
})

Hooks.on('getSceneControlButtons', (controls) => {
  util.log('Main Hooks On getSceneControlButtons')
  control.handler(controls)
})

/*
global ui
*/

import * as config from './config.js'

export function log (line, level = 'info') {
  const logFormat = config.MODULE.name + ' | [' + level + '] ' + line
  switch (level) {
    case 'info':
      console.log(logFormat)
      break
    case 'warn':
      console.warn(logFormat)
      ui.notifications.warn(logFormat)
      break
    case 'error':
      console.error(logFormat)
      ui.notifications.error(logFormat)
      break
  }
}

export function sleep (ms = 100) {
  // eslint-disable-next-line promise/param-names
  return new Promise(resolve => setTimeout(resolve, ms))
}

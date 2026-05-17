'use strict'
// Launcher that hard-removes ELECTRON_RUN_AS_NODE before spawning Electron.
// cross-env KEY= only sets the var to empty string; Electron 31 still detects it.
// Deleting it from the env object makes it truly absent for the child process.
const { spawn } = require('child_process')
const electronPath = require('electron')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const proc = spawn(electronPath, ['.'], { stdio: 'inherit', env })
proc.on('close', (code) => process.exit(code ?? 0))

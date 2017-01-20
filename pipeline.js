'use strict'

const path = require('path')
const debug = require('debug')('pipeline-manifold:main')
const ProcessManager = require(path.join(__dirname, 'lib', 'ProcessManager.js'))

const nopt = require('nopt')
const longOpts = {
  config: String
}
const shortOpts = {
  c: '--config'
}
const args = nopt(longOpts, shortOpts)

if (!args.config) {
  process.stderr.write('Must supply --config (-c) mappings with config file.')
  process.exit(1)
}

let config
try {
  config = require(path.resolve(args.config))
} catch (e) {
  process.stderr.write('Could not load config file: ' + e.message)
  process.exit(2)
}

const processManager = new ProcessManager()

function addPipe (parent, pipe) {
  debug('adding pipe (%j) to parent (%s)', pipe, parent.pid)
  const proc = processManager.spawnChild(parent, pipe.bin, pipe.args || [])
  if (pipe.pipes) pipe.pipes.forEach((p) => { addPipe(proc, p) })
}

if (!config.input || config.input === 'stdin') {
  processManager.addMaster(process)
} else {
  processManager.spawnMaster(config.input.bin, config.input.args || [])
}

config.pipes.forEach((pipe) => {
  addPipe(processManager.process, pipe)
})

function shutdown () {
  debug('shutting down master process: %s', processManager.master.pid)
  processManager.shutdown()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

'use strict'

const path = require('path')
const spawn = require('child_process').spawn

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

let inputProgram
let inputStdin
if (!config.input || config.input === 'stdin') {
  inputStdin = process.stdin
} else {
  inputProgram = spawn(config.input.bin, config.input.args)
  inputStdin = inputProgram.stdout
}
inputStdin.pipe(process.stdout)

const topLevelPipes = []
config.outputs.forEach((output) => {
  const proc = spawn(output.bin, output.args)
  inputStdin.pipe(proc.stdin)
  topLevelPipes.push(proc)

  if (output.pipe) {
    const child = spawn(output.pipe.bin, output.pipe.args)
    proc.stdout.pipe(child.stdin)
    proc.grandchild = child
  }
})

function shutdown () {
  if (inputProgram) inputProgram.kill()
  topLevelPipes.forEach((o) => { o.kill() })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

'use strict'

const spawn = require('child_process').spawn
const stream = require('stream')
const debug = require('debug')('pipeline-manifold:process-manager')

/**
 * @prop {Set<ProcessObject>} children All child processes associated with this process
 * @prop {number} pid The process id of the spawned process
 * @prop {ChildProcess} process The actual spawned process
 * @typedef {object} ProcessObject
 */

/**
 * A simple process manager to facilitate restarting child processes when the master process is meant
 * to be long running.
 *
 * Upon creating an instance, you should use {@link ProcessManager#spawnMaster} to spawn a master process, or pass
 * `process` to {@link ProcessManager#addMaster}. Once the master process is created/registered, you can use
 * {@link ProcessManager#spawnChild} to associate child processes with the master process.
 *
 * While spawning processes, {@link ProcessManager} sets up the pipe flows, e.g. `master.stdout` to `child.stdin`.
 *
 * @private
 * @constructor
 */
function ProcessManager () {
  this.master = null

  this.masterStream = new stream.PassThrough()
  this.masterStream.pause()

  this.process = {
    process: null,
    pid: null,
    children: new Set()
  }
}

/**
 * Registers a master process with the {@link ProcessManager} instance. If the `command` parameter is missing, i.e.
 * only the `master` parameter is present, then it is assumed the value of `master` is the global `process` object.
 * In this case, `process.stdin` will be used as the data flow originator. Otherwise, the data flow originator will
 * be `master.stdout`.
 *
 * @param {ChildProcess|process} master A child process, or the main process, to use as the master process.
 * @param {string} [command] The command to spawn as the master process.
 * @param {array<string>} [args] The arguments for `command`.
 * @returns {ProcessObject}
 */
ProcessManager.prototype.addMaster = function addMaster (master, command, args) {
  debug('adding master process: (%s, %s, %j)', master.pid, command, args)
  if (this.master) {
    debug('master process already defined')
    throw new Error('master process already added')
  }
  this.master = master
  this.process.process = master
  this.process.pid = master.pid

  master.on('exit', (code, signal) => {
    debug('master exit: (%s, %s)', code, signal)
    if (code === 0 || (signal === 'SIGKILL' || signal === 'SIGTERM')) {
      this.doShutdown = true
      this.process.children.forEach((child) => {
        if (child.process.kill) child.process.kill()
      })
      process.exit(code)
    }

    // respawn the process
    debug('respawning master: %s', this.process.pid)
    this.master = null
    this.spawnMaster.apply(this, Array.from(arguments).slice(1))
  })

  if (!command) {
    process.stdin.pipe(this.masterStream)
    // when the source of the pipe dies, so should we
    process.stdin.on('finish', () => this.shutdown())
    process.stdin.on('exit', () => this.shutdown())
    process.on('exit', () => this.shutdown())
  } else {
    this.master.stdout.pipe(this.masterStream)
  }
  this.masterStream.pause()
  this.masterStream.pipe(process.stdout)

  debug('added master: %s', this.master.pid)
  return this.process
}

/**
 * Spawns a new process and sets it as the master process.
 *
 * @param {string} command The command to spawn as the master process.
 * @param {array<string>} [args] Arguments for the `command`.
 * @returns {ProcessObject}
 */
ProcessManager.prototype.spawnMaster = function spawnMaster (command, args) {
  debug('spawning master: (%s, %j)', command, args)
  if (this.master) throw new Error('master process already created')
  const master = spawn(command, args || [])
  return this.addMaster(master, command, args)
}

/**
 * Spawn a new process and associates with another process. The `stdout` of the `parent` will
 * be piped into the `stdin` of the newly spawned process.
 *
 * @param {ProcessObject} parent The process that will pipe into the new process.
 * @param {string} command A command to execute. Using a full path is recommended.
 * @param {array<string>} args An array of parameters to pass to the `command`.
 * @param {object} [options' Currently supports an object with one property: `keepAlive`. `keepAlive` defaults to `true`.
 * if `keepAlive` is `true`, then the new process will be re-created if it dies.
 * @returns {ProcessObject}
 */
ProcessManager.prototype.spawnChild = function spawnChild (parent, command, args, options) {
  debug('spawning child (%s, %j) for parent (%s)', command, args, parent.pid)
  const _options = (!options) ? {keepAlive: true} : Object.assign({keepAlive: true}, options)

  const proc = spawn(command, args)
  const _process = {
    pid: proc.pid,
    process: proc,
    children: new Set()
  }

  parent.children.add(_process)

  if ((parent.process && parent.process.pid === this.process.pid) || !this.master) {
    debug('piping master stream to child.%s.stdin', proc.pid)
    this.masterStream.pipe(proc.stdin)
  } else if (parent.process) {
    debug('piping parent.%s.stdout to child.%s.stdin', parent.pid, proc.pid)
    parent.process.stdout.pipe(proc.stdin)
  }

  proc.on('exit', (code, signal) => {
    debug('child %s exit: (%s, %s)', _process.pid, code, signal)
    if ((signal === 'SIGKILL' || signal === 'SIGTERM') || _options.keepAlive === false || this.doShutdown) {
      debug('stopping children for child: %s', _process.pid)
      _process.children.forEach((child) => {
        child.process.kill()
        _process.children.delete(child)
      })
      return
    }

    if (!this.doShutdown && this.master !== process) {
      // respawn the process
      debug('respawning child: %s', _process.pid)
      const children = _process.children
      const newProcess = this.spawnChild.apply(this, arguments)
      newProcess.children = children
      _process.process = newProcess

      // and reattach pipes
      children.forEach((child) => {
        debug('piping parent.%s.stdout to child.%s.stdin', _process.pid, child.process.pid)
        _process.process.stdout.pipe(child.process.stdin)
      })
    }
  })

  debug('spawned child: %s', _process.pid)
  return _process
}

/**
 * Stop all of the children processes and then the master process.
 */
ProcessManager.prototype.shutdown = function shutdown () {
  debug('shutting down processes')
  this.doShutdown = true

  const stopChild = (child) => {
    debug('stopping child: %s', child.pid)
    if (child.children.size > 0) child.children.forEach((c) => { stopChild(c) })
    if (child.process.kill) child.process.kill()
  }

  debug('stopping children')
  this.process.children.forEach(stopChild)
  this.master.stdin.end()
  this.master.exit()
}

module.exports = ProcessManager

'use strict'

const Writable = require('stream').Writable
const echo = new Writable({
  write (data, encoding, cb) {
    process.stdout.write(`echo - ${data.toString()}`)
    cb()
  }
})

process.on('SIGINT', () => {})

process.stdin.pipe(echo)

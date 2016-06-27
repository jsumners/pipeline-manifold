'use strict'
/* eslint-env node, mocha */

const fs = require('fs')
const path = require('path')
const spawn = require('child_process').spawn
const expect = require('chai').expect

suite('process.stdin as input', function () {
  test('will echo input', function (done) {
    const pipeline = spawn('node', [path.join(__dirname, '..', 'pipeline.js'), '-c', path.join(__dirname, 'fixtures', 'stdin.json')])

    pipeline.stdin.end('hello')

    pipeline.on('close', () => {
      expect(fs.readFileSync('/tmp/pipeline-manifold.stdin.test').toString()).to.equal('hello')
      fs.unlinkSync('/tmp/pipeline-manifold.stdin.test')
      done()
    })
  })
})

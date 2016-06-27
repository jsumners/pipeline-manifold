'use strict'
/* eslint-env node, mocha */

const fs = require('fs')
const path = require('path')
const spawn = require('child_process').spawn
const expect = require('chai').expect

suite('child pipes', function () {
  test('get passed stdout from parent', function (done) {
    const pipeline = spawn('node', [path.join(__dirname, '..', 'pipeline.js'), '-c', path.join(__dirname, 'fixtures', 'grandchild.json')])

    pipeline.stdout.on('close', () => {
      expect(fs.readFileSync('/tmp/pipeline-manifold.grandchild.test').toString()).to.equal('echo - hello')
      done()
    })

    pipeline.stdin.end('hello')
  })
})

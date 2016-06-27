'use strict'
/* eslint-env node, mocha */

const fs = require('fs')
const path = require('path')
const spawn = require('child_process').spawn
const expect = require('chai').expect

suite('command output as input', function () {
  test('will tail files', function (done) {
    const pipeline = spawn('node', [path.join(__dirname, '..', 'pipeline.js'), '-c', path.join(__dirname, 'fixtures', 'tail.json')])
    let data = ''
    pipeline.stdout.on('data', (d) => {
      data += d.toString()
    })

    pipeline.stdout.on('close', () => {
      expect(fs.readFileSync('/tmp/pipeline-manifold.tail.test').toString()).to.equal('line 1\nline 2\n')
      fs.unlinkSync('/tmp/pipeline-manifold.tail.test')
      done()
    })
  })
})

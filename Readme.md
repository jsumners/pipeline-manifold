# pipeline-manifold

This is a utility for directing a flow of data to many destinations.

As a simple example, let's assume we have some need to tail `/var/log/system.log` and write it to
`/tmp/out.1` and `/tmp/out.2`. We can do that by:

```bash
$ tail -n 0 -F /var/log/system.log | pipeline-manifold -c /tmp/example.json
```

Where `example.json` is:

```json
{
  "pipes": [
    { "bin": "/usr/bin/tee", "args": ["/tmp/out.1"] },
    { "bin": "/usr/bin/tee", "args": ["/tmp/out.2"] }
  ]
}
```

We could also do it completely with *pipeline-manifold*:

```bash
$ pipeline-manifold -c /tmp/example.json
```

Where `example.json` is:

```json
{
  "input": {
    "bin": "/usr/bin/tail",
    "args": ["-n", "0", "-F", "/var/log/system.log"]
  },
  "pipes": [
    { "bin": "/usr/bin/tee", "args": ["/tmp/out.1"] },
    { "bin": "/usr/bin/tee", "args": ["/tmp/out.2"] }
  ]
}
```

## Install

*pipeline-manifold* should be installed globably as it is only useful as a utility:

```bash
$ npm install -g --production pipeline-manifold
```

## Configuration

*pipeline-manifold* requires a configuration file that at least defines a set of outputs. It can optionally specify
a program to use as the input. The confiration file is a JSON file that represents an object with the following
properties:

+ `input` {object} (optional): this property defines a program to run and use its `stdout` as the input.
  + `bin` {string} (required): the input program to run (full path if not present in the environment).
  + `args` {array<string>} (required): the parameters to pass to the input program, one parameter per array element.
+ `pipes` {array<object>} (required): this property defines the outputs to whose `stdin`s the input program's `stdout`
  will be written. Each object in the array has the same format as the `input` program object, i.e. `bin` and `args`.
  An extra `pipe` property may be added that also matches an `input` object. This `pipe` object will have its `stdin`
  fed from the `pipes`'s `stdout`.

## License

[MIT License](http://jsumners.mit-license.org/)

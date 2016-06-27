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
a program to use as the input. The confiration file is a JSON file, ending with extention `.json`, that represents the
flow of the pipes. The configuration file schema is:

```json
{
  "input": <program object>,
  "pipes": [<modified program object>]
}
```

Where `<program object>` has the schema:

```json
{
  "bin": "/path/to/program/to/spawn",
  "args": ["array", "of", "arguments", "for", "program", "to", "spawn"]
}
```

And `<modified program object>` is the same as a `<program object>` but with an optional `pipes` property (which has
the same schema as before).

The `input` configuration property is optional. If it is not present, *pipeline-manifold* will require the start of
the pipe flow to be on its `stdin`. If the property is present, then the application defined by the property will
be the source of the flow, via the application's `stdout`.

Each application defined in a `pipes` property **must** accept its input on `stdin` and return its output on `stdout`.

As an example, the following configuration will source its flow from an application, pipe into an application that
writes the input to `/tmp/flow1.out`, and into a second application that transforms the input which then flows into
a third application that writes the modified input to `/tmp/flow2.out`:

```json
{
  "input": {
    "bin": "/usr/bin/tail",
    "args": ["-n", "0", "-F", "/var/log/system.log"]
  },
  "pipes": [
    { "bin": "/usr/bin/tee", "args": ["/tmp/flow1.out"] },
    {
      "bin": "/usr/local/bin/modder",
      "args": [],
      "pipes": [{ "bin": "/usr/bin/tee", "args": "/tmp/flow2.out" }]
    }
  ]
}
```

***Tip:*** the configuration file can be a regular Node.js script as long as `module.exports` is assigned an object
that matches the required schema and the file name ends with the extension `.js`.

## License

[MIT License](http://jsumners.mit-license.org/)

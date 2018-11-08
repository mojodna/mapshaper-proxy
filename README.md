# mapshaper-proxy

This is an HTTP proxy for [MapShaper](https://github.com/mbloch/mapshaper).
It allows tiled JSON sources to be processed on the fly by providing
MapShaper commands in the URL.

## Starting

```bash
SOURCE=http://localhost:8000/{z}/{x}/{y}.json npm start
```

## Requesting Tiles

This is a URL template (suitable for handing to Tangram or other tools that
consume tiled GeoJSON) that will filter out small features, clean up gaps,
and simplify. It will also pass `?sieve=12` to the underlying tile source.

```
http://localhost:8080/{z}/{x}/{y}.json?cmds=-filter%20%22this.originalArea%20%3E%20%7B%7Bmath%20resolution%20%22*%22%201000%7D%7D%22%20-clean%20min-gap-area%3D%7B%7Bmath%20resolution%20%22*%22%2065000%7D%7D%20-simplify%20interval%3D%7B%7Bmath%20resolution%20%22*%22%202%7D%7D&sieve=12
```

To break this down, there are 2 query parameters included: `cmds` and
`sieve`. `cmds` is the only parameter that mapshaper-proxy cares about; all
others will be passed to the underlying tile source.

`cmds` is a set of URL-encoded [MapShaper
commands](https://github.com/mbloch/mapshaper/wiki/Command-Reference). In
this case, it's:

```
-filter "this.originalArea > {{math resolution "*" 1000}}"
-clean min-gap-area={{math resolution "*" 65000}}
-simplify interval={{math resolution "*" 2}}
```

(Decoded using `decodeURIComponent()` in a JavaScript console. Newlines were
added by hand.)

Commands may include [handlebars](https://handlebarsjs.com/) expressions to
facilitate dynamic functionality. At present, `resolution` and `zoom` are
made available as variables to the template. Because handlebars does not
natively support math expressions, a custom `math` handler is included,
explaining the funky syntax.

To create your own `cmds` query parameter, run
`encodeURIComponent(\`-simplify 20%\`)` (or similar) in a JavaScript console
to encode it.
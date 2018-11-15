const querystring = require("querystring");

const cors = require("cors");
const env = require("require-env");
const express = require("express");
const fetch = require("node-fetch");
const handlebars = require("handlebars");
const mapshaper = require("mapshaper");
const mercator = new (require("@mapbox/sphericalmercator"))();

const SOURCE = env.require("SOURCE");

handlebars.registerHelper("math", function(lvalue, operator, rvalue, options) {
  lvalue = parseFloat(lvalue);
  rvalue = parseFloat(rvalue);

  return {
    "+": lvalue + rvalue,
    "-": lvalue - rvalue,
    "*": lvalue * rvalue,
    "/": lvalue / rvalue,
    "%": lvalue % rvalue
  }[operator];
});

const app = express().disable("x-powered-by");

app.use(cors());

app.get(/(\d+)\/(\d+)\/(\d+)(@\d+(\.\d+)?x)?\.json/, async (req, res, next) => {
  const z = req.params[0];
  const x = req.params[1];
  const y = req.params[2];
  const scale = req.params[3];
  const { cmds, ...query } = req.query;
  const tile = [
    SOURCE.replace(/{z}/, z)
      .replace(/{x}/, x)
      .replace(/{y}/, y)
      .replace(/{scale}/, scale || ""),
    querystring.stringify(query)
  ].join("?");

  const bbox = mercator.bbox(x, y, z, false, "900913");
  const resX = Math.ceil((bbox[2] - bbox[0]) / 256);

  try {
    const rsp = await fetch(tile);
    const body = await rsp.json();

    let commands;
    if (cmds != null) {
      const tpl = handlebars.compile(cmds);
      commands = `
        -i data.json
        -proj webmercator from=wgs84
        ${tpl({
          resolution: resX,
          zoom: z
        })}
        -dissolve value
        -proj wgs84 from=webmercator
        -o`;
    } else {
      commands = `
        -i data.json
        -simplify 20%
        -o`;
    }
    const data = await new Promise((resolve, reject) => {
      mapshaper.applyCommands(
        commands,
        {
          "data.json": body
        },
        (err, out) => {
          if (err) {
            console.log(err);
            return reject(err);
          }

          return resolve(JSON.parse(out["data.json"]));
        }
      );
    });

    return res.json(data);
  } catch (err) {
    return next(err);
  }
});

module.exports = app;

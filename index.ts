import { WebServer, Lifecycle } from "./web-server/web-server";
import { WebServerConfig } from "./web-server/web-server-config";
import { DatabaseRx } from "./database-rx/database-rx";
import { assignFromJson } from "./model-helpers/model-helpers";
import { Migrator } from "./remote-storage/migrator";
import moment = require("moment");
import * as fs from "fs";

var savedConfig = JSON.parse(fs.readFileSync(__dirname + "/config.json", "utf8"));
var config = new WebServerConfig();
assignFromJson(config, savedConfig);

DatabaseRx.open(config.databaseName)
  .flatMap((db) => {
    return new Migrator(db).runAll()
      .doOnNext(m => {
        console.log("applied migration", m.name);
      })
      .toArray().map(() => db)
  }).subscribe(db => {
  var server = new WebServer(config, db);

  server.error$.subscribe((err) => {
    console.error("ERROR", err.request.originalUrl, err.format());
  });

  server.lifecycle$.subscribe((lifecycle:Lifecycle) => {
    switch (lifecycle) {
      case Lifecycle.STARTING:
        console.log("starting...");
        break;
      case Lifecycle.STOPPED:
        console.log("stopped");
        break;
      case Lifecycle.STOPPING:
        console.log("stopping...");
        break;
      case Lifecycle.UP:
        console.log("up at http://localhost:" + server.server.address().port);
        break;
    }
  });

  server.request$.subscribe((req) => {
    console.log("REQUEST", req.method, req.originalUrl);
  });

  server.response$.subscribe(([startTime, res]) => {
    console.log("RESPONSE", res.statusCode,
      " in " + moment.duration(new Date().getTime() - startTime.getTime()).toISOString());
  });

  server.start();
});

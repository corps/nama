declare module "on-finished" {
  import http = require("http");
  function onFinished(res:http.ServerResponse,
                      cb:(err:any, res:http.ServerResponse)=>void):void;
  export = onFinished;
}
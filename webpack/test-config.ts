import { BaseConfiguration } from "./base-config";

export class TestConfig extends BaseConfiguration {
  bail = false;
  watch = false;
  devtool = "eval";

  constructor() {
    super();
    this.entries['tests'] = ['./qunit-runner/browser-qunit-runner.js'];
  }

  addTests(path:string) {
    this.entries['tests'].push(path);
  }
}

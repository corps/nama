export class WebpackErrorCatcherPlugin {
  constructor(public errorCb:(err:Error)=>void, public successCb:()=>void) {
  }

  checkForErrors(stats:any) {
    if (stats.hasErrors()) {
      stats.compilation.errors.forEach((e:any) => this.errorCb(e.error));
    } else {
      this.successCb();
    }
  }

  apply(compiler:any) {
    compiler.plugin("done", this.checkForErrors.bind(this));
  }
}

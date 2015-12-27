import * as QUnit from "qunitjs";
import * as moment from "moment";
import * as cli from "cli-color";

export function setupRunner(write:(message:string)=>void, done:(success:boolean)=>void) {
  QUnit.begin(d => {
    write("starting tests");
  });

  QUnit.log(d => {
    if (!d.result) {
      write("\n");
      if (d.message) {
        write(cli.bold(cli.red(d.message)) + "\n");
      }
      write("expected " + JSON.stringify(d.expected) + "\n");
      write("got " + JSON.stringify(d.actual) + "\n");
      write(cli.red(d.source) + "\n");
    } else {
      write(cli.green("."));
    }
  });

  QUnit.moduleStart(d => {
    write("\n" + d.name)
  });

  QUnit.done(d => {
    write("\nRuntime: " + moment.duration(d.runtime).toISOString() + "\n");
    write("Total : " + d.total + "\n");
    write("Passed: " + cli.bold(cli.green("" + d.passed)) + "\n");
    write("Failed: " + cli.bold(cli.red("" + d.failed)) + "\n");

    done(!d.failed);
  });
}
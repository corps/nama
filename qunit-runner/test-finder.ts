import * as fs from "fs";
import * as path from "path";
import * as Rx from "rx";

export const NODE_TEST_REG = /\.node\.test\.ts$/;
export const BROWSER_TEST_REG = /\.browser\.test\.ts$/;

var root = path.join(__dirname, "..");

var findDirContents = Rx.Observable.fromNodeCallback<string[], string>(fs.readdir);
var getFileStat = Rx.Observable.fromNodeCallback<fs.Stats, string>(fs.stat);

export interface FileDetails {
  fileName: string
  isDir: boolean
  isFile: boolean
  lastModified: number
}

export function findRecursiveTestFiles(regExp:RegExp, dir = root):Rx.Observable<FileDetails> {
  var content$ = findDirContents(dir).selectMany(s => s).map(s => path.join(dir, s));

  return content$.flatMap(s => getFileStat(s), (fileName, stats):FileDetails => {
    return {
      fileName: fileName,
      isDir: stats.isDirectory(),
      isFile: stats.isFile() && !stats.isSymbolicLink(),
      lastModified: stats.mtime.getTime()
    };
  }).flatMap(details => {
    if (details.isDir && !details.fileName.match(/^\./) && details.fileName != "node_modules") {
      return findRecursiveTestFiles(regExp, details.fileName)
    } else if (details.isFile && details.fileName.match(regExp)) {
      return Rx.Observable.just({
        fileName: details.fileName.replace(/\.ts$/, ".js"),
        isDir: details.isDir,
        isFile: details.isFile,
        lastModified: details.lastModified
      })
    } else {
      return Rx.Observable.empty<FileDetails>();
    }
  });
}

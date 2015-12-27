declare module "sharp" {
  interface Sharp {
    (input:Buffer|string):Sharp
    resize(width:number, height:number):Sharp
    background(bg:{r:number, g:number, b:number, a:number}):Sharp
    embed():Sharp
    min():Sharp
    max():Sharp
    quality(q:number):Sharp
    jpeg():Sharp
    toBuffer():PromiseLike<Buffer>
    metadata():PromiseLike<{width:number, height:number}>
  }

  var sharp:Sharp;
  export = sharp;
}
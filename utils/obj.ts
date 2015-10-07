var objectAssign = require("object-assign");

export interface Transformer<T> {
  (o:T):(mutator:(o:T)=>void)=>T
}

export function tap<T>(o:T):(mutator:(o:T)=>void)=>T {
  return (...fs:((o:T)=>void)[]) => {
    for (var f of fs) {
      f(o);
    }
    return o;
  }
}

export function transform<T>(o:T):(mutator:(o:T)=>void)=>T {
  return (...fs:((o:T)=>void)[]) => {
    o = shallowCopy<T>(o);
    for (var f of fs) {
      f(o);
    }
    return o;
  }
}

export function shallowCopy<T>(o:T):T {
  return tap(Object.create(o.constructor.prototype))(dest => assign(dest, o));
}

export function assign<T>(dest:Object, src:T, ...others:T[]) {
  return objectAssign(dest, src, ...others);
}


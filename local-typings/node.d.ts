//declare class Promise<T> {
//  constructor(resolver:(resolvePromise:(value:T) => void,
//                           rejectPromise:(reason:any) => void) => void);
//  then<R>(onFulfilled:(value:T) => Promise<R>,
//          onRejected:(reason:any) => Promise<R>): Promise<R>;
//  then<R>(onFulfilled:(value:T) => Promise<R>, onRejected?:(reason:any) => R): Promise<R>;
//  then<R>(onFulfilled:(value:T) => R, onRejected:(reason:any) => Promise<R>): Promise<R>;
//  then<R>(onFulfilled?:(value:T) => R, onRejected?:(reason:any) => R): Promise<R>;
//}
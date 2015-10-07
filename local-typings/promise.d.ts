declare class Promise<T> {
  constructor(executor:(resolve:(value?:T | PromiseLike<T>) => void,
                        reject:(reason?:any) => void) => void)

  then<TResult>(onfulfilled?:(value:T) => TResult | PromiseLike<TResult>,
                onrejected?:(reason:any) => TResult | PromiseLike<TResult>):PromiseLike<TResult>;
  then<TResult>(onfulfilled?:(value:T) => TResult | PromiseLike<TResult>,
                onrejected?:(reason:any) => void):PromiseLike<TResult>;
}

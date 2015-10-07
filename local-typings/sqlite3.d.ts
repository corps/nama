declare module "sqlite3" {
  module Sqlite3 {
    enum Mode { }

    export const OPEN_READONLY:Mode;
    export const OPEN_READWRITE:Mode;
    export const OPEN_CREATE:Mode;

    export function verbose():typeof Sqlite3

    export class Statement {
    }

    export class Database {
      constructor(filename:string, mode?:Mode, cb?:(err:any)=>void)

      close(cb?:(err:any)=>void):void

      /***
       *
       * @param sql
       * The SQL query to run. If the SQL query is invalid and a callback was passed to the function, it is called with an error object containing the error message from SQLite. If no callback was passed and preparing fails, an error event will be emitted on the underlying Statement object.
       * @param params
       * When the SQL statement contains placeholders, you can pass them in here. They will be bound to the statement before it is executed. There are three ways of passing bind parameters: directly in the function's arguments, as an array, and as an object for named parameters. This automatically sanitizes inputs RE: issue #57.
       * @param cb
       * If given, it will be called when an error occurs during any step of the statement preparation or execution, and after the query was run. If an error occurred, the first (and only) parameter will be an error object containing the error message. If execution was successful, the first parameter is null. The context of the function (the this object inside the function) is the statement object. Note that it is not possible to run the statement again because it is automatically finalized after running for the first time. Any subsequent attempts to run the statement again will fail.
       */
      run(sql:string, params?:any[], cb?:(err:any)=>void):Database

      exec(sql:string, cb?:(err:any)=>void):Database

      /***
       * Runs the SQL query with the specified parameters and calls the callback with the first result row afterwards. The function returns the Database object to allow for function chaining. The parameters are the same as the Database#run function, with the following differences:

       The signature of the callback is function(err, row) {}. If the result set is empty, the second parameter is undefined, otherwise it is an object containing the values for the first row. The property names correspond to the column names of the result set. It is impossible to access them by column index; the only supported way is by column name.
       * @param sql
       * @param params
       * @param cb
       */
      get(sql:string, params?:any[], cb?:(err:any, row:any)=>void):Database

      /***
       * Runs the SQL query with the specified parameters and calls the callback with all result rows afterwards. The function returns the Database object to allow for function chaining. The parameters are the same as the Database#run function, with the following differences:

       The signature of the callback is function(err, rows) {}. If the result set is empty, the second parameter is an empty array, otherwise it contains an object for each result row which in turn contains the values of that row, like the Database#get function.

       Note that it first retrieves all result rows and stores them in memory. For queries that have potentially large result sets, use the Database#each function to retrieve all rows or Database#prepare followed by multiple Statement#get calls to retrieve a previously unknown amount of rows.
       * @param sql
       * @param params
       * @param cb
       */
      all(sql:string, params?:any[], cb?:(err:any, rows:any[])=>void):Database

      /***
       * Runs the SQL query with the specified parameters and calls the callback with for each result row. The function returns the Database object to allow for function chaining. The parameters are the same as the Database#run function, with the following differences:

       The signature of the callback is function(err, row) {}. If the result set succeeds but is empty, the callback is never called. In all other cases, the callback is called once for every retrieved row. The order of calls correspond exactly to the order of rows in the result set.

       After all row callbacks were called, the completion callback will be called if present. The first argument is an error object, and the second argument is the number of retrieved rows. If you specify only one function, it will be treated as row callback, if you specify two, the first (== second to last) function will be the row callback, the last function will be the completion callback.

       If you know that a query only returns a very limited number of rows, it might be more convenient to use Database#all to retrieve all rows at once.

       There is currently no way to abort execution.
       * @param sql
       * @param params
       * @param cb
       * @param doneCb
       */
      each(sql:string, params?:any[], cb?:(err:any, row:any)=>void,
           doneCb?:(err:any)=>void):Database

      bind(sql:string, params:any[], cb?:(err:any)=>void):Statement

      serialize(cb:()=>void):Database

      parallelize(cb:()=>void):Database
    }
  }
  export = Sqlite3
}
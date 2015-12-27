export class LocalStorage {
  constructor(private storage:Storage) {
  }

  keys():string[] {
    if (this.storage === window.localStorage) {
      return Object.keys(window.localStorage);
    }
    var keys = [] as string[];
    for (var i = 0; i < this.storage.length; ++i) {
      var key = this.storage.key(i);
      if (key) keys.push(key);
    }
    return keys;
  }

  get(key:string):any {
    try {
      return JSON.parse(this.storage.getItem(key))
    } catch (e) {
      return null;
    }
  }

  set(key:string, v:any) {
    this.storage.setItem(key, JSON.stringify(v));
  }

  remove(key:string) {
    this.storage.removeItem(key);
  }

  clear() {
    this.storage.clear();
  }
}

export class MemoryStorage implements Storage {
  inner = {} as {[k:string]:string};
  _keys = undefined as string[];

  constructor() {
  }

  clear() {
    this.inner = {};
    this._keys = null;
  }

  get length() {
    return this.keys.length;
  }

  getItem(key:string) {
    return this.inner[key];
  }

  key(index:number) {
    return this.keys[index];
  }

  get keys() {
    if (this._keys == null) this._keys = Object.keys(this.inner);
    return this._keys;
  }

  setItem(key:string, value:string) {
    this.inner[key] = value.toString();
    this._keys = null;
  }

  removeItem(key:string) {
    delete this.inner[key];
    this._keys = null;
  }

  [k:string]:any;
}
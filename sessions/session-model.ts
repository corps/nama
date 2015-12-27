export interface ServerSession {
  loggedInUserId?:number
  sessionXsrfToken?:string
  oauthToken?:string
  oauthSecret?:string
}

export class ClientSession {
  loggedInUserId = -1;
  sessionXsrfToken = "";
  userName = "";

  isLoggedIn() {
    return this.loggedInUserId >= 0;
  }
}
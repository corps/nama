CREATE TABLE users (
  id INTEGER NOT NULL PRIMARY KEY
);

CREATE TABLE oauthLogins (
  userId     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider    VARCHAR NOT NULL,
  token       VARCHAR NOT NULL,
  secret      VARCHAR NOT NULL,
  externalId VARCHAR NOT NULL
);

CREATE INDEX idxOauthByUserId ON oauthLogins ( userId );
CREATE UNIQUE INDEX idxUniqOauthLogins ON oauthLogins ( provider, externalId );

CREATE TABLE studyBooks (
  id INTEGER NOT NULL PRIMARY KEY,
  userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guid VARCHAR NOT NULL,
  syncVersion INTEGER DEFAULT 0
);

CREATE UNIQUE INDEX idxStudyBookGuid ON studyBooks ( guid );
CREATE INDEX idxStudyBookUserId ON studyBooks ( userId );

CREATE TABLE schedule (
  id INTEGER NOT NULL PRIMARY KEY,
  clozeIdentifier VARCHAR NOT NULL,
  studyBookId INTEGER NOT NULL REFERENCES studyBooks(id) ON DELETE CASCADE,
  noteId VARCHAR NOT NULL,
  marker VARCHAR NOT NULL,
  clozeIdx NUMBER NOT NULL,
  dueAtMinutes INTEGER NOT NULL,
  noteVersion INTEGER NOT NULL,
  tags VARCHAR NOT NULL,
  leaseExpiresAtUnix INTEGER DEFAULT -1
);

CREATE UNIQUE INDEX idxScheduleIdentifier ON schedule ( clozeIdentifier );
CREATE INDEX idxScheduleByNoteId ON schedule ( noteId );
CREATE INDEX idxScheduleByDue ON schedule ( studyBookId, dueAtMinutes );

ALTER TABLE noteContents ADD COLUMN userId INTEGER NULL;
CREATE INDEX idxUserIdOfContents ON noteContents ( userId );

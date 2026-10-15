DROP TRIGGER IF EXISTS sonluz_posts_insert_media;
DROP TRIGGER IF EXISTS sonluz_posts_update_media;

CREATE TRIGGER sonluz_posts_insert_media
AFTER INSERT ON sonluz_posts
BEGIN
  INSERT INTO sonluz_post_media (post_id, media_key)
  SELECT NEW.id, m.key FROM sonluz_media m
  WHERE NEW.cover_image = '/media/' || m.key OR EXISTS (
    SELECT 1 FROM json_tree(NEW.content) AS node
    WHERE CASE WHEN node.type = 'object' THEN
      json_extract(node.value, '$.type') = 'image'
      AND json_extract(node.value, '$.attrs.src') = '/media/' || m.key
    ELSE 0 END
  );
END;

CREATE TRIGGER sonluz_posts_update_media
AFTER UPDATE OF content, cover_image ON sonluz_posts
BEGIN
  DELETE FROM sonluz_post_media WHERE post_id = NEW.id;
  INSERT INTO sonluz_post_media (post_id, media_key)
  SELECT NEW.id, m.key FROM sonluz_media m
  WHERE NEW.cover_image = '/media/' || m.key OR EXISTS (
    SELECT 1 FROM json_tree(NEW.content) AS node
    WHERE CASE WHEN node.type = 'object' THEN
      json_extract(node.value, '$.type') = 'image'
      AND json_extract(node.value, '$.attrs.src') = '/media/' || m.key
    ELSE 0 END
  );
END;

DELETE FROM sonluz_post_media;
INSERT INTO sonluz_post_media (post_id, media_key)
SELECT p.id, m.key FROM sonluz_posts AS p JOIN sonluz_media AS m
WHERE p.cover_image = '/media/' || m.key OR EXISTS (
  SELECT 1 FROM json_tree(p.content) AS node
  WHERE CASE WHEN node.type = 'object' THEN
    json_extract(node.value, '$.type') = 'image'
    AND json_extract(node.value, '$.attrs.src') = '/media/' || m.key
  ELSE 0 END
);

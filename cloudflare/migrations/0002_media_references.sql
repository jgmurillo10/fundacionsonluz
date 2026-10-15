CREATE TRIGGER IF NOT EXISTS sonluz_posts_insert_media
AFTER INSERT ON sonluz_posts
BEGIN
  INSERT INTO sonluz_post_media (post_id, media_key)
  SELECT NEW.id, m.key FROM sonluz_media m
  WHERE NEW.cover_image = '/media/' || m.key
     OR EXISTS (SELECT 1 FROM json_tree(NEW.content) WHERE key = 'src' AND value = '/media/' || m.key);
END;

CREATE TRIGGER IF NOT EXISTS sonluz_posts_update_media
AFTER UPDATE OF content, cover_image ON sonluz_posts
BEGIN
  DELETE FROM sonluz_post_media WHERE post_id = NEW.id;
  INSERT INTO sonluz_post_media (post_id, media_key)
  SELECT NEW.id, m.key FROM sonluz_media m
  WHERE NEW.cover_image = '/media/' || m.key
     OR EXISTS (SELECT 1 FROM json_tree(NEW.content) WHERE key = 'src' AND value = '/media/' || m.key);
END;

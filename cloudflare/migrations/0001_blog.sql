CREATE TABLE IF NOT EXISTS sonluz_posts (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 180),
  slug TEXT NOT NULL UNIQUE CHECK (length(slug) BETWEEN 1 AND 100),
  excerpt TEXT NOT NULL DEFAULT '' CHECK (length(excerpt) <= 350),
  content TEXT NOT NULL CHECK (json_valid(content)),
  cover_image TEXT NOT NULL DEFAULT '',
  cover_alt TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('Noticias', 'Encuentros', 'Historias', 'Nuestra fundación')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  CHECK (status != 'published' OR published_at IS NOT NULL),
  CHECK (cover_image = '' OR length(cover_alt) > 0)
);
CREATE INDEX IF NOT EXISTS sonluz_posts_public ON sonluz_posts(status, published_at DESC);
CREATE TABLE IF NOT EXISTS sonluz_media (
  key TEXT PRIMARY KEY NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes INTEGER NOT NULL CHECK (size_bytes BETWEEN 1 AND 10485760),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sonluz_post_media (
  post_id TEXT NOT NULL REFERENCES sonluz_posts(id) ON DELETE CASCADE,
  media_key TEXT NOT NULL REFERENCES sonluz_media(key),
  PRIMARY KEY (post_id, media_key)
);
CREATE INDEX IF NOT EXISTS sonluz_media_posts ON sonluz_post_media(media_key, post_id);

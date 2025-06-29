-- Initialize site config
-- Add your site config seed data here
INSERT INTO site_config (
  site_title,
  site_subtitle,
  author_name,
  social_links,
  meta_description,
  is_active
) VALUES (
  'My Personal Blog',
  'Sharing thoughts and experiences',
  'Blog Author',
  '[{"platform":"github","url":"https://github.com/username","icon":"fa-github","display_text":"GitHub"},{"platform":"twitter","url":"https://twitter.com/username","icon":"fa-twitter","display_text":"Twitter"},{"platform":"email","url":"mailto:contact@example.com","icon":"fa-envelope","display_text":"Email"},{"platform":"rss","url":"/rss.xml","icon":"fa-rss","display_text":"RSS Feed"}]',
  'A personal blog sharing insights on technology, programming, and life experiences.',
  1
); 
-- 初始 Provider、充值档位和演示数据。
INSERT INTO video.provider_accounts (provider_key, modality, display_name, priority, config)
VALUES
  ('mock', 'video', 'Mock Video', 1, '{"models":["mock-video"]}'),
  ('google_gemini', 'video', 'Google Veo Gemini', 20, '{"models":["google-veo-gemini"]}'),
  ('google_vertex', 'video', 'Google Veo Vertex', 30, '{"models":["google-veo-vertex"]}'),
  ('seedance', 'video', 'Seedance', 40, '{"models":["seedance-video"]}'),
  ('kling', 'video', 'Kling', 50, '{"models":["kling-video"]}'),
  ('runway', 'video', 'Runway', 60, '{"models":["runway-video"]}'),
  ('mock', 'image', 'Mock Image', 1, '{"models":["mock-image"]}'),
  ('flux', 'image', 'Flux Schnell', 20, '{"models":["flux-schnell"]}'),
  ('sdxl', 'image', 'SDXL Turbo', 30, '{"models":["sdxl-turbo"]}'),
  ('dalle', 'image', 'DALL-E 3', 40, '{"models":["dalle-3"]}'),
  ('ideogram', 'image', 'Ideogram', 50, '{"models":["ideogram-v2"]}')
ON CONFLICT DO NOTHING;

INSERT INTO public.materials (id, user_id, material_type, source, title, url, mime_type, status, metadata)
VALUES
  ('00000000-0000-0000-0000-000000000101', NULL, 'image', 'seed', 'Mock产品图', 'https://placehold.co/1024x1024', 'image/png', 'active', '{"tags":["mock","product"]}'),
  ('00000000-0000-0000-0000-000000000102', NULL, 'video', 'seed', 'Mock演示视频', 'https://example.com/mock-video.mp4', 'video/mp4', 'active', '{"duration":15}')
ON CONFLICT (id) DO NOTHING;

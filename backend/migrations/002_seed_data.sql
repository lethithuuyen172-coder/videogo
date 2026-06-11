-- 初始 Provider、演示账号和验收数据。保持幂等，方便重复初始化。
DO $$
DECLARE
  admin_id uuid;
  user1_id uuid;
  user2_id uuid;
  material_ids uuid[] := ARRAY[]::uuid[];
  canvas_ids uuid[] := ARRAY[]::uuid[];
  idx integer;
BEGIN
  INSERT INTO public.users (email, password_hash, display_name, role, status, credit_balance, email_verified_at)
  VALUES
    ('admin@demo.com', '$2b$12$JfWnwyQJ3nrFhI4kfXzMnuyvySHd3scx6FHjbY/T5Eybp70q2YgEW', '管理员', 'admin', 'active', 10000, now()),
    ('user1@demo.com', '$2b$12$JfWnwyQJ3nrFhI4kfXzMnuyvySHd3scx6FHjbY/T5Eybp70q2YgEW', '创作者一号', 'user', 'active', 500, now()),
    ('user2@demo.com', '$2b$12$JfWnwyQJ3nrFhI4kfXzMnuyvySHd3scx6FHjbY/T5Eybp70q2YgEW', '创作者二号', 'user', 'active', 500, now())
  ON CONFLICT (email) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      role = EXCLUDED.role,
      status = EXCLUDED.status,
      credit_balance = EXCLUDED.credit_balance,
      email_verified_at = COALESCE(public.users.email_verified_at, now());

  SELECT id INTO admin_id FROM public.users WHERE email = 'admin@demo.com';
  SELECT id INTO user1_id FROM public.users WHERE email = 'user1@demo.com';
  SELECT id INTO user2_id FROM public.users WHERE email = 'user2@demo.com';

  IF NOT EXISTS (
    SELECT 1 FROM video.provider_accounts WHERE provider_key = 'openai' AND modality = 'image'
  ) THEN
    INSERT INTO video.provider_accounts (provider_key, modality, display_name, priority, status, config)
    VALUES ('openai', 'image', 'OpenAI DALL-E', 10, 'active', '{"models":["dalle-3"]}');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM video.provider_accounts WHERE provider_key = 'mock' AND modality = 'video'
  ) THEN
    INSERT INTO video.provider_accounts (provider_key, modality, display_name, priority, config)
    VALUES
      ('mock', 'video', 'Mock Video', 1, '{"models":["mock-video"]}'),
      ('mock', 'image', 'Mock Image', 1, '{"models":["mock-image"]}'),
      ('google_gemini', 'video', 'Google Veo Gemini', 20, '{"models":["google-veo-gemini"]}'),
      ('google_vertex', 'video', 'Google Veo Vertex', 30, '{"models":["google-veo-vertex"]}'),
      ('seedance', 'video', 'Seedance', 40, '{"models":["seedance-video"]}'),
      ('kling', 'video', 'Kling', 50, '{"models":["kling-video"]}'),
      ('runway', 'video', 'Runway', 60, '{"models":["runway-video"]}'),
      ('flux', 'image', 'Flux Schnell', 20, '{"models":["flux-schnell"]}'),
      ('sdxl', 'image', 'SDXL Turbo', 30, '{"models":["sdxl-turbo"]}'),
      ('ideogram', 'image', 'Ideogram', 50, '{"models":["ideogram-v2"]}');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.materials WHERE user_id = user1_id AND source = 'seed') THEN
    FOR idx IN 1..10 LOOP
      INSERT INTO public.materials (user_id, material_type, source, title, url, mime_type, status, tags, metadata)
      VALUES (
        user1_id,
        CASE WHEN idx IN (3, 7) THEN 'video' WHEN idx = 5 THEN 'audio' WHEN idx = 9 THEN 'text' ELSE 'image' END,
        'seed',
        '演示素材 ' || idx,
        CASE WHEN idx IN (3, 7) THEN 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' ELSE 'https://placehold.co/900x1200?text=Asset+' || idx END,
        CASE WHEN idx IN (3, 7) THEN 'video/mp4' WHEN idx = 5 THEN 'audio/mpeg' WHEN idx = 9 THEN 'text/plain' ELSE 'image/png' END,
        'active',
        ARRAY['demo', 'seed'],
        jsonb_build_object('index', idx)
      )
      RETURNING id INTO material_ids[idx];
    END LOOP;
  ELSE
    SELECT array_agg(id ORDER BY created_at) INTO material_ids
    FROM public.materials
    WHERE user_id = user1_id AND source = 'seed';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM canvas.canvases WHERE user_id = user1_id AND title LIKE '演示画布%') THEN
    FOR idx IN 1..3 LOOP
      INSERT INTO canvas.canvases (user_id, title, width, height, background_color)
      VALUES (user1_id, '演示画布 ' || idx, 1080, 1920, '#ffffff')
      RETURNING id INTO canvas_ids[idx];

      INSERT INTO canvas.canvas_elements (user_id, canvas_id, element_type, z_index, x, y, width, height, props)
      VALUES
        (user1_id, canvas_ids[idx], 'rect', 1, 120, 180, 840, 420, '{"fill":"#0f766e"}'),
        (user1_id, canvas_ids[idx], 'text', 2, 160, 260, 760, 120, jsonb_build_object('content', 'TikTok 产品模板 ' || idx, 'fontSize', 56, 'color', '#ffffff'));
    END LOOP;
  ELSE
    SELECT array_agg(id ORDER BY created_at) INTO canvas_ids
    FROM canvas.canvases
    WHERE user_id = user1_id AND title LIKE '演示画布%';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM community.community_works WHERE user_id = user1_id AND title LIKE '演示作品%') THEN
    FOR idx IN 1..5 LOOP
      INSERT INTO community.community_works (user_id, material_id, canvas_id, work_type, title, description, cover_url, status, like_count, bookmark_count)
      VALUES (
        user1_id,
        material_ids[LEAST(idx, array_length(material_ids, 1))],
        canvas_ids[LEAST(((idx - 1) % 3) + 1, array_length(canvas_ids, 1))],
        CASE WHEN idx = 2 THEN 'video' WHEN idx = 4 THEN 'canvas' ELSE 'image' END,
        '演示作品 ' || idx,
        '用于本地验收的社区作品',
        'https://placehold.co/900x1200?text=Work+' || idx,
        CASE WHEN idx <= 3 THEN 'published' ELSE 'pending_review' END,
        idx * 3,
        idx
      );
    END LOOP;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.credit_records WHERE user_id = user1_id AND task_id LIKE 'seed-%') THEN
    FOR idx IN 1..20 LOOP
      INSERT INTO public.credit_records (user_id, task_id, record_type, amount, balance_after, description, idempotency_key)
      VALUES (
        user1_id,
        'seed-' || idx,
        CASE
          WHEN idx % 5 = 0 THEN 'recharge'
          WHEN idx % 7 = 0 THEN 'refund'
          WHEN idx % 11 = 0 THEN 'freeze'
          WHEN idx % 13 = 0 THEN 'adjust'
          ELSE 'deduct'
        END,
        CASE WHEN idx % 5 = 0 OR idx % 7 = 0 THEN 100 ELSE -10 END,
        500 - idx * 3,
        '演示积分流水 ' || idx,
        'seed-credit-' || idx
      );
    END LOOP;
  END IF;

  INSERT INTO public.audit_logs (actor_user_id, action, resource_type, resource_id, metadata)
  VALUES (admin_id, 'seed', 'system', 'initial-data', jsonb_build_object('user2_id', user2_id))
  ON CONFLICT DO NOTHING;
END $$;

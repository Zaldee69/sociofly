import { NextResponse } from 'next/server';
import { postToFacebook } from '@/lib/utils/facebook';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  const { user_id, content, scheduled_time, media_url } = await req.json();

  try {
    // 1. Dapatkan Facebook token dari Supabase
    const { data, error } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (error || !data) throw new Error('Facebook not connected');

    // 2. Post ke Facebook
    const result = await postToFacebook(
      data.page_id,
      data.access_token,
      content,
      media_url
    );

    // 3. Simpan ke database
    await supabase.from('scheduled_posts').insert({
      user_id,
      platform: 'facebook',
      content,
      scheduled_time,
      status: 'posted',
      external_id: result.id,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to schedule post' },
      { status: 500 }
    );
  }
}
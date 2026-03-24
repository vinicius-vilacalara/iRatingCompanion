const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Supabase Setup ─────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ─── Middleware ───────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── API Routes ──────────────────────────────

// SETTINGS

app.get('/api/settings', async (req, res) => {
  const { data, error } = await supabase
    .from('settings')
    .select('*');

  if (error) return res.status(500).json(error);

  const map = Object.fromEntries(data.map(r => [r.key, r.value]));
  res.json(map);
});

app.put('/api/settings', async (req, res) => {
  const { current_irating, current_safety } = req.body;

  if (current_irating !== undefined) {
    await supabase
      .from('settings')
      .upsert({ key: 'current_irating', value: String(current_irating) });
  }

  if (current_safety !== undefined) {
    await supabase
      .from('settings')
      .upsert({ key: 'current_safety', value: String(current_safety) });
  }

  res.json({ success: true });
});

// SESSIONS

app.get('/api/sessions', async (req, res) => {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('date', { ascending: false });

  if (error) return res.status(500).json(error);

  res.json(data);
});

app.post('/api/sessions', async (req, res) => {
  const {
    irating_gain,
    safety_gain,
    start_position,
    final_position,
    car,
    track,
    obs
  } = req.body;

  // pegar settings atuais
  const { data: settingsData, error: settingsError } = await supabase
    .from('settings')
    .select('*');

  if (settingsError) return res.status(500).json(settingsError);

  const map = Object.fromEntries(settingsData.map(r => [r.key, r.value]));

  const currentIrating = parseInt(map.current_irating) || 1500;
  const currentSafety = parseFloat(map.current_safety) || 3.0;

  const newIrating = currentIrating + parseInt(irating_gain || 0);
  const newSafety = Math.max(
    0,
    parseFloat((currentSafety + parseFloat(safety_gain || 0)).toFixed(2))
  );

  const { data, error } = await supabase
    .from('sessions')
    .insert([{
      irating_gain: parseInt(irating_gain),
      safety_gain: parseFloat(safety_gain),
      start_position: start_position || null,
      final_position: final_position || null,
      car: car || null,
      track: track || null,
      obs: obs || null,
      irating_after: newIrating,
      safety_after: newSafety
    }])
    .select();

  if (error) return res.status(500).json(error);

  // atualizar settings
  await supabase.from('settings').upsert({
    key: 'current_irating',
    value: String(newIrating)
  });

  await supabase.from('settings').upsert({
    key: 'current_safety',
    value: String(newSafety)
  });

  res.json({
    id: data[0].id,
    irating_after: newIrating,
    safety_after: newSafety
  });
});

app.delete('/api/sessions/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  await supabase
    .from('sessions')
    .delete()
    .eq('id', id);

  // pegar última sessão
  const { data: last } = await supabase
    .from('sessions')
    .select('*')
    .order('date', { ascending: false })
    .limit(1);

  if (last && last.length > 0) {
    await supabase.from('settings').upsert({
      key: 'current_irating',
      value: String(last[0].irating_after)
    });

    await supabase.from('settings').upsert({
      key: 'current_safety',
      value: String(last[0].safety_after)
    });
  }

  res.json({ success: true });
});

// FRONTEND

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// START

app.listen(PORT, () => {
  console.log(`\n🏁 iRacing Tracker running at http://localhost:${PORT}\n`);
});
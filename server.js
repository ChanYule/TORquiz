const express = require('express');
const crypto = require('crypto');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json({ limit: '2mb' }));
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variable.');
}

const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_SECRET_KEY || 'placeholder-key'
);

function cleanNickname(nickname) {
  if (typeof nickname !== 'string') return '';
  return nickname
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 30);
}

function normalizeResult(row) {
  return {
    id: String(row.id), nickname: row.nickname, moduleName: row.module_name,
    correct: row.correct, wrong: row.wrong, total: row.total,
    percentage: Number(row.percentage), passed: row.passed,
    completedAt: row.completed_at, answers: Array.isArray(row.answers) ? row.answers : []
  };
}

async function getResults(includeAnswers = true) {
  const columns = includeAnswers ? '*' : 'id,nickname,module_name,correct,wrong,total,percentage,passed,completed_at';
  const { data, error } = await supabase.from('results').select(columns).order('completed_at', { ascending: false });
  if (error) throw error;
  return data.map(normalizeResult);
}

function isAdmin(req) {
  return req.get('x-admin-password') === ADMIN_PASSWORD;
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'Admin access denied.' });
  }
  next();
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'community-care-quiz' });
});

app.post('/api/login', (req, res) => {
  const nickname = cleanNickname(req.body.nickname);
  if (!nickname) return res.status(400).json({ error: 'Please enter a nickname.' });
  return res.json({ nickname });
});

app.post('/api/quiz-results', async (req, res) => {
  try {
    const nickname = cleanNickname(req.body.nickname);
    const moduleName = String(req.body.moduleName || '').slice(0, 100);
    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];

    if (!nickname || !moduleName || !answers.length) {
      return res.status(400).json({ error: 'Missing quiz result information.' });
    }

    const normalizedAnswers = answers.map((a, index) => ({
      questionNumber: Number(a.questionNumber || index + 1),
      question: String(a.question || ''),
      selectedAnswer: String(a.selectedAnswer || ''),
      correctAnswer: String(a.correctAnswer || ''),
      isCorrect: Boolean(a.isCorrect)
    }));

    const correct = normalizedAnswers.filter(a => a.isCorrect).length;
    const total = normalizedAnswers.length;
    const percentage = Number(((correct / total) * 100).toFixed(1));

    const result = {
      id: crypto.randomUUID(),
      nickname,
      moduleName,
      correct,
      wrong: total - correct,
      total,
      percentage,
      passed: percentage >= 80,
      completedAt: new Date().toISOString(),
      answers: normalizedAnswers
    };

    const { data, error } = await supabase.from('results').insert({
      id: result.id, nickname: result.nickname, module_name: result.moduleName,
      correct: result.correct, wrong: result.wrong, total: result.total,
      percentage: result.percentage, passed: result.passed,
      completed_at: result.completedAt, answers: result.answers
    }).select().single();
    if (error) throw error;
    return res.status(201).json(normalizeResult(data));
  } catch (error) {
    console.error('Could not save quiz result:', error);
    return res.status(500).json({ error: 'Could not save quiz result.' });
  }
});

app.post('/api/admin/login', (req, res) => {
  const password = String(req.body.password || '');
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect admin password.' });
  }
  return res.json({ ok: true });
});

app.get('/api/public/results', async (req, res) => {
  try {
    const results = await getResults(false);
    return res.json(results.map(({ answers, ...publicResult }) => publicResult));
  } catch (error) {
    console.error('Could not load public results:', error);
    return res.status(500).json({ error: 'Unable to load scores.' });
  }
});

app.get('/api/admin/results', requireAdmin, async (req, res) => {
  try {
    return res.json(await getResults(true));
  } catch (error) {
    console.error('Could not load admin results:', error);
    return res.status(500).json({ error: 'Unable to load results.' });
  }
});

app.delete('/api/admin/results/:id', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from('results').delete().eq('id', req.params.id);
    if (error) throw error;
    return res.json({ ok: true });
  } catch (error) {
    console.error('Could not delete result:', error);
    return res.status(500).json({ error: 'Could not delete attempt.' });
  }
});

app.delete('/api/admin/learners/:nickname', requireAdmin, async (req, res) => {
  try {
    const nickname = cleanNickname(req.params.nickname);
    const { data, error } = await supabase.from('results').delete().eq('nickname', nickname).select('id');
    if (error) throw error;
    return res.json({ ok: true, deleted: data ? data.length : 0, nickname });
  } catch (error) {
    console.error('Could not delete learner:', error);
    return res.status(500).json({ error: 'Could not delete learner.' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/scores', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'scores.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use((req, res) => {
  res.status(404).send('Page not found.');
});

app.use((error, req, res, next) => {
  console.error('Unhandled server error:', error);
  res.status(500).json({ error: 'Server error. Please try again.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Community Care Quiz is running on port ${PORT}`);
  console.log('Quiz scores are stored in Supabase.');
});

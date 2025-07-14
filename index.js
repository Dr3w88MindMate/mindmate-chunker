const express = require('express');
const bodyParser = require('body-parser');

const app = express();

// Middleware for JSON bodies at /chunk
app.use(bodyParser.json());

// Middleware for raw plain text at /chunk-raw
app.use('/chunk-raw', bodyParser.text({ type: 'text/plain' }));

const MAX_CHARS = 1600;

// Sentence-aware, character-constrained chunking
function chunkSentences(text) {
  const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
  const sentences = [...segmenter.segment(text)].map(s => s.segment.trim());

  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const withSentence = currentChunk ? `${currentChunk} ${sentence}` : sentence;
    if (withSentence.length > MAX_CHARS) {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = sentence;
    } else {
      currentChunk = withSentence;
    }
  }

  if (currentChunk) chunks.push(currentChunk);

  return chunks;
}

// JSON endpoint
app.post('/chunk', (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid `text` field in request body.' });
  }

  const chunks = chunkSentences(text);
  res.json({ chunks });
});

// Raw text endpoint
app.post('/chunk-raw', (req, res) => {
  const text = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid plain text in request body.' });
  }

  const chunks = chunkSentences(text);
  res.json({ chunks });
});

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Chunker service running at http://localhost:${PORT}`);
});

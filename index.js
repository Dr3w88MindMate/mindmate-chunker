const express = require('express');
const bodyParser = require('body-parser');
const splitter = require('sentence-splitter');

const app = express();

// JSON parser middleware for /chunk
app.use(bodyParser.json());

// Plain text parser middleware for /chunk-raw
app.use('/chunk-raw', bodyParser.text({ type: 'text/plain' }));

const MAX_CHARS = 1600;

function chunkSentences(text) {
  const sentences = splitter.split(text)
    .filter(node => node.type === 'Sentence')
    .map(node => node.raw.trim());

  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + ' ' + sentence).trim().length > MAX_CHARS) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += ' ' + sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Existing JSON endpoint
app.post('/chunk', (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid `text` field in request body.' });
  }

  const chunks = chunkSentences(text);
  res.json({ chunks });
});

// New raw text endpoint
app.post('/chunk-raw', (req, res) => {
  const text = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid plain text in request body.' });
  }

  const chunks = chunkSentences(text);
  res.json({ chunks });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Chunker service running at http://localhost:${PORT}`);
});

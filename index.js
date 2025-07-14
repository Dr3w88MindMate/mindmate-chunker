const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use('/chunk-raw', bodyParser.text({ type: 'text/plain' }));

const MAX_CHARS = 1600;

function sanitizeMarkdown(chunk) {
  const asteriskCount = (chunk.match(/\*/g) || []).length;
  return asteriskCount % 2 !== 0 ? chunk + '*' : chunk;
}

function chunkSentences(text) {
  // Break into sentence-like segments
  const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
  const rawSentences = [...segmenter.segment(text)].map(s => s.segment.trim());

  const chunks = [];
  let currentChunk = '';

  for (const sentence of rawSentences) {
    const bulletSafe = /^\d+\.\s|^\*\s/.test(sentence);
    const padded = currentChunk ? `${currentChunk} ${sentence}` : sentence;

    if (padded.length > MAX_CHARS) {
      if (currentChunk) {
        chunks.push(sanitizeMarkdown(currentChunk));
        currentChunk = sentence;
      } else {
        // Single long sentence - force split
        let remaining = sentence;
        while (remaining.length > MAX_CHARS) {
          chunks.push(remaining.slice(0, MAX_CHARS));
          remaining = remaining.slice(MAX_CHARS);
        }
        currentChunk = remaining;
      }
    } else {
      currentChunk = padded;
    }
  }

  if (currentChunk) {
    chunks.push(sanitizeMarkdown(currentChunk));
  }

  return chunks;
}

// JSON POST endpoint
app.post('/chunk', (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid `text` field in request body.' });
  }

  const chunks = chunkSentences(text);
  res.json({ chunks });
});

// Raw text POST endpoint
app.post('/chunk-raw', (req, res) => {
  const text = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid plain text in request body.' });
  }

  const chunks = chunkSentences(text);
  res.json({ chunks });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Chunker service running at http://localhost:${PORT}`);
});

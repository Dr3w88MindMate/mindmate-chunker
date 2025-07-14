const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use('/chunk-raw', bodyParser.text({ type: 'text/plain' }));

const MAX_CHARS = 1600;

// Fix unbalanced * or ** in markdown chunks
function sanitizeMarkdown(chunk) {
  const single = (chunk.match(/\*/g) || []).length;
  const double = (chunk.match(/\*\*/g) || []).length;

  // Adjust if there's an odd number of single or double asterisks
  if (single % 2 !== 0) chunk += '*';
  if (double % 2 !== 0) chunk += '*';

  return chunk.trim();
}

// Chunk by numbered/bulleted list items (1., 2., *, etc.)
function chunkByBulletItems(text) {
  const listItemRegex = /(?=\n?\d+\.\s)|(?=\n?\*\s)/g;
  const items = text.split(listItemRegex).map(i => i.trim()).filter(Boolean);

  const chunks = [];
  let currentChunk = '';

  for (const item of items) {
    const padded = currentChunk ? `${currentChunk}\n${item}` : item;

    if (padded.length > MAX_CHARS) {
      if (currentChunk) {
        chunks.push(sanitizeMarkdown(currentChunk));
        currentChunk = item;
      } else {
        // Single bullet is too long: force break into substrings
        let remaining = item;
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

// === JSON POST endpoint ===
app.post('/chunk', (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid `text` field in request body.' });
  }

  const chunks = chunkByBulletItems(text);
  res.json({ chunks });
});

// === Raw text POST endpoint ===
app.post('/chunk-raw', (req, res) => {
  const text = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid plain text in request body.' });
  }

  const chunks = chunkByBulletItems(text);
  res.json({ chunks });
});

// === Start server ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Chunker service running at http://localhost:${PORT}`);
});

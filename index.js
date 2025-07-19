const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const MAX_CHUNK_SIZE = 1600;

// ✅ Accept raw plain text payloads
app.use(bodyParser.text({ type: 'text/plain' }));

// ✅ Middleware for API key authentication
const API_KEY = process.env.API_KEY;

app.use((req, res, next) => {
  const key = req.headers['x-api-key'];
  if (!API_KEY || key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key.' });
  }
  next();
});

// 🧠 Split text at newline followed by number + dot + space, e.g. "\n1. "
function splitByBullets(text) {
  return text.split(/\n(?=\d{1,2}\.\s)/g);
}

function fixMarkdownBalance(chunk) {
  const singleStarCount = (chunk.match(/\*(?!\*)/g) || []).length;
  const doubleStarCount = (chunk.match(/\*\*/g) || []).length;

  let fixedChunk = chunk;

  if (singleStarCount % 2 !== 0) fixedChunk += '*';
  if (doubleStarCount % 2 !== 0) fixedChunk += '*';

  return fixedChunk;
}

function chunkText(text, maxLength = MAX_CHUNK_SIZE) {
  const parts = splitByBullets(text);
  const chunks = [];
  let current = '';

  for (let part of parts) {
    if ((current + part).length <= maxLength) {
      current += part;
    } else {
      if (current.trim()) {
        chunks.push(fixMarkdownBalance(current.trim()));
      }
      current = part;
    }
  }

  if (current.trim()) {
    chunks.push(fixMarkdownBalance(current.trim()));
  }

  return chunks;
}

// 📤 POST endpoint with secure access
app.post('/chunk', (req, res) => {
  const text = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid text in request body.' });
  }

  const chunks = chunkText(text);
  res.json({ chunks });
});

// 🚀 Start server
app.listen(3000, () => {
  console.log('✅ Chunker running on http://localhost:3000');
});

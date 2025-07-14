const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const MAX_CHUNK_SIZE = 1600;

// Use bodyParser.text() to accept raw text payloads
app.use(bodyParser.text({ type: 'text/plain' }));

function splitByBullets(text) {
  return text.split(/(?=\n?\d{1,2}\.\s|\n?\*\w+|\n?-\s)/g);
}

function fixMarkdownBalance(chunk) {
  const starCount = (chunk.match(/\*/g) || []).length;
  return starCount % 2 === 0 ? chunk : chunk + '*';
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

// Accept plain text
app.post('/chunk', (req, res) => {
  const text = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid text in request body.' });
  }

  const chunks = chunkText(text);
  res.json({ chunks });
});

app.listen(3000, () => {
  console.log('✅ Chunker running on http://localhost:3000');
});

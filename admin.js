import express from 'express';
import fs from 'fs';
import path from 'path';
import open from 'open';
import { exec } from 'child_process';

const app = express();
const PORT = 3000;

const ORIGINALS_DIR = path.join(process.cwd(), 'originals');
const MANIFEST_FILE = path.join(process.cwd(), 'originals-manifest.json');

app.use(express.json());
// Serve original images so the admin UI can render thumbnails directly
app.use('/raw-images', express.static(ORIGINALS_DIR));

// Simple HTML/JS User Interface injected directly as a responsive string dashboard
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Gallery Manager Admin</title>
      <style>
        body { font-family: -apple-system, sans-serif; background: #121212; color: #e0e0e0; margin: 0; padding: 30px; }
        h1 { font-weight: 300; letter-spacing: 2px; color: #fff; border-bottom: 1px solid #222; padding-bottom: 15px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 25px; margin-top: 20px; }
        .card { background: #1e1e1e; border: 1px solid #2c2c2c; border-radius: 6px; overflow: hidden; display: flex; flex-direction: column; }
        .img-container { width: 100%; height: 200px; background: #0a0a0a; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .img-container img { width: 100%; height: 100%; object-fit: contain; }
        .form { padding: 15px; flex-grow: 1; display: flex; flex-direction: column; gap: 10px; }
        label { font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 1px; }
        select { background: #2a2a2a; border: 1px solid #3a3a3a; color: #fff; padding: 8px; border-radius: 4px; width: 100%; box-sizing: border-box; }
        .actions { position: fixed; bottom: 30px; right: 30px; z-index: 1000; }
        button.save-btn { background: #0076ff; color: #fff; border: none; padding: 12px 30px; font-size: 1rem; border-radius: 20px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,118,255,0.4); font-weight: bold; transition: background 0.2s, transform 0.1s; }
        button.save-btn:hover { background: #0062d6; }
        button.save-btn:active { transform: scale(0.98); }
        button.save-btn.success { background: #34c759; box-shadow: 0 4px 12px rgba(52,199,89,0.4); }
        button.save-btn.error { background: #ff3b30; box-shadow: 0 4px 12px rgba(255,59,48,0.4); }
      </style>
    </head>
    <body>
      <h1>Gallery Manager Dashboard</h1>
      <div id="gallery-grid" class="grid">Loading items...</div>
      
      <div class="actions">
        <button id="main-save-btn" class="save-btn" onclick="saveManifest()">Save Manifest & Sync</button>
      </div>

      <script>
        let currentManifest = {};
        const categories = ["Headshots", "Art", "Lifestyle", "Theatre", "Nature", "Uncategorized"];

        async function loadAdminData() {
          const res = await fetch('/api/manifest');
          const data = await res.json();
          currentManifest = data.manifest;
          renderGrid(data.files);
        }

        function renderGrid(files) {
          const container = document.getElementById('gallery-grid');
          if (files.length === 0) {
            container.innerHTML = '<p style="color:#666;">No source images found in originals/ folder.</p>';
            return;
          }

          container.innerHTML = files.map(file => {
            const meta = currentManifest[file] || { category: 'Uncategorized' };
            
            const optionsHtml = categories.map(cat => 
              \`<option value="\${cat}" \${meta.category === cat ? 'selected' : ''}>\${cat}</option>\`
            ).join('');

            return \`
              <div class="card" data-filename="\${file}">
                <div class="img-container">
                  <img src="/raw-images/\${encodeURIComponent(file)}" alt="Thumbnail">
                </div>
                <div class="form">
                  <div style="font-size:0.85rem; color:#aaa; word-break:break-all; font-family:monospace; margin-bottom: 5px;">\${file}</div>
                  
                  <label>Category</label>
                  <select class="field-category">\${optionsHtml}</select>
                </div>
              </div>
            \`;
          }).join('');
        }

        async function saveManifest() {
          const saveBtn = document.getElementById('main-save-btn');
          if (saveBtn.disabled) return;

          const cards = document.querySelectorAll('.card');
          const updatedManifest = {};

          cards.forEach(card => {
            const filename = card.getAttribute('data-filename');
            const category = card.querySelector('.field-category').value;
            
            // Retain existing title meta properties from old states to maintain backwards structural safety
            const existingMeta = currentManifest[filename] || {};
            const title = existingMeta.title || { en: '', uk: '', fr: '' };

            updatedManifest[filename] = {
              category: category,
              title: title
            };
          });

          // Visual feedback: state saving
          saveBtn.disabled = true;
          saveBtn.textContent = 'Saving & Optimizing...';

          try {
            const response = await fetch('/api/manifest', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ manifest: updatedManifest })
            });

            if (response.ok) {
              // Visual feedback: state success
              saveBtn.className = 'save-btn success';
              saveBtn.textContent = '✨ Saved & Synced!';
            } else {
              throw new Error('Failed to save');
            }
          } catch (err) {
            // Visual feedback: state error
            saveBtn.className = 'save-btn error';
            saveBtn.textContent = '❌ Error';
          } finally {
            // Reset button to default state after 2 seconds without blocking interaction
            setTimeout(() => {
              saveBtn.disabled = false;
              saveBtn.className = 'save-btn';
              saveBtn.textContent = 'Save Manifest & Sync';
            }, 2000);
          }
        }

        document.addEventListener('DOMContentLoaded', loadAdminData);
      </script>
    </body>
    </html>
  `);
});

// API endpoint to load manifest and current directory snapshot
app.get('/api/manifest', async (req, res) => {
  try {
    let manifest = {};
    if (fs.existsSync(MANIFEST_FILE)) {
      manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8'));
    }

    const files = fs.readdirSync(ORIGINALS_DIR).filter(f => 
      /\.(jpe?g|png|tiff|webp)$/i.test(f)
    );

    res.json({ manifest, files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to commit structural changes and automatically trigger optimization script
app.post('/api/manifest', (req, res) => {
  try {
    const { manifest } = req.body;
    fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log('✨ Local originals-manifest.json updated safely via Admin panel.');

    // Automate background config compile on every single dashboard save action
    exec('npm run optimize', (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Background optimization build process crash: ${error.message}`);
        return;
      }
      console.log('⚡ Background optimization trigger finished successfully.');
    });

    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Admin Dashboard running locally on http://localhost:${PORT}`);
  open(`http://localhost:${PORT}`);
});

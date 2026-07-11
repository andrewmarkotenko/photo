import sharp from 'sharp';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

const ORIGINALS_DIR = path.join(process.cwd(), 'originals');
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'images');
const MANIFEST_FILE = path.join(process.cwd(), 'originals-manifest.json');
const DATA_FILE = path.join(process.cwd(), 'src', 'data', 'projects.json');
const MAX_WIDTH = 1920; 

async function optimizeImagesWithManifest() {
  try {
    if (!fs.existsSync(ORIGINALS_DIR)) {
      console.log('❌ Error: originals/ folder not found.');
      return;
    }

    if (!fs.existsSync(MANIFEST_FILE)) {
      console.log('❌ Error: originals-manifest.json not found. Create it to map image categories.');
      return;
    }

    await fsPromises.mkdir(OUTPUT_DIR, { recursive: true });
    await fsPromises.mkdir(path.dirname(DATA_FILE), { recursive: true });

    // Read and parse the developer-defined manifest
    const manifestRaw = await fsPromises.readFile(MANIFEST_FILE, 'utf-8');
    const manifest = JSON.parse(manifestRaw);

    const originalFiles = await fsPromises.readdir(ORIGINALS_DIR);
    const validOriginals = originalFiles.filter(f => /\.(jpe?g|png|tiff|webp)$/i.test(f));
    const validOriginalsSet = new Set(validOriginals);

    // --- STEP 1: CLEANUP ORPHANED WEBP FILES IN PUBLIC/IMAGES ---
    const optimizedFiles = await fsPromises.readdir(OUTPUT_DIR);
    for (const webpFile of optimizedFiles) {
      const webpStat = await fsPromises.stat(path.join(OUTPUT_DIR, webpFile));
      if (webpStat.isDirectory()) continue; // Skip unexpected directories

      const webpBaseName = path.parse(webpFile).name;
      
      // Check if this webp still has a corresponding source file in originals
      const hasSource = validOriginals.some(origFile => path.parse(origFile).name === webpBaseName);
      if (!hasSource) {
        console.log(`🗑️ Removing deleted asset from bundle: public/images/${webpFile}`);
        await fsPromises.unlink(path.join(OUTPUT_DIR, webpFile));
      }
    }

    // Map to regroup images by their virtual categories for frontend projects.json structure
    const categoryGroups = {};

    // --- STEP 2: INCREMENTAL PROCESSING AND REGROUPING ---
    for (const file of validOriginals) {
      const fileData = manifest[file];
      
      // Fallback if file exists in originals folder but is missing from manifest configuration
      const category = fileData && fileData.category ? fileData.category : 'Uncategorized';
      const title = fileData && fileData.title ? fileData.title : {
        en: `${category} Image`,
        uk: `Зображення ${category}`,
        fr: `Image ${category}`
      };

      const inputFilePath = path.join(ORIGINALS_DIR, file);
      const outputFileName = `${path.parse(file).name}.webp`;
      const outputFilePath = path.join(OUTPUT_DIR, outputFileName);
      const webpPublicPath = `images/${outputFileName}`;

      // Optimize only if the webp target does not exist locally
      if (!fs.existsSync(outputFilePath)) {
        console.log(`⚡ Processing new asset to shared directory: ${file}...`);
        await sharp(inputFilePath)
          .resize({ width: MAX_WIDTH, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(outputFilePath);
      }

      // Initialize category group if empty
      if (!categoryGroups[category]) {
        categoryGroups[category] = {
          id: `${category.toLowerCase()}-gallery`,
          title: {
            en: `${category} Collection`,
            uk: `Колекція ${category}`,
            fr: `Collection ${category}`
          },
          category: category,
          images: []
        };
      }

      // Inject the image structure into its virtual registry category
      categoryGroups[category].images.push({
        url: webpPublicPath,
        alt: title
      });
    }

    // Convert grouped object records back into standard projects array for main.js data pipeline
    const projectsData = Object.values(categoryGroups);

    await fsPromises.writeFile(DATA_FILE, JSON.stringify(projectsData, null, 2));
    console.log('✨ Success! Virtual gallery synchronization complete.');

  } catch (error) {
    console.error('❌ Processing Error:', error);
  }
}

optimizeImagesWithManifest();

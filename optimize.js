import sharp from 'sharp';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

const ORIGINALS_DIR = path.join(process.cwd(), 'originals');
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'images');
const DATA_FILE = path.join(process.cwd(), 'src', 'data', 'projects.json');
const MAX_WIDTH = 1920; 

async function optimizeImages() {
  try {
    if (!fs.existsSync(ORIGINALS_DIR)) {
      console.log('❌ Error: originals/ folder not found in project root directory.');
      return;
    }

    await fsPromises.mkdir(OUTPUT_DIR, { recursive: true });
    await fsPromises.mkdir(path.dirname(DATA_FILE), { recursive: true });
    
    const categories = await fsPromises.readdir(ORIGINALS_DIR);
    const projectsData = [];

    for (const category of categories) {
      const categoryPath = path.join(ORIGINALS_DIR, category);
      const stat = await fsPromises.stat(categoryPath);

      if (!stat.isDirectory()) continue;

      const files = await fsPromises.readdir(categoryPath);
      const optimizedImages = [];

      await fsPromises.mkdir(path.join(OUTPUT_DIR, category), { recursive: true });

      for (const file of files) {
        if (!/\.(jpe?g|png|tiff|webp)$/i.test(file)) continue;

        const inputFilePath = path.join(categoryPath, file);
        const outputFileName = `${path.parse(file).name}.webp`;
        const outputFilePath = path.join(OUTPUT_DIR, category, outputFileName);
        const webpPublicPath = `images/${category}/${outputFileName}`;

        console.log(`⚡ Processing: ${category}/${file}...`);

        await sharp(inputFilePath)
          .resize({ width: MAX_WIDTH, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(outputFilePath);

        optimizedImages.push(webpPublicPath);
      }

      if (optimizedImages.length > 0) {
        projectsData.push({
          id: `${category.toLowerCase()}-gallery`,
          title: {
            en: `${category} Collection`,
            uk: `Колекція ${category}`
          },
          category: category,
          images: optimizedImages
        });
      }
    }

    await fsPromises.writeFile(DATA_FILE, JSON.stringify(projectsData, null, 2));
    console.log('✨ Success! public/images/ and projects.json updated.');

  } catch (error) {
    console.error('❌ Processing Error:', error);
  }
}

optimizeImages();

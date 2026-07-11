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

    // --- STEP 1: CLEANUP DELETED ORPHANED WEBP FILES ---
    if (fs.existsSync(OUTPUT_DIR)) {
      const outputCategories = await fsPromises.readdir(OUTPUT_DIR);
      
      for (const outCategory of outputCategories) {
        const outCategoryPath = path.join(OUTPUT_DIR, outCategory);
        const outStat = await fsPromises.stat(outCategoryPath);
        if (!outStat.isDirectory()) continue;

        // If the entire category folder was deleted from originals, remove it from output
        const originalCategoryPath = path.join(ORIGINALS_DIR, outCategory);
        if (!fs.existsSync(originalCategoryPath)) {
          console.log(`🗑️ Removing deleted category folder: public/images/${outCategory}`);
          await fsPromises.rm(outCategoryPath, { recursive: true, force: true });
          continue;
        }

        const webpFiles = await fsPromises.readdir(outCategoryPath);
        const originalFiles = await fsPromises.readdir(originalCategoryPath);
        
        // Create a set of base filenames (without extensions) present in originals
        const originalBaseNames = new Set(
          originalFiles
            .filter(f => /\.(jpe?g|png|tiff|webp)$/i.test(f))
            .map(f => path.parse(f).name)
        );

        for (const webpFile of webpFiles) {
          const webpBaseName = path.parse(webpFile).name;
          // If the webp doesn't have a matching original file, delete it
          if (!originalBaseNames.has(webpBaseName)) {
            const orphanPath = path.join(outCategoryPath, webpFile);
            console.log(`🗑️ Removing orphaned optimized image: public/images/${outCategory}/${webpFile}`);
            await fsPromises.unlink(orphanPath);
          }
        }
      }
    }

    // --- STEP 2: INCREMENTAL OPTIMIZATION ---
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

        // Check if the optimized webp file already exists to skip reprocessing
        if (fs.existsSync(outputFilePath)) {
          optimizedImages.push(webpPublicPath);
          continue;
        }

        console.log(`⚡ Processing new asset: ${category}/${file}...`);

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
            uk: `Колекція ${category}`,
            fr: `${category} Collection`
          },
          category: category,
          images: optimizedImages
        });
      }
    }

    await fsPromises.writeFile(DATA_FILE, JSON.stringify(projectsData, null, 2));
    console.log('✨ Success! public/images/ and projects.json updated natively.');

  } catch (error) {
    console.error('❌ Processing Error:', error);
  }
}

optimizeImages();

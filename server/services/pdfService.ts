import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { hostSpawn } from '../utils/hostSpawn.js';

/**
 * Get the page count of a PDF file.
 */
export async function getPageCount(pdfPath: string): Promise<number> {
  const bytes = fs.readFileSync(pdfPath);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return pdf.getPageCount();
}

/**
 * Extract a page range from a PDF and save to a new file.
 * Pages are 1-based (start=1 means first page).
 */
export async function extractPages(
  pdfPath: string,
  start: number,
  end: number,
  outputPath: string,
): Promise<void> {
  const bytes = fs.readFileSync(pdfPath);
  const sourcePdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();

  const startIdx = Math.max(0, start - 1);
  const endIdx = Math.min(sourcePdf.getPageCount() - 1, end - 1);

  const pageIndices = [];
  for (let i = startIdx; i <= endIdx; i++) {
    pageIndices.push(i);
  }

  const pages = await newPdf.copyPages(sourcePdf, pageIndices);
  for (const page of pages) {
    newPdf.addPage(page);
  }

  const newBytes = await newPdf.save();
  fs.writeFileSync(outputPath, newBytes);
}

/**
 * Generate PNG thumbnails for all pages of a PDF using pdftoppm (poppler-utils).
 * Returns the number of thumbnails generated.
 *
 * Output files: {outputDir}/{jobId}_thumb_{pageNum}.png (0-indexed)
 */
export async function generateThumbnails(
  pdfPath: string,
  jobId: string,
  outputDir: string,
  maxPages: number = 20,
): Promise<number> {
  const pageCount = await getPageCount(pdfPath);
  const pagesToRender = Math.min(pageCount, maxPages);

  // pdftoppm outputs files as {prefix}-{pagenum}.png
  // We render at 300px width (scale-to-x)
  const prefix = path.join(outputDir, `${jobId}_render`);

  const args = [
    '-png',
    '-scale-to-x', '400',
    '-scale-to-y', '-1', // maintain aspect ratio
    '-f', '1',
    '-l', String(pagesToRender),
    pdfPath,
    prefix,
  ];

  const proc = hostSpawn(['pdftoppm', ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    console.error('[PDF] pdftoppm failed:', stderr);
    return 0;
  }

  // pdftoppm names files like: {prefix}-01.png, {prefix}-02.png, etc.
  // Rename them to our convention: {jobId}_thumb_0.png, {jobId}_thumb_1.png
  let generated = 0;
  for (let i = 0; i < pagesToRender; i++) {
    // pdftoppm uses 1-based, zero-padded page numbers
    // Try different padding widths (pdftoppm adapts based on total pages)
    const pageStr = String(i + 1);
    const candidates = [
      `${prefix}-${pageStr.padStart(String(pagesToRender).length, '0')}.png`,
      `${prefix}-${pageStr.padStart(2, '0')}.png`,
      `${prefix}-${pageStr.padStart(3, '0')}.png`,
      `${prefix}-${pageStr}.png`,
    ];

    let found = false;
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        const thumbPath = path.join(outputDir, `${jobId}_thumb_${i}.png`);
        fs.renameSync(candidate, thumbPath);
        generated++;
        found = true;
        break;
      }
    }

    if (!found && i === 0) {
      // If even page 1 wasn't found, check what files were actually created
      const files = fs.readdirSync(outputDir).filter(f => f.startsWith(`${jobId}_render`));
      console.log('[PDF] pdftoppm output files:', files);
      // Try to rename whatever we find
      for (const file of files) {
        const match = file.match(/-(\d+)\.png$/);
        if (match) {
          const pageIdx = parseInt(match[1], 10) - 1;
          const thumbPath = path.join(outputDir, `${jobId}_thumb_${pageIdx}.png`);
          fs.renameSync(path.join(outputDir, file), thumbPath);
          generated++;
        }
      }
      break;
    }
  }

  console.log(`[PDF] Generated ${generated} thumbnails for job ${jobId}`);
  return generated;
}

/**
 * Get the path to a thumbnail file, or null if it doesn't exist.
 */
export function getThumbnailPath(
  tempDir: string,
  jobId: string,
  page: number,
): string | null {
  const thumbPath = path.join(tempDir, `${jobId}_thumb_${page}.png`);
  return fs.existsSync(thumbPath) ? thumbPath : null;
}

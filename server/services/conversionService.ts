import path from 'path';
import fs from 'fs';
import { hostSpawn } from '../utils/hostSpawn.js';

/**
 * Convert a document to PDF using LibreOffice headless mode.
 * Supports: DOCX, DOC, PNG, JPG, JPEG
 * Returns the path to the converted PDF.
 */
export async function convertToPdf(inputPath: string, outputDir: string): Promise<string> {
  const ext = path.extname(inputPath).toLowerCase();

  // PDF files don't need conversion
  if (ext === '.pdf') {
    return inputPath;
  }

  console.log('[Conversion] Converting to PDF:', inputPath);

  const proc = hostSpawn([
    'libreoffice',
    '--headless',
    '--convert-to', 'pdf',
    '--outdir', outputDir,
    inputPath,
  ], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  // Wait with 30 second timeout
  const timeout = setTimeout(() => {
    proc.kill();
  }, 30000);

  const exitCode = await proc.exited;
  clearTimeout(timeout);

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`LibreOffice conversion failed (exit ${exitCode}): ${stderr}`);
  }

  // LibreOffice outputs to the same directory with .pdf extension
  const baseName = path.basename(inputPath, ext);
  const pdfPath = path.join(outputDir, `${baseName}.pdf`);

  if (!fs.existsSync(pdfPath)) {
    throw new Error(`Conversion output not found: ${pdfPath}`);
  }

  // Delete the original non-PDF file
  try {
    fs.unlinkSync(inputPath);
    console.log('[Conversion] Deleted original:', inputPath);
  } catch {
    // Non-fatal
  }

  console.log('[Conversion] Success:', pdfPath);
  return pdfPath;
}

/**
 * Check if a file needs conversion (non-PDF).
 */
export function needsConversion(mimeType: string): boolean {
  return mimeType !== 'application/pdf';
}

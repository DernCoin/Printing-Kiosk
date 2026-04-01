import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { db, generateUUID } from '../utils/db/index.js';
import { extractPages } from './pdfService.js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getTempDir } from '../utils/tempDir.js';
import { hostSpawn } from '../utils/hostSpawn.js';

interface PrinterRow {
  id: string;
  name: string;
  system_name: string | null;
  ipp_url: string | null;
  is_active: number;
  source: string;
  added_at: string;
}

interface PrintOptions {
  copies: number;
  colorMode: 'bw' | 'color';
  duplex: boolean;
  pageRangeStart: number | null;
  pageRangeEnd: number | null;
  pageCount: number;
}

// --- System detection ---

let lpAvailableCache: boolean | null = null;

async function checkLpExists(): Promise<boolean> {
  if (lpAvailableCache !== null) return lpAvailableCache;
  try {
    const proc = hostSpawn(['which', 'lp'], { stdout: 'pipe', stderr: 'pipe' });
    lpAvailableCache = (await proc.exited) === 0;
  } catch {
    lpAvailableCache = false;
  }
  return lpAvailableCache;
}

/**
 * List system printers via lpstat -p.
 */
export async function listSystemPrinters(): Promise<string[]> {
  try {
    const proc = hostSpawn(['lpstat', '-p'], { stdout: 'pipe', stderr: 'pipe' });
    const exitCode = await proc.exited;
    const output = await new Response(proc.stdout).text();
    if (exitCode !== 0) return [];

    return output.split('\n')
      .filter((line) => line.startsWith('printer '))
      .map((line) => {
        const match = line.match(/^printer\s+(\S+)/);
        return match ? match[1] : '';
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Discover system printers and sync them into the printers table.
 * New printers are inserted. Existing ones are left alone. Disappeared printers are NOT removed.
 */
export async function discoverAndSyncPrinters(): Promise<void> {
  const systemNames = await listSystemPrinters();

  for (const sysName of systemNames) {
    const existing = db.prepare(
      "SELECT id FROM printers WHERE system_name = ? AND source = 'system'"
    ).get(sysName);

    if (!existing) {
      const displayName = sysName.replace(/_/g, ' ');
      db.prepare(
        'INSERT INTO printers (id, name, system_name, source) VALUES (?, ?, ?, ?)'
      ).run(generateUUID(), displayName, sysName, 'system');
      console.log(`[Printer] Discovered system printer: ${displayName} (${sysName})`);
    }
  }
}

/**
 * Get the currently active printer, or null if none selected.
 */
export function getActivePrinter(): PrinterRow | null {
  return (db.prepare('SELECT * FROM printers WHERE is_active = 1 LIMIT 1').get() as PrinterRow | undefined) || null;
}

/**
 * Get a printer by ID.
 */
export function getPrinterById(id: string): PrinterRow | null {
  return (db.prepare('SELECT * FROM printers WHERE id = ?').get(id) as PrinterRow | undefined) || null;
}

/**
 * Get all printers, ordered: active first, then system before manual, then alphabetical.
 */
export function getAllPrinters(): PrinterRow[] {
  return db.prepare(
    'SELECT * FROM printers ORDER BY is_active DESC, source ASC, name ASC'
  ).all() as PrinterRow[];
}

/**
 * Print a file to the active printer. Handles copies, color mode, and page range.
 * The file never leaves the server.
 */
export async function printToActivePrinter(
  pdfPath: string,
  options: PrintOptions,
): Promise<{ success: boolean; message: string; printerName?: string }> {
  const printer = getActivePrinter();
  if (!printer) {
    return { success: false, message: 'No active printer selected. Go to Settings to choose a printer.' };
  }
  return printToPrinter(printer, pdfPath, options);
}

/**
 * Print a file to a specific printer.
 */
export async function printToPrinter(
  printer: PrinterRow,
  pdfPath: string,
  options: PrintOptions,
): Promise<{ success: boolean; message: string; printerName?: string }> {
  if (!fs.existsSync(pdfPath)) {
    return { success: false, message: 'Print file not found on server' };
  }

  const lpExists = await checkLpExists();
  if (!lpExists) {
    return { success: false, message: 'Print system (CUPS/lp) is not installed on this server.' };
  }

  const destination = printer.system_name || printer.ipp_url;
  if (!destination) {
    return { success: false, message: `Printer "${printer.name}" has no system name or IPP URL configured` };
  }

  try {
    let fileToPrint = pdfPath;
    let tempExtracted: string | null = null;

    if (options.pageRangeStart !== null && options.pageRangeEnd !== null) {
      const tempDir = path.dirname(pdfPath);
      tempExtracted = path.join(tempDir, `print-${uuidv4()}.pdf`);
      await extractPages(pdfPath, options.pageRangeStart, options.pageRangeEnd, tempExtracted);
      fileToPrint = tempExtracted;
    }

    const args: string[] = ['-d', destination, '-n', String(options.copies)];
    if (options.colorMode === 'bw') {
      args.push('-o', 'print-color-mode=monochrome');
    } else {
      args.push('-o', 'print-color-mode=color');
    }
    if (options.duplex) {
      args.push('-o', 'sides=two-sided-long-edge');
    } else {
      args.push('-o', 'sides=one-sided');
    }
    args.push(fileToPrint);

    console.log(`[Printer] Printing to ${printer.name}: lp ${args.join(' ')}`);

    const proc = hostSpawn(['lp', ...args], { stdout: 'pipe', stderr: 'pipe' });
    const exitCode = await proc.exited;
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    if (tempExtracted && fs.existsSync(tempExtracted)) {
      fs.unlinkSync(tempExtracted);
    }

    if (exitCode === 0) {
      return { success: true, message: `Sent to ${printer.name}`, printerName: printer.name };
    } else {
      return { success: false, message: `Failed on ${printer.name}: ${stderr.trim() || `exit code ${exitCode}`}`, printerName: printer.name };
    }
  } catch (error: any) {
    return { success: false, message: `Print error: ${error.message}`, printerName: printer.name };
  }
}

/**
 * Generate and print a test page to a specific printer.
 */
export async function printTestPage(printerId: string): Promise<{ success: boolean; message: string }> {
  const printer = getPrinterById(printerId);
  if (!printer) return { success: false, message: 'Printer not found' };

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawText('Gibson Memorial Library', {
    x: 150, y: 600, size: 24, font: boldFont, color: rgb(0.486, 0.702, 0.259),
  });
  page.drawText('Print Kiosk — Test Page', {
    x: 190, y: 560, size: 18, font, color: rgb(0.2, 0.2, 0.2),
  });
  page.drawText(`Printer: ${printer.name}`, {
    x: 190, y: 520, size: 14, font, color: rgb(0.459, 0.459, 0.459),
  });
  page.drawText(`Printed: ${new Date().toLocaleString()}`, {
    x: 190, y: 490, size: 14, font, color: rgb(0.459, 0.459, 0.459),
  });
  page.drawText('If you can read this, printing is working!', {
    x: 150, y: 430, size: 16, font, color: rgb(0.2, 0.2, 0.2),
  });

  const pdfBytes = await pdf.save();
  const tempPath = path.join(getTempDir(), `test-${Date.now()}.pdf`);
  fs.writeFileSync(tempPath, pdfBytes);

  const result = await printToPrinter(printer, tempPath, {
    copies: 1, colorMode: 'bw', duplex: false, pageRangeStart: null, pageRangeEnd: null, pageCount: 1,
  });

  try { fs.unlinkSync(tempPath); } catch {}
  return result;
}

/**
 * Check if the print system (CUPS/lp) is available.
 */
export async function isSystemAvailable(): Promise<boolean> {
  return checkLpExists();
}

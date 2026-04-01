export type PrinterSource = 'system' | 'manual';

export interface Printer {
  id: string;
  name: string;
  system_name: string | null;
  ipp_url: string | null;
  is_active: boolean;
  source: PrinterSource;
  added_at: string;
}

export interface PrinterListResponse {
  printers: Printer[];
  systemAvailable: boolean;
}

export interface PrintResult {
  success: boolean;
  message: string;
  printerName?: string;
}

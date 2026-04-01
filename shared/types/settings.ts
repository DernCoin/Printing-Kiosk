export interface PricingConfig {
  bwPerPage: number;    // cents
  colorPerPage: number; // cents
}

export type SettingKey =
  | 'pricing_bw_per_page'
  | 'pricing_color_per_page'
  | 'job_timeout_minutes'
  | 'printer_mode'
  | 'printer_ipp_url'
  | 'printer_name'
  | 'staff_pin'
  | 'kiosk_pin'
  | 'ticket_reset_daily';

export type SettingsMap = Record<SettingKey, string>;

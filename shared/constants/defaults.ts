export const DEFAULTS = {
  // Pricing in cents
  BW_PER_PAGE: 10,
  COLOR_PER_PAGE: 25,

  // Timeouts
  JOB_TIMEOUT_MINUTES: 30,
  KIOSK_IDLE_SECONDS: 120,       // 2 minutes before auto-reset
  KIOSK_RESET_COUNTDOWN: 30,     // 30 second countdown on Done screen
  PHONE_QR_TIMEOUT_SECONDS: 300, // 5 minutes to upload via phone

  // File limits
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
  MAX_COPIES: 99,
  MIN_COPIES: 1,

  // Server
  DEFAULT_PORT: 3000,

  // Cleanup worker interval
  CLEANUP_INTERVAL_MS: 60 * 1000, // 1 minute
} as const;

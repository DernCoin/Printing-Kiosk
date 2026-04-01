import { staffApi } from './api';

/**
 * Print a job. The server handles everything — copies, color mode, page range,
 * and printer routing. No file ever touches the staff device.
 */
export async function handlePrint(jobId: string): Promise<{ success: boolean; message: string }> {
  try {
    const result = await staffApi.printJob(jobId);
    return {
      success: result.success,
      message: result.message || (result.success ? 'Sent to printer' : 'Print failed'),
    };
  } catch (error: any) {
    console.error('[Print] Failed:', error);
    return { success: false, message: error.message || 'Print failed' };
  }
}

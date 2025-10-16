import QRCode from 'qrcode';
import { encryptQRCode } from './crypto';
import logger from './logger';

export interface QRCodeData {
  ticketNumber: string;
  registrationId: string;
  eventId: string;
  userId: string;
  timestamp: number;
}

/**
 * Generate QR code data string
 */
export const generateQRCodeData = (data: QRCodeData): string => {
  return encryptQRCode(data);
};

/**
 * Generate QR code as data URL
 */
export const generateQRCodeDataURL = async (data: QRCodeData): Promise<string> => {
  try {
    const qrData = generateQRCodeData(data);
    const dataURL = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 512,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    } as any);
    return dataURL;
  } catch (error) {
    logger.error('Error generating QR code data URL:', error);
    throw new Error('Gagal membuat QR code');
  }
};

/**
 * Generate QR code as buffer
 */
export const generateQRCodeBuffer = async (data: QRCodeData): Promise<Buffer> => {
  try {
    const qrData = generateQRCodeData(data);
    const buffer = await (QRCode.toBuffer(qrData, {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 2,
      width: 512,
    } as any) as unknown as Promise<Buffer>);
    return buffer;
  } catch (error) {
    logger.error('Error generating QR code buffer:', error);
    throw new Error('Gagal membuat QR code');
  }
};

/**
 * Validate QR code age (prevent old QR codes from being used)
 */
export const isQRCodeValid = (timestamp: number, maxAgeHours: number = 24): boolean => {
  const now = Date.now();
  const age = now - timestamp;
  const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert hours to milliseconds
  return age <= maxAge;
};

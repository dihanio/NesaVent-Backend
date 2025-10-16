import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import config from '../config';

/**
 * Generate a random token
 */
export const generateToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate a verification code (6 digits)
 */
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash a string using SHA256
 */
export const hashString = (str: string): string => {
  return crypto.createHash('sha256').update(str).digest('hex');
};

/**
 * Encrypt data using AES
 */
export const encrypt = (data: string): string => {
  return CryptoJS.AES.encrypt(data, config.security.encryptionKey).toString();
};

/**
 * Decrypt data using AES
 */
export const decrypt = (encryptedData: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, config.security.encryptionKey);
  return bytes.toString(CryptoJS.enc.Utf8);
};

/**
 * Encrypt QR code data
 */
export const encryptQRCode = (data: any): string => {
  const jsonString = JSON.stringify(data);
  return encrypt(jsonString);
};

/**
 * Decrypt QR code data
 */
export const decryptQRCode = (encryptedData: string): any => {
  try {
    const decryptedString = decrypt(encryptedData);
    return JSON.parse(decryptedString);
  } catch (error) {
    throw new Error('Data QR code tidak valid');
  }
};

/**
 * Alias for decryptQRCode for backward compatibility
 */
export const decryptQRData = decryptQRCode;

/**
 * Generate a secure random string
 */
export const generateSecureRandom = (length: number = 16): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomArray = new Uint8Array(length);
  crypto.getRandomValues(randomArray);
  randomArray.forEach((number) => {
    result += chars[number % chars.length];
  });
  return result;
};

/**
 * Compare two strings in constant time to prevent timing attacks
 */
export const constantTimeCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

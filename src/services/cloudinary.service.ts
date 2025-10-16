import { v2 as cloudinary } from 'cloudinary';
import config from '../config';
import logger from '../utils/logger';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true,
});

export interface UploadOptions {
  folder?: string;
  publicId?: string;
  transformation?: any;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
}

/**
 * Upload file buffer to Cloudinary
 */
export const uploadToCloudinary = async (
  fileBuffer: Buffer,
  options: UploadOptions = {}
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadOptions: any = {
      folder: options.folder || 'nesavent',
      public_id: options.publicId || options.publicId,
      resource_type: options.resourceType || 'auto',
      transformation: options.transformation,
    };

    const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        logger.error('Cloudinary upload error:', error);
        reject(new Error('Gagal mengupload file'));
      } else if (result) {
        resolve(result.secure_url);
      }
    });

    uploadStream.end(fileBuffer);
  });
};

/**
 * Upload image from data URL
 */
export const uploadDataURLToCloudinary = async (
  dataURL: string,
  options: UploadOptions = {}
): Promise<string> => {
  try {
    const uploadOptions = {
      folder: options.folder || 'nesavent',
      public_id: options.publicId,
      resource_type: options.resourceType || 'image',
    };

    const result = await cloudinary.uploader.upload(dataURL, uploadOptions);
    return result.secure_url;
  } catch (error) {
    logger.error('Cloudinary data URL upload error:', error);
    throw new Error('Gagal mengupload gambar');
  }
};

/**
 * Upload event poster
 */
export const uploadEventPoster = async (fileBuffer: Buffer, eventSlug: string): Promise<string> => {
  return uploadToCloudinary(fileBuffer, {
    folder: 'nesavent/events/posters',
    publicId: `poster-${eventSlug}-${Date.now()}`,
    transformation: [
      { width: 1200, height: 630, crop: 'fill', gravity: 'auto' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' },
    ],
  });
};

/**
 * Upload event gallery image
 */
export const uploadEventGallery = async (
  fileBuffer: Buffer,
  eventSlug: string
): Promise<string> => {
  return uploadToCloudinary(fileBuffer, {
    folder: 'nesavent/events/gallery',
    publicId: `gallery-${eventSlug}-${Date.now()}`,
    transformation: [
      { width: 1200, crop: 'limit' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' },
    ],
  });
};

/**
 * Upload user avatar
 */
export const uploadUserAvatar = async (fileBuffer: Buffer, userId: string): Promise<string> => {
  return uploadToCloudinary(fileBuffer, {
    folder: 'nesavent/users/avatars',
    publicId: `avatar-${userId}-${Date.now()}`,
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' },
    ],
  });
};

/**
 * Upload QR code image
 */
export const uploadQRCode = async (dataURL: string, ticketNumber: string): Promise<string> => {
  return uploadDataURLToCloudinary(dataURL, {
    folder: 'nesavent/tickets/qr-codes',
    publicId: `qr-${ticketNumber}`,
  });
};

/**
 * Upload ticket PDF
 */
export const uploadTicketPDF = async (pdfBuffer: Buffer, ticketNumber: string): Promise<string> => {
  return uploadToCloudinary(pdfBuffer, {
    folder: 'nesavent/tickets/pdfs',
    publicId: `ticket-${ticketNumber}`,
    resourceType: 'raw',
  });
};

/**
 * Delete file from Cloudinary
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info(`Deleted file from Cloudinary: ${publicId}`);
  } catch (error) {
    logger.error('Cloudinary delete error:', error);
    throw new Error('Gagal menghapus file');
  }
};

/**
 * Extract public ID from Cloudinary URL
 */
export const extractPublicId = (url: string): string => {
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  const publicId = filename.split('.')[0];
  return publicId;
};

export default cloudinary;

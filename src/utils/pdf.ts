import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import logger from './logger';

export interface TicketData {
  ticketNumber: string;
  eventTitle: string;
  eventDate: Date;
  eventTime: string;
  venueName: string;
  venueAddress?: string;
  participantName: string;
  ticketType: string;
  qrCodeDataURL: string;
  organizationName: string;
}

/**
 * Generate ticket PDF as buffer
 */
export const generateTicketPDF = async (ticketData: TicketData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .fillColor('#1d4ed8')
        .text('E-TICKET', { align: 'center' });

      doc.moveDown(0.5);

      // Nesavent branding
      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text('Nesavent - Campus Event Management', { align: 'center' });

      doc.moveDown(1.5);

      // Ticket number
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#374151')
        .text(`Nomor Tiket: ${ticketData.ticketNumber}`, { align: 'center' });

      doc.moveDown(1);

      // Horizontal line
      doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke('#e5e7eb');

      doc.moveDown(1);

      // Event title
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text(ticketData.eventTitle, { align: 'center' });

      doc.moveDown(1.5);

      // Event details
      const startY = doc.y;

      // Left column
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#6b7280').text('TANGGAL & WAKTU:', 50, startY);
      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#111827')
        .text(format(ticketData.eventDate, 'EEEE, dd MMMM yyyy', { locale: localeId }), 50, startY + 15);
      doc.text(ticketData.eventTime, 50);

      doc.moveDown(1.5);

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#6b7280').text('LOKASI:', 50);
      doc.fontSize(12).font('Helvetica').fillColor('#111827').text(ticketData.venueName, 50);
      if (ticketData.venueAddress) {
        doc.fontSize(10).fillColor('#6b7280').text(ticketData.venueAddress, 50, undefined, { width: 250 });
      }

      // Right column
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#6b7280').text('PESERTA:', 320, startY);
      doc.fontSize(12).font('Helvetica').fillColor('#111827').text(ticketData.participantName, 320, startY + 15);

      doc.moveDown(1);

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#6b7280').text('JENIS TIKET:', 320);
      doc.fontSize(12).font('Helvetica').fillColor('#111827').text(ticketData.ticketType, 320);

      doc.moveDown(1);

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#6b7280').text('PENYELENGGARA:', 320);
      doc.fontSize(12).font('Helvetica').fillColor('#111827').text(ticketData.organizationName, 320);

      doc.moveDown(3);

      // Horizontal line
      doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke('#e5e7eb');

      doc.moveDown(1.5);

      // QR Code section
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text('QR CODE CHECK-IN', { align: 'center' });

      doc.moveDown(0.5);

      // QR code image
      const qrCodeSize = 200;
      const qrCodeX = (595.28 - qrCodeSize) / 2; // Center in A4 width

      // Extract base64 from data URL
      const base64Data = ticketData.qrCodeDataURL.replace(/^data:image\/\w+;base64,/, '');
      const qrBuffer = Buffer.from(base64Data, 'base64');

      doc.image(qrBuffer, qrCodeX, doc.y, {
        width: qrCodeSize,
        height: qrCodeSize,
        align: 'center',
      });

      doc.moveDown(12);

      // Instructions
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text('Tunjukkan QR code ini saat check-in di lokasi acara', { align: 'center' });

      doc.moveDown(2);

      // Footer
      doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke('#e5e7eb');

      doc.moveDown(0.5);

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#9ca3af')
        .text('Tiket ini adalah bukti registrasi yang sah. Simpan tiket ini dengan baik.', { align: 'center' });
      doc.text('Untuk informasi lebih lanjut, hubungi panitia penyelenggara.', { align: 'center' });

      doc.moveDown(0.5);

      doc
        .fontSize(8)
        .fillColor('#3b82f6')
        .text('Powered by Nesavent', { align: 'center', link: 'https://nesavent.com' });

      doc.end();
    } catch (error) {
      logger.error('Error generating ticket PDF:', error);
      reject(new Error('Gagal membuat PDF tiket'));
    }
  });
};

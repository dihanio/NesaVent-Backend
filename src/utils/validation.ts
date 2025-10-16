import { z } from 'zod';

/**
 * Email validation schema
 */
export const emailSchema = z.string().email('Format email tidak valid');

/**
 * Password validation schema
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password minimal 8 karakter')
  .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
  .regex(/[a-z]/, 'Password harus mengandung huruf kecil')
  .regex(/[0-9]/, 'Password harus mengandung angka');

/**
 * Phone number validation schema (Indonesian format)
 */
export const phoneSchema = z
  .string()
  .regex(/^(\+62|62|0)[0-9]{9,13}$/, 'Format nomor telepon tidak valid');

/**
 * NIM (Student ID) validation schema
 */
export const nimSchema = z
  .string()
  .min(8, 'NIM minimal 8 karakter')
  .max(20, 'NIM maksimal 20 karakter');

/**
 * Registration schema
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z
    .string()
    .min(3, 'Nama lengkap minimal 3 karakter')
    .max(100, 'Nama lengkap maksimal 100 karakter'),
  phone: phoneSchema,
  nim: nimSchema.optional(),
  prodi: z.string().optional(),
  angkatan: z.string().optional(),
  role: z.enum(['student', 'organization', 'user']).default('student'),
  organizationName: z.string().min(3, 'Nama organisasi minimal 3 karakter').optional(),
  organizationDescription: z.string().max(1000, 'Deskripsi maksimal 1000 karakter').optional(),
});

/**
 * Login schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password wajib diisi'),
});

/**
 * Event creation schema
 */
export const createEventSchema = z.object({
  title: z
    .string()
    .min(10, 'Judul event minimal 10 karakter')
    .max(200, 'Judul event maksimal 200 karakter'),
  description: z
    .string()
    .min(50, 'Deskripsi event minimal 50 karakter')
    .max(5000, 'Deskripsi event maksimal 5000 karakter'),
  category: z.enum([
    'seminar',
    'workshop',
    'competition',
    'festival',
    'webinar',
    'sport',
    'art',
    'bazaar',
    'talkshow',
    'other',
  ]),
  poster: z.string().url('URL poster tidak valid'),
  venue: z.object({
    type: z.enum(['offline', 'online', 'hybrid']),
    name: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    onlineLink: z.string().url().optional(),
  }),
  schedule: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
    registrationOpen: z.string().datetime(),
    registrationClose: z.string().datetime(),
  }),
  ticketTypes: z
    .array(
      z.object({
        name: z.string().min(1, 'Nama tiket wajib diisi'),
        price: z.number().min(0, 'Harga tidak boleh negatif'),
        quota: z.number().min(1, 'Kuota minimal 1'),
        description: z.string().optional(),
        benefits: z.array(z.string()).default([]),
        salesStart: z.string().datetime(),
        salesEnd: z.string().datetime(),
      })
    )
    .min(1, 'Minimal 1 tipe tiket'),
  contactPerson: z.object({
    name: z.string().min(1, 'Nama contact person wajib diisi'),
    phone: phoneSchema,
    email: emailSchema,
    whatsapp: phoneSchema.optional(),
  }),
});

/**
 * Registration creation schema
 */
export const createRegistrationSchema = z.object({
  eventId: z.string().min(1, 'Event ID wajib diisi'),
  ticketTypeId: z.string().min(1, 'Ticket Type ID wajib diisi'),
  quantity: z.number().min(1).default(1),
  participant: z.object({
    fullName: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
    email: emailSchema,
    phone: phoneSchema,
    nim: z.string().optional(),
    prodi: z.string().optional(),
    angkatan: z.string().optional(),
    institution: z.string().optional(),
  }),
});

/**
 * Review creation schema
 */
export const createReviewSchema = z.object({
  registrationId: z.string().min(1, 'Registration ID wajib diisi'),
  rating: z.number().min(1, 'Rating minimal 1').max(5, 'Rating maksimal 5'),
  comment: z.string().max(1000, 'Komentar maksimal 1000 karakter').optional(),
});

/**
 * Update review schema
 */
export const updateReviewSchema = z.object({
  rating: z.number().min(1, 'Rating minimal 1').max(5, 'Rating maksimal 5').optional(),
  comment: z.string().max(1000, 'Komentar maksimal 1000 karakter').optional(),
});

/**
 * Update event schema
 */
export const updateEventSchema = createEventSchema.partial();

/**
 * Token verification schema
 */
export const tokenSchema = z.object({
  token: z.string().min(1, 'Token wajib diisi'),
});

/**
 * Reset password schema
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token wajib diisi'),
  newPassword: passwordSchema,
});

/**
 * Change password schema
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password lama wajib diisi'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Konfirmasi password tidak cocok',
  path: ['confirmPassword'],
});

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1))
    .default('1'),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100))
    .default('10'),
});

/**
 * Event filter schema
 */
export const eventFilterSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  city: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minPrice: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(z.number().min(0))
    .optional(),
  maxPrice: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(z.number().min(0))
    .optional(),
  venueType: z.enum(['offline', 'online', 'hybrid']).optional(),
  sortBy: z.enum(['date', 'price', 'popular', 'newest']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * Validate data against a schema
 */
export const validate = <T>(schema: z.ZodSchema<T>, data: any): T => {
  return schema.parse(data);
};

/**
 * Safe validate with error handling
 */
export const safeValidate = <T>(
  schema: z.ZodSchema<T>,
  data: any
): { success: true; data: T } | { success: false; errors: z.ZodError } => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
};

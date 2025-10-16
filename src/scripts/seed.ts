import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';
import Category from '../models/Category';
import Event from '../models/Event';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nesavent';

// Categories Data
const categories = [
  {
    name: 'Seminar',
    nameEn: 'Seminar',
    slug: 'seminar',
    icon: 'message-circle',
    color: '#3b82f6',
    gradient: 'from-blue-500 to-cyan-500',
    description: 'Seminar dan workshop edukatif',
    displayOrder: 1,
    isActive: true,
    eventCount: 0,
  },
  {
    name: 'Workshop',
    nameEn: 'Workshop',
    slug: 'workshop',
    icon: 'microscope',
    color: '#8b5cf6',
    gradient: 'from-purple-500 to-pink-500',
    description: 'Pelatihan praktis dan hands-on',
    displayOrder: 2,
    isActive: true,
    eventCount: 0,
  },
  {
    name: 'Kompetisi',
    nameEn: 'Competition',
    slug: 'competition',
    icon: 'trophy',
    color: '#f59e0b',
    gradient: 'from-orange-500 to-red-500',
    description: 'Lomba dan kompetisi mahasiswa',
    displayOrder: 3,
    isActive: true,
    eventCount: 0,
  },
  {
    name: 'Festival',
    nameEn: 'Festival',
    slug: 'festival',
    icon: 'music',
    color: '#ec4899',
    gradient: 'from-pink-500 to-rose-500',
    description: 'Festival seni dan budaya',
    displayOrder: 4,
    isActive: true,
    eventCount: 0,
  },
  {
    name: 'Webinar',
    nameEn: 'Webinar',
    slug: 'webinar',
    icon: 'video',
    color: '#06b6d4',
    gradient: 'from-cyan-500 to-blue-500',
    description: 'Seminar online',
    displayOrder: 5,
    isActive: true,
    eventCount: 0,
  },
  {
    name: 'Olahraga',
    nameEn: 'Sport',
    slug: 'sport',
    icon: 'dumbbell',
    color: '#10b981',
    gradient: 'from-green-500 to-emerald-500',
    description: 'Kegiatan olahraga dan turnamen',
    displayOrder: 6,
    isActive: true,
    eventCount: 0,
  },
  {
    name: 'Seni',
    nameEn: 'Art',
    slug: 'art',
    icon: 'palette',
    color: '#f97316',
    gradient: 'from-orange-500 to-yellow-500',
    description: 'Pameran dan pertunjukan seni',
    displayOrder: 7,
    isActive: true,
    eventCount: 0,
  },
  {
    name: 'Bazaar',
    nameEn: 'Bazaar',
    slug: 'bazaar',
    icon: 'shopping-bag',
    color: '#84cc16',
    gradient: 'from-lime-500 to-green-500',
    description: 'Bazar dan pameran produk',
    displayOrder: 8,
    isActive: true,
    eventCount: 0,
  },
];

// Users Data
const users = [
  {
    email: 'admin@nesavent.ac.id',
    password: 'admin123',
    profile: {
      fullName: 'Admin Nesavent',
      phone: '081234567890',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    },
    role: 'admin',
    accountType: 'campus',
    emailVerified: true,
    preferences: {
      language: 'id',
      notifications: {
        email: true,
        whatsapp: true,
        push: true,
      },
    },
  },
  {
    email: 'bem@university.ac.id',
    password: 'bem12345',
    profile: {
      fullName: 'BEM Universitas',
      phone: '081234567891',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bem',
    },
    role: 'organization',
    accountType: 'campus',
    organization: {
      name: 'BEM Universitas',
      position: 'Ketua',
      verificationStatus: 'verified',
      description: 'Badan Eksekutif Mahasiswa Universitas',
      logo: 'https://api.dicebear.com/7.x/shapes/svg?seed=bem',
    },
    emailVerified: true,
    preferences: {
      language: 'id',
      notifications: {
        email: true,
        whatsapp: true,
        push: true,
      },
    },
  },
  {
    email: 'hmif@university.ac.id',
    password: 'hmif12345',
    profile: {
      fullName: 'HMIF Universitas',
      phone: '081234567892',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hmif',
    },
    role: 'organization',
    accountType: 'campus',
    organization: {
      name: 'Himpunan Mahasiswa Informatika',
      position: 'Ketua',
      verificationStatus: 'verified',
      description: 'Himpunan Mahasiswa Informatika',
      logo: 'https://api.dicebear.com/7.x/shapes/svg?seed=hmif',
    },
    emailVerified: true,
    preferences: {
      language: 'id',
      notifications: {
        email: true,
        whatsapp: true,
        push: true,
      },
    },
  },
  {
    email: 'ukm.seni@university.ac.id',
    password: 'ukm12345',
    profile: {
      fullName: 'UKM Seni Kampus',
      phone: '081234567893',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ukm',
    },
    role: 'organization',
    accountType: 'campus',
    organization: {
      name: 'UKM Seni & Budaya',
      position: 'Ketua',
      verificationStatus: 'verified',
      description: 'Unit Kegiatan Mahasiswa Seni dan Budaya',
      logo: 'https://api.dicebear.com/7.x/shapes/svg?seed=ukm',
    },
    emailVerified: true,
    preferences: {
      language: 'id',
      notifications: {
        email: true,
        whatsapp: true,
        push: true,
      },
    },
  },
];

// Events Data (will be created after users)
const createEvents = (organizerIds: any[]) => [
  {
    organizerId: organizerIds[0], // BEM
    organizationName: 'BEM Universitas',
    title: 'Tech Summit 2025: AI & Machine Learning Revolution',
    description: 'Konferensi teknologi terbesar tahun ini yang membahas perkembangan AI dan Machine Learning. Dengan pembicara dari Google, Microsoft, dan startup teknologi terkemuka. Dapatkan insight mendalam tentang masa depan teknologi dan cara mempersiapkan karir di era digital.',
    category: 'seminar',
    poster: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=80',
      'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&q=80',
    ],
    venue: {
      type: 'offline',
      name: 'Auditorium Utama',
      building: 'Gedung A',
      room: 'Lantai 3',
      address: 'Jl. Universitas No. 123',
      city: 'Jakarta',
      mapLink: 'https://maps.google.com',
    },
    schedule: {
      start: new Date('2025-02-15T09:00:00'),
      end: new Date('2025-02-15T17:00:00'),
      registrationOpen: new Date('2025-01-01T00:00:00'),
      registrationClose: new Date('2025-02-10T23:59:59'),
      timezone: 'Asia/Jakarta',
    },
    ticketTypes: [
      {
        name: 'Mahasiswa Umum',
        price: 50000,
        quota: 200,
        sold: 85,
        reserved: 10,
        available: 105,
        description: 'Tiket untuk mahasiswa dari universitas manapun',
        benefits: ['Sertifikat', 'Modul Materi', 'Lunch', 'Coffee Break', 'Goodie Bag'],
        salesStart: new Date('2025-01-01T00:00:00'),
        salesEnd: new Date('2025-02-10T23:59:59'),
        isActive: true,
      },
      {
        name: 'Mahasiswa Internal',
        price: 25000,
        quota: 100,
        sold: 67,
        reserved: 5,
        available: 28,
        description: 'Tiket untuk mahasiswa kampus',
        benefits: ['Sertifikat', 'Modul Materi', 'Lunch', 'Coffee Break', 'Goodie Bag', 'Akses VIP'],
        salesStart: new Date('2025-01-01T00:00:00'),
        salesEnd: new Date('2025-02-10T23:59:59'),
        isActive: true,
      },
    ],
    status: 'published',
    approval: {
      status: 'approved',
      approvedAt: new Date(),
    },
    requirements: ['Mahasiswa aktif', 'Membawa KTM', 'Laptop pribadi'],
    terms: 'Peserta wajib hadir tepat waktu. Tiket yang sudah dibeli tidak dapat dikembalikan.',
    faq: [
      {
        question: 'Apakah ada dress code?',
        answer: 'Berpakaian rapi dan sopan',
      },
      {
        question: 'Apakah menyediakan konsumsi?',
        answer: 'Ya, tersedia lunch dan coffee break',
      },
    ],
    contactPerson: {
      name: 'John Doe',
      phone: '081234567890',
      email: 'contact@bem.ac.id',
      instagram: '@bem_university',
      whatsapp: '081234567890',
    },
    stats: {
      totalQuota: 300,
      totalSold: 152,
      totalRevenue: 6225000,
      viewCount: 1250,
      shareCount: 85,
      favoriteCount: 120,
    },
    tags: ['technology', 'AI', 'machine-learning', 'career', 'seminar'],
    featured: true,
    featuredUntil: new Date('2025-02-15T23:59:59'),
    visibility: 'public',
  },
  {
    organizerId: organizerIds[1], // HMIF
    organizationName: 'Himpunan Mahasiswa Informatika',
    title: 'Web Development Bootcamp: From Zero to Hero',
    description: 'Workshop intensif 3 hari untuk belajar web development dari dasar hingga mahir. Mulai dari HTML, CSS, JavaScript, hingga framework modern seperti React dan Next.js. Dibimbing langsung oleh praktisi industri dengan pengalaman 10+ tahun.',
    category: 'workshop',
    poster: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80',
      'https://images.unsplash.com/photo-1593720213428-28a5b9e94613?w=800&q=80',
    ],
    venue: {
      type: 'hybrid',
      name: 'Lab Komputer 1 & Online via Zoom',
      building: 'Gedung Informatika',
      room: 'Lantai 2',
      address: 'Jl. Informatika No. 45',
      city: 'Jakarta',
      onlineLink: 'https://zoom.us/j/123456789',
      mapLink: 'https://maps.google.com',
    },
    schedule: {
      start: new Date('2025-02-20T09:00:00'),
      end: new Date('2025-02-22T17:00:00'),
      registrationOpen: new Date('2025-01-05T00:00:00'),
      registrationClose: new Date('2025-02-15T23:59:59'),
      timezone: 'Asia/Jakarta',
    },
    ticketTypes: [
      {
        name: 'Offline',
        price: 150000,
        quota: 40,
        sold: 32,
        reserved: 3,
        available: 5,
        description: 'Menghadiri secara langsung di kampus',
        benefits: ['Sertifikat Digital', 'Materi PDF', 'Source Code', 'Lunch 3 Hari', 'Mentoring 1-on-1'],
        salesStart: new Date('2025-01-05T00:00:00'),
        salesEnd: new Date('2025-02-15T23:59:59'),
        isActive: true,
      },
      {
        name: 'Online',
        price: 75000,
        quota: 100,
        sold: 45,
        reserved: 8,
        available: 47,
        description: 'Mengikuti via Zoom',
        benefits: ['Sertifikat Digital', 'Materi PDF', 'Source Code', 'Recording'],
        salesStart: new Date('2025-01-05T00:00:00'),
        salesEnd: new Date('2025-02-15T23:59:59'),
        isActive: true,
      },
    ],
    status: 'published',
    approval: {
      status: 'approved',
      approvedAt: new Date(),
    },
    requirements: ['Basic programming knowledge', 'Laptop dengan RAM min 8GB', 'Text editor (VS Code recommended)'],
    terms: 'Peserta yang terlambat lebih dari 30 menit tidak dapat mengikuti sesi. Tiket tidak dapat refund.',
    faq: [
      {
        question: 'Apakah cocok untuk pemula?',
        answer: 'Ya, workshop ini dirancang untuk pemula yang ingin belajar web development dari nol',
      },
      {
        question: 'Software apa yang perlu disiapkan?',
        answer: 'VS Code, Node.js, dan browser modern (Chrome/Firefox)',
      },
    ],
    contactPerson: {
      name: 'Jane Smith',
      phone: '081234567891',
      email: 'workshop@hmif.ac.id',
      instagram: '@hmif_university',
      whatsapp: '081234567891',
    },
    stats: {
      totalQuota: 140,
      totalSold: 77,
      totalRevenue: 8175000,
      viewCount: 890,
      shareCount: 62,
      favoriteCount: 95,
    },
    tags: ['webdev', 'programming', 'workshop', 'react', 'javascript'],
    featured: true,
    featuredUntil: new Date('2025-02-20T23:59:59'),
    visibility: 'public',
  },
  {
    organizerId: organizerIds[0], // BEM
    organizationName: 'BEM Universitas',
    title: 'National Business Plan Competition 2025',
    description: 'Kompetisi business plan tingkat nasional dengan total hadiah 50 juta rupiah. Kesempatan emas untuk mengembangkan ide bisnis dan mendapatkan mentoring dari investor dan entrepreneur sukses. Juara akan mendapat seed funding untuk mewujudkan bisnis mereka.',
    category: 'competition',
    poster: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80',
      'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=800&q=80',
    ],
    venue: {
      type: 'offline',
      name: 'Convention Hall',
      building: 'Gedung Convention Center',
      room: 'Hall A',
      address: 'Jl. Bisnis No. 789',
      city: 'Jakarta',
      mapLink: 'https://maps.google.com',
    },
    schedule: {
      start: new Date('2025-03-10T08:00:00'),
      end: new Date('2025-03-10T18:00:00'),
      registrationOpen: new Date('2025-01-10T00:00:00'),
      registrationClose: new Date('2025-03-01T23:59:59'),
      timezone: 'Asia/Jakarta',
    },
    ticketTypes: [
      {
        name: 'Tim (3-5 Orang)',
        price: 200000,
        quota: 50,
        sold: 38,
        reserved: 5,
        available: 7,
        description: 'Pendaftaran per tim (3-5 anggota)',
        benefits: ['Sertifikat untuk semua anggota', 'Pitching Clinic', 'Networking Session', 'Lunch', 'Goodie Bag'],
        salesStart: new Date('2025-01-10T00:00:00'),
        salesEnd: new Date('2025-03-01T23:59:59'),
        isActive: true,
      },
    ],
    status: 'published',
    approval: {
      status: 'approved',
      approvedAt: new Date(),
    },
    requirements: ['Tim terdiri dari 3-5 orang', 'Mahasiswa aktif S1/D3', 'Proposal bisnis original'],
    terms: 'Keputusan juri tidak dapat diganggu gugat. Proposal yang terbukti plagiat akan didiskualifikasi.',
    faq: [
      {
        question: 'Berapa total hadiah?',
        answer: 'Total hadiah 50 juta (Juara 1: 25jt, Juara 2: 15jt, Juara 3: 10jt)',
      },
      {
        question: 'Apakah boleh dari universitas berbeda?',
        answer: 'Ya, tim boleh berasal dari universitas yang berbeda',
      },
    ],
    contactPerson: {
      name: 'Michael Chen',
      phone: '081234567892',
      email: 'competition@bem.ac.id',
      instagram: '@bem_competition',
      whatsapp: '081234567892',
    },
    stats: {
      totalQuota: 50,
      totalSold: 38,
      totalRevenue: 7600000,
      viewCount: 2100,
      shareCount: 156,
      favoriteCount: 240,
    },
    tags: ['competition', 'business', 'entrepreneurship', 'startup'],
    featured: true,
    featuredUntil: new Date('2025-03-10T23:59:59'),
    visibility: 'public',
  },
  {
    organizerId: organizerIds[2], // UKM Seni
    organizationName: 'UKM Seni & Budaya',
    title: 'Festival Seni Kampus 2025: Harmony in Diversity',
    description: 'Festival seni dan budaya terbesar di kampus yang menampilkan berbagai pertunjukan musik, tari, teater, dan pameran seni rupa. Menampilkan penampil dari berbagai komunitas seni kampus dan artis tamu special. 3 hari penuh dengan hiburan dan apresiasi seni.',
    category: 'festival',
    poster: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
      'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80',
    ],
    venue: {
      type: 'offline',
      name: 'Lapangan Kampus',
      building: 'Area Outdoor',
      address: 'Kampus Utama',
      city: 'Jakarta',
      mapLink: 'https://maps.google.com',
    },
    schedule: {
      start: new Date('2025-03-15T14:00:00'),
      end: new Date('2025-03-17T22:00:00'),
      registrationOpen: new Date('2025-02-01T00:00:00'),
      registrationClose: new Date('2025-03-14T23:59:59'),
      timezone: 'Asia/Jakarta',
    },
    ticketTypes: [
      {
        name: 'Gratis',
        price: 0,
        quota: 500,
        sold: 312,
        reserved: 15,
        available: 173,
        description: 'Tiket gratis untuk semua',
        benefits: ['Akses semua pertunjukan', 'Brosur festival', 'Sticker eksklusif'],
        salesStart: new Date('2025-02-01T00:00:00'),
        salesEnd: new Date('2025-03-14T23:59:59'),
        isActive: true,
      },
    ],
    status: 'published',
    approval: {
      status: 'approved',
      approvedAt: new Date(),
    },
    requirements: ['Tidak ada syarat khusus', 'Terbuka untuk umum'],
    terms: 'Harap menjaga ketertiban selama acara. Dilarang membawa makanan dan minuman dari luar.',
    faq: [
      {
        question: 'Apakah gratis untuk semua?',
        answer: 'Ya, acara ini sepenuhnya gratis dan terbuka untuk umum',
      },
      {
        question: 'Jam berapa acara dimulai?',
        answer: 'Acara dimulai pukul 14:00 WIB setiap harinya',
      },
    ],
    contactPerson: {
      name: 'Sarah Johnson',
      phone: '081234567893',
      email: 'festival@ukmseni.ac.id',
      instagram: '@ukmseni_fest',
      whatsapp: '081234567893',
    },
    stats: {
      totalQuota: 500,
      totalSold: 312,
      totalRevenue: 0,
      viewCount: 1850,
      shareCount: 278,
      favoriteCount: 445,
    },
    tags: ['festival', 'music', 'art', 'culture', 'free'],
    featured: true,
    featuredUntil: new Date('2025-03-17T23:59:59'),
    visibility: 'public',
  },
  {
    organizerId: organizerIds[1], // HMIF
    organizationName: 'Himpunan Mahasiswa Informatika',
    title: 'Cybersecurity & Ethical Hacking Webinar',
    description: 'Webinar tentang keamanan siber dan ethical hacking. Pelajari cara melindungi sistem dari serangan cyber, teknik penetration testing, dan karir di bidang cybersecurity. Dengan narasumber certified ethical hacker dari perusahaan security terkemuka.',
    category: 'webinar',
    poster: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80',
    ],
    venue: {
      type: 'online',
      name: 'Zoom Meeting',
      onlineLink: 'https://zoom.us/j/987654321',
    },
    schedule: {
      start: new Date('2025-02-25T19:00:00'),
      end: new Date('2025-02-25T21:00:00'),
      registrationOpen: new Date('2025-02-01T00:00:00'),
      registrationClose: new Date('2025-02-25T17:00:00'),
      timezone: 'Asia/Jakarta',
    },
    ticketTypes: [
      {
        name: 'Gratis',
        price: 0,
        quota: 1000,
        sold: 567,
        reserved: 45,
        available: 388,
        description: 'Akses webinar gratis',
        benefits: ['E-Certificate', 'Materi PDF', 'Recording 7 hari'],
        salesStart: new Date('2025-02-01T00:00:00'),
        salesEnd: new Date('2025-02-25T17:00:00'),
        isActive: true,
      },
    ],
    status: 'published',
    approval: {
      status: 'approved',
      approvedAt: new Date(),
    },
    requirements: ['Koneksi internet stabil', 'Aplikasi Zoom'],
    terms: 'Link Zoom akan dikirim H-1 via email. Recording hanya tersedia 7 hari setelah acara.',
    faq: [
      {
        question: 'Apakah akan ada sesi tanya jawab?',
        answer: 'Ya, ada sesi Q&A di akhir webinar',
      },
      {
        question: 'Apakah mendapat sertifikat?',
        answer: 'Ya, e-certificate akan dikirim setelah webinar selesai',
      },
    ],
    contactPerson: {
      name: 'David Kumar',
      phone: '081234567894',
      email: 'webinar@hmif.ac.id',
      instagram: '@hmif_webinar',
      whatsapp: '081234567894',
    },
    stats: {
      totalQuota: 1000,
      totalSold: 567,
      totalRevenue: 0,
      viewCount: 3200,
      shareCount: 445,
      favoriteCount: 890,
    },
    tags: ['webinar', 'cybersecurity', 'hacking', 'technology', 'free'],
    featured: false,
    visibility: 'public',
  },
];

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
}

// Clear existing data
async function clearData() {
  try {
    await Category.deleteMany({});
    await User.deleteMany({});
    await Event.deleteMany({});
    console.log('🗑️  Cleared existing data');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  }
}

// Seed categories
async function seedCategories() {
  try {
    await Category.insertMany(categories);
    console.log(`✅ Seeded ${categories.length} categories`);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    throw error;
  }
}

// Seed users
async function seedUsers() {
  try {
    const createdUsers = [];
    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
    }
    console.log(`✅ Seeded ${users.length} users`);
    return createdUsers;
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
}

// Seed events
async function seedEvents(organizerIds: any[]) {
  try {
    const eventsData = createEvents(organizerIds);
    const createdEvents = [];
    
    for (const eventData of eventsData) {
      const event = new Event(eventData);
      await event.save();
      createdEvents.push(event);
      
      // Update category event count
      await Category.findOneAndUpdate(
        { slug: eventData.category },
        { $inc: { eventCount: 1 } }
      );
    }
    
    console.log(`✅ Seeded ${eventsData.length} events`);
    return createdEvents;
  } catch (error) {
    console.error('❌ Error seeding events:', error);
    throw error;
  }
}

// Main seed function
async function seed() {
  try {
    console.log('🌱 Starting database seed...\n');
    
    await connectDB();
    await clearData();
    
    console.log('\n📦 Seeding data...');
    await seedCategories();
    
    const createdUsers = await seedUsers();
    const organizerIds = createdUsers
      .filter(u => u.role === 'organization')
      .map(u => u._id);
    
    await seedEvents(organizerIds);
    
    console.log('\n✅ Database seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Events: 5`);
    console.log('\n📝 Default Credentials:');
    console.log('   Admin:');
    console.log('   Email: admin@nesavent.ac.id');
    console.log('   Password: admin123');
    console.log('\n   Organizations:');
    console.log('   Email: bem@university.ac.id | Password: bem12345');
    console.log('   Email: hmif@university.ac.id | Password: hmif12345');
    console.log('   Email: ukm.seni@university.ac.id | Password: ukm12345');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  }
}

// Run seed
seed();

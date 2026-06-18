/** eTower static content — entrepreneurship community */

export const ETOWER = {
  name: "eTower",
  tagline: "Where Boston's Next Generation of Entrepreneurs Live, Learn, and Launch",
  subtagline:
    "Join 21 ambitious residents building the future at Boston's premier entrepreneurial living community",
  email: "etowerbabson@gmail.com",
  instagram: "@etowerbabson",
  instagramUrl: "https://instagram.com/etowerbabson",
  address: "Van Winkle Hall C2, Babson College, Wellesley, MA 02457",
} as const;

export const HERO_STATS = [
  { value: "21", label: "Active Residents" },
  { value: "250+", label: "Alumni Network" },
  { value: "$3B+", label: "Alumni Valuations" },
] as const;

export const IMPACT_METRICS = [
  {
    value: "250+",
    label: "Alumni Network",
    description: "Successful entrepreneurs and leaders",
  },
  {
    value: "$3B+",
    label: "Alumni Valuations",
    description: "Combined value of alumni companies",
  },
  {
    value: "100+",
    label: "Startups Founded",
    description: "Companies launched by our community",
  },
  {
    value: "$50M+",
    label: "Funding Raised",
    description: "Capital raised by alumni ventures",
  },
] as const;

export type FeaturedStartup = {
  id: string;
  name: string;
  category: string;
  overview: string;
  founder: string;
  initial: string;
};

export const FEATURED_STARTUPS: FeaturedStartup[] = [
  {
    id: "elcove",
    name: "Elcove",
    category: "Sustainability",
    overview:
      "Sustainable and eco-friendly cleaning products made with plant-based ingredients and refillable containers to reduce waste.",
    founder: "Anastacia Yefimenko",
    initial: "E",
  },
  {
    id: "c4p",
    name: "Computers4People",
    category: "Social Impact",
    overview:
      "Bridging the digital divide by providing refurbished computers and technology education to underserved communities.",
    founder: "Dylan Zajac",
    initial: "C",
  },
  {
    id: "junk-teens",
    name: "Junk Teens",
    category: "Service",
    overview:
      "Youth-focused junk removal service that provides employment opportunities for teenagers while helping communities with waste management.",
    founder: "Kirk McKinney",
    initial: "J",
  },
];

export type Testimonial = {
  name: string;
  role: string;
  company: string;
  quote: string;
  initials: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Ryan Laverty",
    role: "President 2018",
    company: "Founder of Arist",
    quote:
      "eTower completely changed my life and is a core reason I'm where I am today. From meeting my cofounders, to all of my best friends, to countless mentors and supporters, I genuinely don't want to know where I'd be without it.",
    initials: "RL",
  },
  {
    name: "Jake Ross",
    role: "President 2022",
    company: "Founder of Build You Marketing",
    quote:
      "I wouldn't be an entrepreneur without eTower. The community pushes me every single day to become a better version of myself and an improved business person. It was an honor to lead this community.",
    initials: "JR",
  },
  {
    name: "Kirk McKinney",
    role: "Current Resident",
    company: "Founder of Junk Teens",
    quote:
      "eTower is a community for entrepreneurs to learn and grow together on their entrepreneurial endeavors. Business is the ideas, the systems, and the people — and I learned that from being here.",
    initials: "KM",
  },
  {
    name: "Anastacia Yefimenko",
    role: "Current Resident",
    company: "Founder of Elcove",
    quote:
      "eTower is my family away from home. The entrepreneurship journey can be lonely and the support from eTower is amazing.",
    initials: "AY",
  },
];

export type StoryMilestone = {
  num: string;
  title: string;
  body: string;
};

export const STORY_MILESTONES: StoryMilestone[] = [
  {
    num: "01",
    title: "The Founding",
    body: 'Founded in 2001 by Andrew Foley — "What if we created a live-in incubator of the best entrepreneurial minds on campus?" The first Babson living-learning community was born on Van Winkle Hall.',
  },
  {
    num: "02",
    title: "The Establishment",
    body: "IdeaPaint emerged from early residents. A 2004 retreat formalized the mission: a community of students committed to becoming successful entrepreneurs.",
  },
  {
    num: "05",
    title: "The Growth Era",
    body: "Outward expansion with the Young Entrepreneurs Conference (YEC) and ePitch — Babson's biggest student-run pitch event to date.",
  },
  {
    num: "07",
    title: "Post-Covid",
    body: "Celebrating 20+ years with an Alumni Gala and renewed in-person community — an example of what's possible when like-minded students grow together.",
  },
];

export type JoinPillar = {
  title: string;
  description: string;
};

export const JOIN_PILLARS: JoinPillar[] = [
  {
    title: "Collaborative Community",
    description: "Live and work alongside passionate entrepreneurs",
  },
  {
    title: "Innovation Hub",
    description: "Access to resources, mentorship, and funding opportunities",
  },
  {
    title: "Powerful Network",
    description: "Connect with successful alumni and industry leaders",
  },
  {
    title: "Growth Focused",
    description: "Structured programs to accelerate your startup journey",
  },
];

export const ETOWER_OUTLETS = {
  sectionTitle: "eTower Outlets",
  clothing: {
    status: "COMING SOON",
    title: "ETOWER CLOTHING COLLECTION",
  },
  megaphone: {
    title: "MEGAPHONE",
    description:
      "The networking hub of Babson where startups connect with VCs, potential talent, and the people who matter. Where deals get made and teams get built.",
    cta: "JOIN MEGAPHONE",
    href: `mailto:${ETOWER.email}?subject=Join%20Megaphone`,
  },
  cafe: {
    title: "etower café",
    description:
      "A weekly Friday space for founders to work, connect, and caffeinate. Reserve a spot at the main table, a sofa chair, the couch, or the window standing desk. 9AM–2PM at Van Winkle C2.",
    cta: "RSVP AT CAFÉ",
    href: `mailto:${ETOWER.email}?subject=Caf%C3%A9%20RSVP`,
  },
} as const;

export type SocialPost = {
  caption: string;
  likes: number;
  comments: number;
};

export const SOCIAL_POSTS: SocialPost[] = [
  {
    caption: "Late night brainstorming sessions in eTower! #entrepreneurlife #innovation",
    likes: 127,
    comments: 23,
  },
  {
    caption: "Amazing speaker event with industry leaders sharing their insights #networking #startup",
    likes: 89,
    comments: 15,
  },
  {
    caption: "Celebrating another successful startup launch from our community! #success #community",
    likes: 156,
    comments: 31,
  },
  {
    caption: "Building the future together, one idea at a time #teamwork #etower",
    likes: 94,
    comments: 18,
  },
];

/** Column exit directions */
export const INTRO_COLUMN_DIRECTIONS = [
  "up",
  "down",
  "up",
  "down",
  "up",
  "down",
  "up",
  "down",
] as const;

export type IntroColumnDirection = (typeof INTRO_COLUMN_DIRECTIONS)[number];

export type HeroGalleryBusiness = {
  id: string;
  name: string;
  /** Company logo (Clearbit or direct URL) */
  logo: string;
  /** Product / brand photo matching the company */
  image: string;
  /** Shown if logo image fails to load */
  fallbackInitials: string;
};

/** Real eTower community ventures — logo + industry-matched imagery */
export const HERO_GALLERY_BUSINESSES: HeroGalleryBusiness[] = [
  {
    id: "elcove",
    name: "Elcove",
    logo: "https://logo.clearbit.com/elcove.co",
    image: "https://images.unsplash.com/photo-1610557892470-55d9d6d85525?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "EL",
  },
  {
    id: "c4p",
    name: "Computers4People",
    logo: "https://logo.clearbit.com/computers4people.org",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa90?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "C4",
  },
  {
    id: "junk-teens",
    name: "Junk Teens",
    logo: "https://logo.clearbit.com/junkteens.com",
    image: "https://images.unsplash.com/photo-1621451537084-624c072d4aee?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "JT",
  },
  {
    id: "arist",
    name: "Arist",
    logo: "https://logo.clearbit.com/arist.ai",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "AR",
  },
  {
    id: "ideapaint",
    name: "IdeaPaint",
    logo: "https://logo.clearbit.com/ideapaint.com",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "IP",
  },
  {
    id: "sunu-body",
    name: "Sunu Body",
    logo: "https://logo.clearbit.com/sunubody.com",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "SB",
  },
  {
    id: "cravery",
    name: "The CRAVERY",
    logo: "https://logo.clearbit.com/thecravery.com",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "TC",
  },
  {
    id: "donutnv",
    name: "DonutNV",
    logo: "https://logo.clearbit.com/donutnv.com",
    image: "https://images.unsplash.com/photo-1551024602-8e7632810941?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "DN",
  },
  {
    id: "givingart",
    name: "GivingArt",
    logo: "https://logo.clearbit.com/givingart.org",
    image: "https://images.unsplash.com/photo-1460666189562-9591f9a340b0?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "GA",
  },
  {
    id: "chessmate",
    name: "Chessmate Academy",
    logo: "https://logo.clearbit.com/chessmateacademy.com",
    image: "https://images.unsplash.com/photo-1529699211952-484e3085560c?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "CA",
  },
  {
    id: "build-you",
    name: "Build You Marketing",
    logo: "https://logo.clearbit.com/buildyou.io",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "BY",
  },
  {
    id: "scavanger",
    name: "Scavanger.Ai",
    logo: "https://logo.clearbit.com/scavanger.ai",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "SA",
  },
  {
    id: "poseidon",
    name: "Poseidon Skin",
    logo: "https://logo.clearbit.com/poseidonskin.com",
    image: "https://images.unsplash.com/photo-1570172619644-dfd155d6990a?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "PS",
  },
  {
    id: "finexus",
    name: "Finexus",
    logo: "https://logo.clearbit.com/finexus.com",
    image: "https://images.unsplash.com/photo-1554224311-beee415bd251?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "FX",
  },
  {
    id: "truvit",
    name: "TRUVIT",
    logo: "https://logo.clearbit.com/truvit.com",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "TV",
  },
  {
    id: "dirty-gut",
    name: "DIRTY GUT",
    logo: "https://logo.clearbit.com/dirtygut.com",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17361?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "DG",
  },
  {
    id: "athlete-zero",
    name: "AthleteZero",
    logo: "https://logo.clearbit.com/athletezero.com",
    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "AZ",
  },
  {
    id: "sneakersoul",
    name: "SneakerSoul",
    logo: "https://logo.clearbit.com/sneakersoul.com",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "SS",
  },
  {
    id: "humanitees",
    name: "HUMAN-I-TEES",
    logo: "https://logo.clearbit.com/humanitees.com",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "HI",
  },
  {
    id: "endspeciesism",
    name: "endspeciesism.org",
    logo: "https://logo.clearbit.com/endspeciesism.org",
    image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "ES",
  },
  {
    id: "big-bear",
    name: "BIG BEAR MOVERS",
    logo: "https://logo.clearbit.com/bigbearmovers.com",
    image: "https://images.unsplash.com/photo-1601584119907-f686a086079e?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "BB",
  },
  {
    id: "nicio",
    name: "NICIO MEDIA",
    logo: "https://logo.clearbit.com/niciomedia.com",
    image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "NM",
  },
  {
    id: "foregger",
    name: "Foregger Energy",
    logo: "https://logo.clearbit.com/foreggerenergy.com",
    image: "https://images.unsplash.com/photo-1473341304170-fd89b6120921?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "FE",
  },
  {
    id: "takkra",
    name: "Takkra",
    logo: "https://logo.clearbit.com/takkra.com",
    image: "https://images.unsplash.com/photo-1454165804603-c034643a41a6?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "TK",
  },
  {
    id: "mevot",
    name: "MEVOT",
    logo: "https://logo.clearbit.com/mevot.com",
    image: "https://images.unsplash.com/photo-1563986768608-018db6845853?w=640&h=360&fit=crop&q=80",
    fallbackInitials: "MV",
  },
];

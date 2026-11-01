/**
 * Centralised India-Wide Location Dataset for BorrowBox Initial Launch.
 * Hierarchy: Country (India) -> State / Union Territory -> City -> Locality.
 *
 * Focuses on major metropolitan cities, popular urban centres, and well-known Indian cities
 * across all 28 states and 8 union territories, with canonical city identifiers,
 * alternative/historical spelling support, and curated localities.
 */

export interface StateLocation {
  name: string;
  type: 'state' | 'ut';
  code: string;
  region: 'North' | 'West' | 'South' | 'East' | 'Central' | 'Northeast';
  cities: string[];
}

export interface CityDetails {
  name: string;
  state: string;
  isMetropolitan?: boolean;
  localities: string[];
}

export const INDIA_STATES_AND_UTS: StateLocation[] = [
  // ===========================================================================
  // 28 STATES
  // ===========================================================================
  {
    name: 'Andhra Pradesh',
    type: 'state',
    code: 'AP',
    region: 'South',
    cities: [
      'Visakhapatnam',
      'Vijayawada',
      'Tirupati',
      'Guntur',
      'Nellore',
      'Kurnool',
      'Rajahmundry',
      'Kakinada',
    ],
  },
  {
    name: 'Arunachal Pradesh',
    type: 'state',
    code: 'AR',
    region: 'Northeast',
    cities: ['Itanagar', 'Naharlagun', 'Tawang'],
  },
  {
    name: 'Assam',
    type: 'state',
    code: 'AS',
    region: 'East',
    cities: ['Guwahati', 'Dibrugarh', 'Silchar', 'Jorhat', 'Tezpur'],
  },
  {
    name: 'Bihar',
    type: 'state',
    code: 'BR',
    region: 'East',
    cities: ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga'],
  },
  {
    name: 'Chhattisgarh',
    type: 'state',
    code: 'CG',
    region: 'Central',
    cities: ['Raipur', 'Bilaspur', 'Bhilai', 'Durg', 'Korba'],
  },
  {
    name: 'Goa',
    type: 'state',
    code: 'GA',
    region: 'West',
    cities: ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa'],
  },
  {
    name: 'Gujarat',
    type: 'state',
    code: 'GJ',
    region: 'West',
    cities: [
      'Ahmedabad',
      'Surat',
      'Vadodara',
      'Rajkot',
      'Gandhinagar',
      'Bhavnagar',
      'Jamnagar',
      'Anand',
    ],
  },
  {
    name: 'Haryana',
    type: 'state',
    code: 'HR',
    region: 'North',
    cities: [
      'Gurugram',
      'Faridabad',
      'Panipat',
      'Ambala',
      'Karnal',
      'Rohtak',
      'Hisar',
      'Panchkula',
    ],
  },
  {
    name: 'Himachal Pradesh',
    type: 'state',
    code: 'HP',
    region: 'North',
    cities: ['Shimla', 'Dharamshala', 'Manali', 'Solan', 'Kullu'],
  },
  {
    name: 'Jharkhand',
    type: 'state',
    code: 'JH',
    region: 'East',
    cities: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro Steel City', 'Deoghar'],
  },
  {
    name: 'Karnataka',
    type: 'state',
    code: 'KA',
    region: 'South',
    cities: [
      'Bengaluru',
      'Mysuru',
      'Mangaluru',
      'Hubballi-Dharwad',
      'Belagavi',
      'Kalaburagi',
      'Davanagere',
      'Shivamogga',
      'Udupi',
    ],
  },
  {
    name: 'Kerala',
    type: 'state',
    code: 'KL',
    region: 'South',
    cities: [
      'Kochi',
      'Thiruvananthapuram',
      'Kozhikode',
      'Thrissur',
      'Kollam',
      'Kannur',
      'Kottayam',
      'Alappuzha',
    ],
  },
  {
    name: 'Madhya Pradesh',
    type: 'state',
    code: 'MP',
    region: 'Central',
    cities: [
      'Indore',
      'Bhopal',
      'Gwalior',
      'Jabalpur',
      'Ujjain',
      'Sagar',
      'Rewa',
    ],
  },
  {
    name: 'Maharashtra',
    type: 'state',
    code: 'MH',
    region: 'West',
    cities: [
      'Mumbai',
      'Pune',
      'Nagpur',
      'Nashik',
      'Thane',
      'Navi Mumbai',
      'Chhatrapati Sambhajinagar',
      'Kolhapur',
      'Solapur',
      'Amravati',
    ],
  },
  {
    name: 'Manipur',
    type: 'state',
    code: 'MN',
    region: 'Northeast',
    cities: ['Imphal'],
  },
  {
    name: 'Meghalaya',
    type: 'state',
    code: 'ML',
    region: 'Northeast',
    cities: ['Shillong', 'Tura'],
  },
  {
    name: 'Mizoram',
    type: 'state',
    code: 'MZ',
    region: 'Northeast',
    cities: ['Aizawl'],
  },
  {
    name: 'Nagaland',
    type: 'state',
    code: 'NL',
    region: 'Northeast',
    cities: ['Kohima', 'Dimapur'],
  },
  {
    name: 'Odisha',
    type: 'state',
    code: 'OD',
    region: 'East',
    cities: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Puri', 'Sambalpur', 'Berhampur'],
  },
  {
    name: 'Punjab',
    type: 'state',
    code: 'PB',
    region: 'North',
    cities: ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Mohali', 'Bathinda'],
  },
  {
    name: 'Rajasthan',
    type: 'state',
    code: 'RJ',
    region: 'North',
    cities: [
      'Jaipur',
      'Udaipur',
      'Jodhpur',
      'Kota',
      'Ajmer',
      'Bikaner',
      'Alwar',
    ],
  },
  {
    name: 'Sikkim',
    type: 'state',
    code: 'SK',
    region: 'Northeast',
    cities: ['Gangtok', 'Namchi'],
  },
  {
    name: 'Tamil Nadu',
    type: 'state',
    code: 'TN',
    region: 'South',
    cities: [
      'Chennai',
      'Coimbatore',
      'Madurai',
      'Tiruchirappalli',
      'Salem',
      'Vellore',
      'Tirunelveli',
      'Erode',
    ],
  },
  {
    name: 'Telangana',
    type: 'state',
    code: 'TS',
    region: 'South',
    cities: ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam'],
  },
  {
    name: 'Tripura',
    type: 'state',
    code: 'TR',
    region: 'Northeast',
    cities: ['Agartala'],
  },
  {
    name: 'Uttar Pradesh',
    type: 'state',
    code: 'UP',
    region: 'North',
    cities: [
      'Noida',
      'Lucknow',
      'Kanpur',
      'Agra',
      'Varanasi',
      'Prayagraj',
      'Ghaziabad',
      'Meerut',
      'Bareilly',
      'Aligarh',
      'Gorakhpur',
    ],
  },
  {
    name: 'Uttarakhand',
    type: 'state',
    code: 'UK',
    region: 'North',
    cities: ['Dehradun', 'Haridwar', 'Rishikesh', 'Roorkee', 'Haldwani', 'Nainital'],
  },
  {
    name: 'West Bengal',
    type: 'state',
    code: 'WB',
    region: 'East',
    cities: ['Kolkata', 'Siliguri', 'Howrah', 'Durgapur', 'Asansol', 'Kharagpur'],
  },

  // ===========================================================================
  // 8 UNION TERRITORIES
  // ===========================================================================
  {
    name: 'Delhi NCR',
    type: 'ut',
    code: 'DL',
    region: 'North',
    cities: ['Delhi', 'Delhi NCR', 'New Delhi', 'Dwarka'],
  },
  {
    name: 'Chandigarh',
    type: 'ut',
    code: 'CH',
    region: 'North',
    cities: ['Chandigarh'],
  },
  {
    name: 'Jammu and Kashmir',
    type: 'ut',
    code: 'JK',
    region: 'North',
    cities: ['Jammu', 'Srinagar', 'Anantnag', 'Baramulla'],
  },
  {
    name: 'Ladakh',
    type: 'ut',
    code: 'LA',
    region: 'North',
    cities: ['Leh', 'Kargil'],
  },
  {
    name: 'Puducherry',
    type: 'ut',
    code: 'PY',
    region: 'South',
    cities: ['Puducherry', 'Karaikal'],
  },
  {
    name: 'Andaman and Nicobar Islands',
    type: 'ut',
    code: 'AN',
    region: 'South',
    cities: ['Port Blair'],
  },
  {
    name: 'Dadra and Nagar Haveli and Daman and Diu',
    type: 'ut',
    code: 'DN',
    region: 'West',
    cities: ['Daman', 'Silvassa', 'Diu'],
  },
  {
    name: 'Lakshadweep',
    type: 'ut',
    code: 'LD',
    region: 'South',
    cities: ['Kavaratti'],
  },
];

/**
 * Alternative spellings, historical names, and common abbreviations mapped
 * to their canonical city identifier in INDIA_STATES_AND_UTS.
 */
export const CITY_ALIASES: Record<string, string> = {
  bangalore: 'Bengaluru',
  bengalore: 'Bengaluru',
  blore: 'Bengaluru',
  blr: 'Bengaluru',
  bombay: 'Mumbai',
  mum: 'Mumbai',
  gurgaon: 'Gurugram',
  ggn: 'Gurugram',
  calcutta: 'Kolkata',
  ccu: 'Kolkata',
  madras: 'Chennai',
  maa: 'Chennai',
  poona: 'Pune',
  cochin: 'Kochi',
  ernakulam: 'Kochi',
  trivandrum: 'Thiruvananthapuram',
  tvm: 'Thiruvananthapuram',
  calicut: 'Kozhikode',
  mysore: 'Mysuru',
  mangalore: 'Mangaluru',
  vizag: 'Visakhapatnam',
  visakhapattanam: 'Visakhapatnam',
  waltair: 'Visakhapatnam',
  baroda: 'Vadodara',
  banaras: 'Varanasi',
  benares: 'Varanasi',
  kashi: 'Varanasi',
  allahabad: 'Prayagraj',
  prayag: 'Prayagraj',
  cawnpore: 'Kanpur',
  trichy: 'Tiruchirappalli',
  trichinopoly: 'Tiruchirappalli',
  pondicherry: 'Puducherry',
  pondi: 'Puducherry',
  gauhati: 'Guwahati',
  simla: 'Shimla',
  jubbulpore: 'Jabalpur',
  aurangabad: 'Chhatrapati Sambhajinagar',
  sambhajinagar: 'Chhatrapati Sambhajinagar',
  hubli: 'Hubballi-Dharwad',
  dharwad: 'Hubballi-Dharwad',
  belgaum: 'Belagavi',
  gulbarga: 'Kalaburagi',
  shimoga: 'Shivamogga',
  alleppey: 'Alappuzha',
  quilon: 'Kollam',
  cannanore: 'Kannur',
  tricchur: 'Thrissur',
  tatanagar: 'Jamshedpur',
  bokaro: 'Bokaro Steel City',
  ncr: 'Delhi NCR',
  'nct of delhi': 'Delhi',
};

/**
 * Curated localities and neighborhoods for BorrowBox launch cities.
 */
export const CITY_LOCALITIES: Record<string, string[]> = {
  // North India
  Delhi: [
    'Connaught Place',
    'Hauz Khas',
    'South Extension',
    'Saket',
    'Vasant Kunj',
    'Greater Kailash',
    'Lajpat Nagar',
    'Karol Bagh',
    'Rohini',
    'Janakpuri',
  ],
  'Delhi NCR': [
    'Connaught Place',
    'Hauz Khas',
    'South Extension',
    'Saket',
    'Vasant Kunj',
    'Greater Kailash',
    'Dwarka',
    'Gurugram Cyber City',
    'Gurugram Sector 29',
    'Noida Sector 18',
    'Noida Sector 62',
    'Rohini',
  ],
  'New Delhi': [
    'Connaught Place',
    'Chanakyapuri',
    'Khan Market',
    'Vasant Vihar',
    'Defence Colony',
    'Green Park',
  ],
  Gurugram: [
    'DLF Cyber City',
    'Sector 29',
    'Golf Course Road',
    'Sohna Road',
    'MG Road',
    'Sushant Lok Phase 1',
    'Udyog Vihar',
  ],
  Noida: [
    'Sector 18',
    'Sector 62',
    'Sector 15',
    'Sector 137',
    'Greater Noida West',
    'Film City',
  ],
  Chandigarh: [
    'Sector 17',
    'Sector 35',
    'Sector 8',
    'Sector 22',
    'Industrial Area Phase 1',
    'Elante Hub',
  ],
  Jaipur: [
    'Malviya Nagar',
    'C-Scheme',
    'Vaishali Nagar',
    'Raja Park',
    'Mansarovar',
    'Tonk Road',
    'MI Road',
  ],
  Lucknow: [
    'Gomti Nagar',
    'Hazratganj',
    'Aliganj',
    'Indira Nagar',
    'Mahanagar',
    'Alambagh',
  ],
  Kanpur: [
    'Swaroop Nagar',
    'Civil Lines',
    'Kakadeo',
    'Mall Road',
    'Kidwai Nagar',
    'Kalyanpur',
  ],
  Agra: [
    'Sanjay Place',
    'Tajganj',
    'Kamla Nagar',
    'Dayal Bagh',
    'Sikandra',
    'Civil Lines',
  ],
  Dehradun: [
    'Rajpur Road',
    'Chakrata Road',
    'Vasant Vihar',
    'Clement Town',
    'Ballupur',
    'Patel Nagar',
  ],
  Amritsar: [
    'Ranjit Avenue',
    'Lawrence Road',
    'Mall Road',
    'Model Town',
    'Hall Bazar',
  ],
  Ludhiana: [
    'Sarabha Nagar',
    'Model Town',
    'Ferozepur Road',
    'Civil Lines',
    'BRS Nagar',
  ],
  Jammu: [
    'Gandhi Nagar',
    'Trikuta Nagar',
    'Channi Himmat',
    'Residency Road',
    'Talab Tillo',
  ],
  Srinagar: [
    'Lal Chowk',
    'Rajbagh',
    'Karan Nagar',
    'Jawahar Nagar',
    'Hyderpora',
  ],
  Varanasi: [
    'Lanka',
    'Sigra',
    'Assi Ghat',
    'Cantonment',
    'Bhelupur',
  ],
  Prayagraj: [
    'Civil Lines',
    'Katra',
    'Tagore Town',
    'George Town',
    'Naini',
  ],

  // West India
  Ahmedabad: [
    'Satellite',
    'SG Highway',
    'Vastrapur',
    'Bodakdev',
    'Navrangpura',
    'Prahlad Nagar',
    'CG Road',
    'Maninagar',
  ],
  Surat: [
    'Vesu',
    'Adajan',
    'Piplod',
    'City Light',
    'Athwa',
    'Varachha',
  ],
  Vadodara: [
    'Alkapuri',
    'Sayajigunj',
    'Gotri',
    'Manjalpur',
    'Fatehgunj',
    'Akota',
  ],
  Rajkot: [
    'Kalawad Road',
    'Yagnik Road',
    '150 Feet Ring Road',
    'Raiya Road',
    'Sadhu Vaswani Road',
  ],
  Mumbai: [
    'Bandra West',
    'Andheri West',
    'Powai',
    'Juhu',
    'Lower Parel',
    'Colaba',
    'Dadar',
    'Malad West',
    'Goregaon West',
    'Borivali West',
    'Chembur',
    'Worli',
  ],
  Pune: [
    'Koregaon Park',
    'Kothrud',
    'Viman Nagar',
    'Baner',
    'Aundh',
    'Hinjawadi',
    'Wakad',
    'Kalyani Nagar',
    'Magarpatta City',
    'Shivajinagar',
  ],
  Nagpur: [
    'Dharampeth',
    'Sadar',
    'Sitabuldi',
    'Ramdaspeth',
    'Wardha Road',
    'Manish Nagar',
  ],
  Nashik: [
    'College Road',
    'Gangapur Road',
    'Indira Nagar',
    'Panchavati',
    'Cidco',
  ],
  Thane: [
    'Ghodbunder Road',
    'Hiranandani Estate',
    'Majiwada',
    'Naupada',
    'Vasant Vihar',
  ],
  'Navi Mumbai': [
    'Vashi',
    'Nerul',
    'Belapur CBD',
    'Kharghar',
    'Seawoods',
    'Airoli',
  ],
  Indore: [
    'Vijay Nagar',
    'Palasia',
    'Bhawarkua',
    'Sapna Sangeeta',
    'Rajwada',
    'AB Road',
  ],
  Bhopal: [
    'MP Nagar',
    'Arera Colony',
    'New Market',
    'Kolar Road',
    'Hoshangabad Road',
  ],
  Udaipur: [
    'Fatehpura',
    'Hiran Magri',
    'Bapu Bazar',
    'Sukhadia Circle',
    'Shobhagpura',
  ],
  Jodhpur: [
    'Sardarpura',
    'Ratanada',
    'Shastri Nagar',
    'Paota',
    'Chopasni Housing Board',
  ],

  // South India
  Bengaluru: [
    'Indiranagar',
    'Koramangala',
    'HSR Layout',
    'Whitefield',
    'Jayanagar',
    'JP Nagar',
    'Bellandur',
    'Marathahalli',
    'Electronic City',
    'Hebbal',
    'Malleshwaram',
    'BTM Layout',
    'MG Road',
  ],
  Chennai: [
    'Adyar',
    'Besant Nagar',
    'T. Nagar',
    'Velachery',
    'Anna Nagar',
    'Nungambakkam',
    'Mylapore',
    'OMR Thoraipakkam',
    'Alwarpet',
    'Guindy',
  ],
  Hyderabad: [
    'Gachibowli',
    'HITEC City',
    'Madhapur',
    'Jubilee Hills',
    'Banjara Hills',
    'Kondapur',
    'Kukatpally',
    'Begumpet',
    'Secunderabad',
    'Ameerpet',
  ],
  Kochi: [
    'Panampilly Nagar',
    'Kakkanad (InfoPark)',
    'Edappally',
    'Fort Kochi',
    'Marine Drive',
    'MG Road',
  ],
  Thiruvananthapuram: [
    'Technopark Kazhakkoottam',
    'Kowdiar',
    'Pattom',
    'Vazhuthacaud',
    'vellayambalam',
    'East Fort',
  ],
  Kozhikode: [
    'Mavoor Road',
    'SM Street',
    'Cyberpark',
    'Nadakkavu',
    'West Hill',
  ],
  Coimbatore: [
    'RS Puram',
    'Gandhipuram',
    'Peelamedu',
    'Saravanampatti',
    'Race Course',
    'Saibaba Colony',
  ],
  Madurai: [
    'Anna Nagar',
    'KK Nagar',
    'Bypass Road',
    'Tallakulam',
    'SS Colony',
  ],
  Mysuru: [
    'Vijayanagar',
    'Jayalakshmipuram',
    'Saraswathipuram',
    'Kuvempunagar',
    'Gokulam',
  ],
  Mangaluru: [
    'Hampankatta',
    'Kadri',
    'Bejai',
    'Kankanady',
    'Surathkal',
  ],
  Visakhapatnam: [
    'MVP Colony',
    'Dwaraka Nagar',
    'Siripuram',
    'Madhurawada',
    'Gajuwaka',
    'Beach Road',
  ],
  Vijayawada: [
    'Benz Circle',
    'MG Road',
    'Governorpet',
    'Patamata',
    'Auto Nagar',
  ],
  Tirupati: [
    'Air Bypass Road',
    'Koramenugunta',
    'Alipiri Road',
    'MR Palli',
    'Tilak Road',
  ],

  // East India
  Kolkata: [
    'Salt Lake City',
    'Park Street',
    'New Town',
    'Ballygunge',
    'Alipore',
    'Gariahat',
    'Dum Dum',
    'Jadavpur',
  ],
  Bhubaneswar: [
    'Patia',
    'Saheed Nagar',
    'Jayadev Vihar',
    'Nayapalli',
    'Khandagiri',
    'Chandrasekharpur',
  ],
  Cuttack: [
    'CDA Sector 6',
    'Badambadi',
    'College Square',
    'Link Road',
    'Buxishi Bazar',
  ],
  Patna: [
    'Boring Road',
    'Kankarbagh',
    'Bailey Road',
    'Fraser Road',
    'Patliputra Colony',
    'Rajendra Nagar',
  ],
  Ranchi: [
    'Lalpur',
    'Main Road',
    'Doranda',
    'Morabadi',
    'Kanke Road',
    'Harmu',
  ],
  Jamshedpur: [
    'Bistupur',
    'Sakchi',
    'Sonari',
    'Kadma',
    'Telco Colony',
  ],
  Dhanbad: [
    'Bank More',
    'Hirapur',
    'Saraidhela',
    'Bartand',
    'Jharia Road',
  ],
  Guwahati: [
    'GS Road',
    'Beltola',
    'Zoo Road',
    'Paltan Bazaar',
    'Pan Bazaar',
    'Six Mile',
  ],
  Siliguri: [
    'Sevoke Road',
    'Hill Cart Road',
    'Matigara',
    'Pradhan Nagar',
    'Hakim Para',
  ],

  // Central India
  Raipur: [
    'Shankar Nagar',
    'Pandri',
    'Telibandha',
    'GE Road',
    'Civil Lines',
    'Naya Raipur',
  ],
  Bilaspur: [
    'Vyapar Vihar',
    'Civil Lines',
    'Sarkanda',
    'Link Road',
    'Rajendra Nagar',
  ],
  Gwalior: [
    'City Center',
    'Lashkar',
    'Morar',
    'Thatipur',
    'DD Nagar',
  ],
  Jabalpur: [
    'Wright Town',
    'Napier Town',
    'Civil Lines',
    'Vijay Nagar',
    'Sadar',
  ],
  Ujjain: [
    'Freeganj',
    'Nanakheda',
    'Mahakal Marg',
    'Rishi Nagar',
    'Dewas Road',
  ],
};

export const MAJOR_METROS = [
  'Bengaluru',
  'Mumbai',
  'Delhi',
  'Delhi NCR',
  'Hyderabad',
  'Pune',
  'Chennai',
  'Kolkata',
  'Ahmedabad',
  'Gurugram',
  'Noida',
  'Jaipur',
  'Chandigarh',
  'Kochi',
  'Lucknow',
  'Indore',
];

/**
 * Resolves any city string (including historical names, alternative spellings,
 * or case variations) to its canonical city name in INDIA_STATES_AND_UTS.
 */
export function resolveCanonicalCityName(rawCity: string): string {
  const trimmed = String(rawCity || '').trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();

  if (CITY_ALIASES[lower]) {
    return CITY_ALIASES[lower];
  }

  for (const s of INDIA_STATES_AND_UTS) {
    for (const c of s.cities) {
      if (c.toLowerCase() === lower) {
        return c;
      }
    }
  }

  return trimmed;
}

/**
 * Determines whether two city identifiers refer to the same city or equivalent metro hub
 * (e.g., "Bangalore" <-> "Bengaluru", "Delhi" <-> "Delhi NCR", "Gurgaon" <-> "Gurugram").
 */
export function areCitiesEquivalent(cityA: string, cityB: string): boolean {
  if (!cityA || !cityB) return false;
  if (cityA === cityB) return true;

  const canonA = resolveCanonicalCityName(cityA);
  const canonB = resolveCanonicalCityName(cityB);
  if (canonA.toLowerCase() === canonB.toLowerCase()) {
    return true;
  }

  // Treat Delhi, Delhi NCR, and New Delhi as compatible within the Delhi capital hub
  const delhiGroup = new Set(['delhi', 'delhi ncr', 'new delhi']);
  if (delhiGroup.has(canonA.toLowerCase()) && delhiGroup.has(canonB.toLowerCase())) {
    return true;
  }

  return false;
}

/**
 * Returns all distinct city names flattened from all states/UTs.
 */
export function getAllIndianCities(): { city: string; state: string }[] {
  const result: { city: string; state: string }[] = [];
  const seen = new Set<string>();
  for (const s of INDIA_STATES_AND_UTS) {
    for (const c of s.cities) {
      if (!seen.has(c)) {
        seen.add(c);
        result.push({ city: c, state: s.name });
      }
    }
  }
  return result;
}

/**
 * Finds matching cities based on a case-insensitive search string,
 * supporting canonical city names, state names, and historical/alternative spellings.
 */
export function searchIndianCities(
  query: string,
  limit = 20
): { city: string; state: string }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const all = getAllIndianCities();
  const matchedCities = new Set<string>();
  const results: { city: string; state: string }[] = [];

  // 1. Check direct alias matches first (e.g. "bangalore" -> "Bengaluru", "gurgaon" -> "Gurugram")
  for (const [alias, canonical] of Object.entries(CITY_ALIASES)) {
    if (alias.includes(q) || q.includes(alias)) {
      const found = all.find((item) => item.city === canonical);
      if (found && !matchedCities.has(found.city)) {
        matchedCities.add(found.city);
        results.push(found);
      }
    }
  }

  // 2. Match city name or state name
  for (const item of all) {
    if (matchedCities.has(item.city)) continue;
    if (
      item.city.toLowerCase().includes(q) ||
      item.state.toLowerCase().includes(q)
    ) {
      matchedCities.add(item.city);
      results.push(item);
    }
  }

  return results.slice(0, limit);
}

/**
 * Gets the parent State or Union Territory for a given city name (supporting aliases).
 */
export function getStateForCity(cityName: string): string | null {
  const canonical = resolveCanonicalCityName(cityName);
  for (const s of INDIA_STATES_AND_UTS) {
    if (s.cities.includes(canonical) || s.cities.includes(cityName)) {
      return s.name;
    }
  }
  return null;
}

/**
 * Gets curated localities for a given city (supporting aliases), with fallback to central urban zones.
 */
export function getLocalitiesForCity(cityName: string): string[] {
  const canonical = resolveCanonicalCityName(cityName);
  if (CITY_LOCALITIES[canonical]) {
    return CITY_LOCALITIES[canonical];
  }
  if (CITY_LOCALITIES[cityName]) {
    return CITY_LOCALITIES[cityName];
  }
  return [
    'City Centre',
    'Central Commercial District',
    'Civil Lines',
    'Railway Station Hub',
    'North Zone',
    'South Zone',
  ];
}

/**
 * Computes active listing counts per supported city (without inventing fake inventory).
 */
export function getActiveListingCountForCity(
  cityName: string,
  listings: ReadonlyArray<{ city: string; status?: string }>
): number {
  let count = 0;
  for (const item of listings) {
    if (item.status === 'archived') continue;
    if (areCitiesEquivalent(item.city, cityName)) {
      count += 1;
    }
  }
  return count;
}

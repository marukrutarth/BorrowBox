/**
 * Comprehensive Indian States, Union Territories, Cities, and Localities dataset.
 * Covers all 28 states, 8 union territories, and recognised cities/towns.
 */

export interface StateLocation {
  name: string;
  type: 'state' | 'ut';
  code: string;
  cities: string[];
}

export interface CityDetails {
  name: string;
  state: string;
  isMetropolitan?: boolean;
  localities: string[];
}

export const INDIA_STATES_AND_UTS: StateLocation[] = [
  // 28 States
  {
    name: 'Andhra Pradesh',
    type: 'state',
    code: 'AP',
    cities: [
      'Visakhapatnam',
      'Vijayawada',
      'Guntur',
      'Nellore',
      'Kurnool',
      'Rajahmundry',
      'Tirupati',
      'Kakinada',
      'Kadapa',
      'Anantapur',
    ],
  },
  {
    name: 'Arunachal Pradesh',
    type: 'state',
    code: 'AR',
    cities: ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro'],
  },
  {
    name: 'Assam',
    type: 'state',
    code: 'AS',
    cities: ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tezpur'],
  },
  {
    name: 'Bihar',
    type: 'state',
    code: 'BR',
    cities: ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif'],
  },
  {
    name: 'Chhattisgarh',
    type: 'state',
    code: 'CG',
    cities: ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon'],
  },
  {
    name: 'Goa',
    type: 'state',
    code: 'GA',
    cities: ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'],
  },
  {
    name: 'Gujarat',
    type: 'state',
    code: 'GJ',
    cities: [
      'Ahmedabad',
      'Surat',
      'Vadodara',
      'Rajkot',
      'Bhavnagar',
      'Jamnagar',
      'Gandhinagar',
      'Junagadh',
      'Anand',
      'Navsari',
    ],
  },
  {
    name: 'Haryana',
    type: 'state',
    code: 'HR',
    cities: ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal'],
  },
  {
    name: 'Himachal Pradesh',
    type: 'state',
    code: 'HP',
    cities: ['Shimla', 'Dharamshala', 'Manali', 'Solan', 'Mandi', 'Kullu', 'Baddi'],
  },
  {
    name: 'Jharkhand',
    type: 'state',
    code: 'JH',
    cities: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro Steel City', 'Deoghar', 'Hazaribagh'],
  },
  {
    name: 'Karnataka',
    type: 'state',
    code: 'KA',
    cities: [
      'Bengaluru',
      'Mysuru',
      'Hubballi-Dharwad',
      'Mangaluru',
      'Belagavi',
      'Kalaburagi',
      'Davanagere',
      'Ballari',
      'Shivamogga',
      'Tumakuru',
      'Udupi',
    ],
  },
  {
    name: 'Kerala',
    type: 'state',
    code: 'KL',
    cities: [
      'Kochi',
      'Thiruvananthapuram',
      'Kozhikode',
      'Thrissur',
      'Kollam',
      'Palakkad',
      'Alappuzha',
      'Kannur',
      'Kottayam',
    ],
  },
  {
    name: 'Madhya Pradesh',
    type: 'state',
    code: 'MP',
    cities: ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna'],
  },
  {
    name: 'Maharashtra',
    type: 'state',
    code: 'MH',
    cities: [
      'Mumbai',
      'Pune',
      'Nagpur',
      'Thane',
      'Nashik',
      'Chhatrapati Sambhajinagar',
      'Navi Mumbai',
      'Solapur',
      'Kolhapur',
      'Amravati',
      'Pimpri-Chinchwad',
    ],
  },
  {
    name: 'Manipur',
    type: 'state',
    code: 'MN',
    cities: ['Imphal', 'Churachandpur', 'Thoubal'],
  },
  {
    name: 'Meghalaya',
    type: 'state',
    code: 'ML',
    cities: ['Shillong', 'Tura', 'Jowai'],
  },
  {
    name: 'Mizoram',
    type: 'state',
    code: 'MZ',
    cities: ['Aizawl', 'Lunglei', 'Champhai'],
  },
  {
    name: 'Nagaland',
    type: 'state',
    code: 'NL',
    cities: ['Kohima', 'Dimapur', 'Mokokchung'],
  },
  {
    name: 'Odisha',
    type: 'state',
    code: 'OD',
    cities: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore'],
  },
  {
    name: 'Punjab',
    type: 'state',
    code: 'PB',
    cities: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot'],
  },
  {
    name: 'Rajasthan',
    type: 'state',
    code: 'RJ',
    cities: ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara', 'Alwar'],
  },
  {
    name: 'Sikkim',
    type: 'state',
    code: 'SK',
    cities: ['Gangtok', 'Namchi', 'Geyzing', 'Mangan'],
  },
  {
    name: 'Tamil Nadu',
    type: 'state',
    code: 'TN',
    cities: [
      'Chennai',
      'Coimbatore',
      'Madurai',
      'Tiruchirappalli',
      'Salem',
      'Tirunelveli',
      'Erode',
      'Vellore',
      'Thoothukudi',
      'Dindigul',
    ],
  },
  {
    name: 'Telangana',
    type: 'state',
    code: 'TS',
    cities: ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Ramagundam', 'Secunderabad'],
  },
  {
    name: 'Tripura',
    type: 'state',
    code: 'TR',
    cities: ['Agartala', 'Dharmanagar', 'Udaipur (Tripura)', 'Kailashahar'],
  },
  {
    name: 'Uttar Pradesh',
    type: 'state',
    code: 'UP',
    cities: [
      'Lucknow',
      'Kanpur',
      'Varanasi',
      'Agra',
      'Prayagraj',
      'Meerut',
      'Ghaziabad',
      'Noida',
      'Aligarh',
      'Bareilly',
      'Moradabad',
      'Gorakhpur',
    ],
  },
  {
    name: 'Uttarakhand',
    type: 'state',
    code: 'UK',
    cities: ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rishikesh', 'Nainital'],
  },
  {
    name: 'West Bengal',
    type: 'state',
    code: 'WB',
    cities: ['Kolkata', 'Howrah', 'Siliguri', 'Durgapur', 'Asansol', 'Kharagpur', 'Bardhaman'],
  },

  // 8 Union Territories
  {
    name: 'Delhi NCR',
    type: 'ut',
    code: 'DL',
    cities: ['Delhi NCR', 'New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Dwarka'],
  },
  {
    name: 'Chandigarh',
    type: 'ut',
    code: 'CH',
    cities: ['Chandigarh'],
  },
  {
    name: 'Jammu and Kashmir',
    type: 'ut',
    code: 'JK',
    cities: ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur'],
  },
  {
    name: 'Ladakh',
    type: 'ut',
    code: 'LA',
    cities: ['Leh', 'Kargil'],
  },
  {
    name: 'Puducherry',
    type: 'ut',
    code: 'PY',
    cities: ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
  },
  {
    name: 'Andaman and Nicobar Islands',
    type: 'ut',
    code: 'AN',
    cities: ['Port Blair', 'Diglipur'],
  },
  {
    name: 'Dadra and Nagar Haveli and Daman and Diu',
    type: 'ut',
    code: 'DN',
    cities: ['Daman', 'Diu', 'Silvassa'],
  },
  {
    name: 'Lakshadweep',
    type: 'ut',
    code: 'LD',
    cities: ['Kavaratti', 'Agatti'],
  },
];

export const CITY_LOCALITIES: Record<string, string[]> = {
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
  Kolkata: [
    'Salt Lake City',
    'Park Street',
    'New Town',
    'Ballygunge',
    'Alipore',
    'Gariahat',
    'Dum Dum',
  ],
  Ahmedabad: [
    'Satellite',
    'SG Highway',
    'Vastrapur',
    'Bodakdev',
    'Navrangpura',
    'Prahlad Nagar',
  ],
  Jaipur: [
    'Malviya Nagar',
    'C-Scheme',
    'Vaishali Nagar',
    'Raja Park',
    'Mansarovar',
  ],
  Chandigarh: [
    'Sector 17',
    'Sector 35',
    'Sector 8',
    'Industrial Area Phase 1',
    'Sector 22',
  ],
  Kochi: [
    'Panampilly Nagar',
    'Kakkanad (InfoPark)',
    'Edappally',
    'Fort Kochi',
    'Marine Drive',
  ],
};

export const MAJOR_METROS = [
  'Bengaluru',
  'Mumbai',
  'Delhi NCR',
  'Hyderabad',
  'Pune',
  'Chennai',
  'Kolkata',
  'Ahmedabad',
  'Jaipur',
  'Chandigarh',
  'Kochi',
];

/**
 * Returns all distinct city names flattened from all states/UTs.
 */
export function getAllIndianCities(): { city: string; state: string }[] {
  const result: { city: string; state: string }[] = [];
  for (const s of INDIA_STATES_AND_UTS) {
    for (const c of s.cities) {
      result.push({ city: c, state: s.name });
    }
  }
  return result;
}

/**
 * Finds matching cities based on a case-insensitive search string.
 */
export function searchIndianCities(
  query: string,
  limit = 15
): { city: string; state: string }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = getAllIndianCities();
  return all
    .filter(
      (item) =>
        item.city.toLowerCase().includes(q) ||
        item.state.toLowerCase().includes(q)
    )
    .slice(0, limit);
}

/**
 * Gets the state for a given city name.
 */
export function getStateForCity(cityName: string): string | null {
  for (const s of INDIA_STATES_AND_UTS) {
    if (s.cities.includes(cityName)) {
      return s.name;
    }
  }
  return null;
}

/**
 * Gets localities for a given city, with fallback to standard central hubs.
 */
export function getLocalitiesForCity(cityName: string): string[] {
  if (CITY_LOCALITIES[cityName]) {
    return CITY_LOCALITIES[cityName];
  }
  return [
    'City Centre',
    'Central Commercial District',
    'Railway Station Hub',
    'North Zone',
    'South Zone',
    'East Zone',
    'West Zone',
  ];
}

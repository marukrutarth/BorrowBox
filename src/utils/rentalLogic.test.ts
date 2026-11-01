import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_CITIES,
  calculateRentalQuote,
  calculateRentVsBuy,
  computePersonalizedRecommendations,
  filterAndSortListings,
  formatINR,
  generateHandoverCode,
  hasDateRangeOverlap,
  isListingAvailableForDates,
  validateAuthInput,
  validateListingInput,
  validateProfileUpdateInput,
} from './rentalLogic';
import {
  INDIA_STATES_AND_UTS,
  areCitiesEquivalent,
  getActiveListingCountForCity,
  getLocalitiesForCity,
  getStateForCity,
  resolveCanonicalCityName,
  searchIndianCities,
} from '../data/indiaLocations';
import { ProductListing } from '../types/marketplace';

const sampleListings: ProductListing[] = [
  {
    id: 'item-1',
    title: 'Sony Alpha A7 IV Mirrorless Camera + 24-70mm GM',
    category: 'Photography',
    dailyPriceINR: 1800,
    refundableDepositINR: 15000,
    condition: 'Like New',
    city: 'Bengaluru',
    neighborhood: 'Indiranagar',
    pickupLocation: '100 Feet Road, Indiranagar, Bengaluru',
    description: 'Full-frame camera with lens kit.',
    specifications: ['33MP Sensor', '4K 60p Video'],
    includedItems: ['Camera Body', 'Lens', '2 Batteries'],
    rentalRules: ['Valid Government ID required at pickup'],
    availableFrom: '2026-10-01',
    availableTo: '2026-12-31',
    minRentalDays: 1,
    featured: true,
    isDemoData: true,
    imageUrl: '/test1.jpg',
    gallery: [],
    owner: {
      id: 'owner-1',
      name: 'Rohan Kulkarni',
      neighborhood: 'Indiranagar',
      city: 'Bengaluru',
      rating: 4.9,
      completedRentals: 34,
      responseTime: 'Within 1 hour',
      memberSince: 'March 2024',
      kycVerified: true,
    },
  },
  {
    id: 'item-2',
    title: 'Bosch Cordless Impact Drill & 45-Piece Bit Kit',
    category: 'Tools',
    dailyPriceINR: 350,
    refundableDepositINR: 2000,
    condition: 'Good',
    city: 'Mumbai',
    neighborhood: 'Bandra West',
    pickupLocation: 'Pali Hill, Bandra West, Mumbai',
    description: 'Heavy duty cordless drill for home DIY.',
    specifications: ['18V Li-Ion', '2 Batteries'],
    includedItems: ['Drill', 'Charger', 'Bit Set'],
    rentalRules: ['Clean dust before returning'],
    availableFrom: '2026-10-01',
    availableTo: '2026-12-31',
    minRentalDays: 2,
    featured: false,
    isDemoData: true,
    imageUrl: '/test2.jpg',
    gallery: [],
    owner: {
      id: 'owner-2',
      name: 'Siddharth Mehta',
      neighborhood: 'Bandra West',
      city: 'Mumbai',
      rating: 4.8,
      completedRentals: 19,
      responseTime: 'Within 2 hours',
      memberSince: 'July 2024',
      kycVerified: true,
    },
  },
  {
    id: 'item-3',
    title: 'PlayStation 5 Disc Edition + 2 DualSense Controllers',
    category: 'Gaming',
    dailyPriceINR: 950,
    refundableDepositINR: 8000,
    condition: 'Excellent',
    city: 'Bengaluru',
    neighborhood: 'Koramangala',
    pickupLocation: '4th Block, Koramangala, Bengaluru',
    description: 'Next-gen PS5 console for weekend gaming.',
    specifications: ['825GB SSD', '4K 120Hz'],
    includedItems: ['PS5 Console', '2 Controllers', 'HDMI 2.1 Cable'],
    rentalRules: ['No PSN account tampering'],
    availableFrom: '2026-10-01',
    availableTo: '2026-12-31',
    minRentalDays: 1,
    featured: true,
    isDemoData: true,
    imageUrl: '/test3.jpg',
    gallery: [],
    owner: {
      id: 'owner-3',
      name: 'Ananya Nair',
      neighborhood: 'Koramangala',
      city: 'Bengaluru',
      rating: 5.0,
      completedRentals: 42,
      responseTime: 'Within 30 mins',
      memberSince: 'January 2024',
      kycVerified: true,
    },
  },
];

test('formatINR formats Indian Rupees using Indian numbering system', () => {
  assert.equal(formatINR(350), '₹350');
  assert.equal(formatINR(1800), '₹1,800');
  assert.equal(formatINR(15000), '₹15,000');
  assert.equal(formatINR(125000), '₹1,25,000');
});

test('filterAndSortListings filters by category, city, and search query', () => {
  const byCategory = filterAndSortListings(sampleListings, {
    category: 'Photography',
  });
  assert.equal(byCategory.length, 1);
  assert.equal(byCategory[0].id, 'item-1');

  const byCity = filterAndSortListings(sampleListings, {
    city: 'Bengaluru',
    sortBy: 'price-asc',
  });
  assert.equal(byCity.length, 2);
  assert.equal(byCity[0].id, 'item-3'); // ₹950 before ₹1800
  assert.equal(byCity[1].id, 'item-1');

  const byQuery = filterAndSortListings(sampleListings, {
    query: 'dualsense',
  });
  assert.equal(byQuery.length, 1);
  assert.equal(byQuery[0].id, 'item-3');
});

test('filterAndSortListings sorts by price descending and deposit ascending', () => {
  const priceDesc = filterAndSortListings(sampleListings, {
    sortBy: 'price-desc',
  });
  assert.deepEqual(
    priceDesc.map((i) => i.dailyPriceINR),
    [1800, 950, 350]
  );

  const depositAsc = filterAndSortListings(sampleListings, {
    sortBy: 'deposit-asc',
  });
  assert.deepEqual(
    depositAsc.map((i) => i.refundableDepositINR),
    [2000, 8000, 15000]
  );
});

test('filterAndSortListings separates genuine community listings from sample catalog items', () => {
  const mixedListings: ProductListing[] = [
    ...sampleListings,
    {
      ...sampleListings[0],
      id: 'community-item-1',
      title: 'Community Canon EOS R6 Mark II',
      isDemoData: false,
    },
  ];

  const onlyCommunity = filterAndSortListings(mixedListings, {
    sourceFilter: 'community',
  });
  assert.equal(onlyCommunity.length, 1);
  assert.equal(onlyCommunity[0].id, 'community-item-1');

  const onlySample = filterAndSortListings(mixedListings, {
    sourceFilter: 'sample',
  });
  assert.equal(onlySample.length, 3);
  assert.ok(onlySample.every((item) => item.isDemoData));
});

test('calculateRentalQuote computes multi-day quotes and weekly discount accurately', () => {
  // 3 days at ₹1,000/day + ₹5,000 deposit
  const shortQuote = calculateRentalQuote(1000, 5000, '2026-11-01', '2026-11-04');
  assert.equal(shortQuote.valid, true);
  assert.equal(shortQuote.days, 3);
  assert.equal(shortQuote.baseRentalINR, 3000);
  assert.equal(shortQuote.weeklyDiscountINR, 0);
  assert.equal(shortQuote.platformSupportFeeINR, 150);
  assert.equal(shortQuote.totalUpfrontINR, 3150 + 5000);

  // 7 days at ₹1,000/day -> 10% weekly discount (₹700 off)
  const weeklyQuote = calculateRentalQuote(1000, 5000, '2026-11-01', '2026-11-08');
  assert.equal(weeklyQuote.valid, true);
  assert.equal(weeklyQuote.days, 7);
  assert.equal(weeklyQuote.baseRentalINR, 7000);
  assert.equal(weeklyQuote.weeklyDiscountINR, 700);
});

test('calculateRentalQuote rejects invalid date ordering or below minimum days', () => {
  const reversed = calculateRentalQuote(500, 2000, '2026-11-10', '2026-11-05');
  assert.equal(reversed.valid, false);
  assert.ok(reversed.error?.includes('Return date'));

  const belowMin = calculateRentalQuote(350, 2000, '2026-11-10', '2026-11-10', 2);
  assert.equal(belowMin.valid, false);
  assert.ok(belowMin.error?.includes('minimum rental of 2 days'));
});

test('validateListingInput and validateAuthInput enforce required fields', () => {
  const invalidListing = validateListingInput({
    title: 'Hi',
    category: '',
    dailyPriceINR: 10,
    refundableDepositINR: -10,
    condition: 'Good',
    city: '',
    neighborhood: '',
    pickupLocation: '',
    description: 'Too short',
    includedItemsText: '',
    rentalRulesText: '',
    ownerName: '',
  });
  assert.equal(invalidListing.valid, false);
  assert.ok(invalidListing.errors.title);
  assert.ok(invalidListing.errors.dailyPriceINR);

  const validSignup = validateAuthInput('signup', {
    fullName: 'Priya Sharma',
    email: 'priya@example.in',
    phone: '9876543210',
    city: 'Delhi NCR',
    neighborhood: 'Hauz Khas',
    password: 'securePassword123',
  });
  assert.equal(validSignup.valid, true);

  const validProfileUpdate = validateProfileUpdateInput({
    name: 'Priya Sharma',
    photoURL: '',
    city: 'Bengaluru',
    neighborhood: 'Indiranagar',
    phone: '9876543210',
    activeMode: 'owner',
  });
  assert.equal(validProfileUpdate.valid, true);

  const invalidProfileUpdate = validateProfileUpdateInput({
    name: 'P',
    photoURL: 'x'.repeat(600),
    city: 'Bengaluru',
    neighborhood: 'I',
    phone: '123',
    activeMode: 'renter',
  });
  assert.equal(invalidProfileUpdate.valid, false);
  assert.ok(invalidProfileUpdate.errors.name);
  assert.ok(invalidProfileUpdate.errors.photoURL);
  assert.ok(invalidProfileUpdate.errors.neighborhood);
  assert.ok(invalidProfileUpdate.errors.phone);
});

test('hasDateRangeOverlap and isListingAvailableForDates prevent overlapping reservations', () => {
  assert.equal(
    hasDateRangeOverlap('2026-11-05', '2026-11-08', '2026-11-07', '2026-11-10'),
    true
  );
  assert.equal(
    hasDateRangeOverlap('2026-11-05', '2026-11-08', '2026-11-09', '2026-11-12'),
    false
  );

  const existingBookings = [
    {
      listingId: 'item-1',
      startDate: '2026-11-10',
      endDate: '2026-11-14',
      status: 'accepted' as const,
    },
  ];

  const conflictCheck = isListingAvailableForDates(
    sampleListings[0],
    '2026-11-12',
    '2026-11-15',
    existingBookings
  );
  assert.equal(conflictCheck.available, false);
  assert.ok(conflictCheck.reason?.includes('Reserved from 2026-11-10'));

  const freeCheck = isListingAvailableForDates(
    sampleListings[0],
    '2026-11-16',
    '2026-11-18',
    existingBookings
  );
  assert.equal(freeCheck.available, true);
});

test('calculateRentVsBuy and computePersonalizedRecommendations return accurate results', () => {
  const rentCompare = calculateRentVsBuy({
    retailPriceINR: 185000,
    dailyRentalINR: 1850,
    plannedDaysPerYear: 6,
  });
  assert.equal(rentCompare.recommendation, 'rent');
  assert.equal(rentCompare.estimatedRentalCostINR, 11100);
  assert.equal(rentCompare.breakEvenDays, 100);

  const code = generateHandoverCode('booking-123');
  assert.ok(code.startsWith('BB-'));
  assert.equal(code.length, 9);

  const recs = computePersonalizedRecommendations(sampleListings, {
    userCity: 'Bengaluru',
    preferredCategory: 'Photography',
    limit: 2,
  });
  assert.equal(recs.length, 2);
  assert.equal(recs[0].id, 'item-1');
});

test('INDIA_STATES_AND_UTS covers all 28 states, 8 UTs, and all specified initial launch cities with zero duplicates', () => {
  const states = INDIA_STATES_AND_UTS.filter((s) => s.type === 'state');
  const uts = INDIA_STATES_AND_UTS.filter((s) => s.type === 'ut');
  assert.equal(states.length, 28, 'Must include all 28 Indian states');
  assert.equal(uts.length, 8, 'Must include all 8 Indian union territories');
  assert.equal(INDIA_STATES_AND_UTS.length, 36);

  // Verify ALL_CITIES has zero duplicate keys
  const uniqueCities = new Set(ALL_CITIES);
  assert.equal(uniqueCities.size, ALL_CITIES.length, 'ALL_CITIES must not contain duplicate city names');
  assert.ok(ALL_CITIES.length >= 100 && ALL_CITIES.length <= 200, 'Should focus on major metropolitan cities and popular urban centres');

  // Verify every initial launch city from North, West, South, East, and Central India is included and mapped to the right State/UT
  const expectedLaunchCitiesByState: Array<[string, string]> = [
    // North India
    ['Delhi', 'Delhi NCR'],
    ['Gurugram', 'Haryana'],
    ['Noida', 'Uttar Pradesh'],
    ['Chandigarh', 'Chandigarh'],
    ['Jaipur', 'Rajasthan'],
    ['Lucknow', 'Uttar Pradesh'],
    ['Kanpur', 'Uttar Pradesh'],
    ['Agra', 'Uttar Pradesh'],
    ['Dehradun', 'Uttarakhand'],
    ['Amritsar', 'Punjab'],
    ['Ludhiana', 'Punjab'],
    ['Jammu', 'Jammu and Kashmir'],
    ['Srinagar', 'Jammu and Kashmir'],
    // West India
    ['Ahmedabad', 'Gujarat'],
    ['Surat', 'Gujarat'],
    ['Vadodara', 'Gujarat'],
    ['Rajkot', 'Gujarat'],
    ['Mumbai', 'Maharashtra'],
    ['Pune', 'Maharashtra'],
    ['Nagpur', 'Maharashtra'],
    ['Nashik', 'Maharashtra'],
    ['Thane', 'Maharashtra'],
    ['Navi Mumbai', 'Maharashtra'],
    ['Indore', 'Madhya Pradesh'],
    ['Bhopal', 'Madhya Pradesh'],
    ['Udaipur', 'Rajasthan'],
    ['Jodhpur', 'Rajasthan'],
    // South India
    ['Bengaluru', 'Karnataka'],
    ['Chennai', 'Tamil Nadu'],
    ['Hyderabad', 'Telangana'],
    ['Kochi', 'Kerala'],
    ['Thiruvananthapuram', 'Kerala'],
    ['Kozhikode', 'Kerala'],
    ['Coimbatore', 'Tamil Nadu'],
    ['Madurai', 'Tamil Nadu'],
    ['Mysuru', 'Karnataka'],
    ['Mangaluru', 'Karnataka'],
    ['Visakhapatnam', 'Andhra Pradesh'],
    ['Vijayawada', 'Andhra Pradesh'],
    ['Tirupati', 'Andhra Pradesh'],
    // East India
    ['Kolkata', 'West Bengal'],
    ['Bhubaneswar', 'Odisha'],
    ['Cuttack', 'Odisha'],
    ['Patna', 'Bihar'],
    ['Ranchi', 'Jharkhand'],
    ['Jamshedpur', 'Jharkhand'],
    ['Dhanbad', 'Jharkhand'],
    ['Guwahati', 'Assam'],
    ['Siliguri', 'West Bengal'],
    // Central India
    ['Raipur', 'Chhattisgarh'],
    ['Bilaspur', 'Chhattisgarh'],
    ['Gwalior', 'Madhya Pradesh'],
    ['Jabalpur', 'Madhya Pradesh'],
    ['Ujjain', 'Madhya Pradesh'],
  ];

  for (const [city, expectedState] of expectedLaunchCitiesByState) {
    assert.ok(ALL_CITIES.includes(city), `Launch city ${city} must be in ALL_CITIES`);
    assert.equal(
      getStateForCity(city),
      expectedState,
      `Launch city ${city} must belong to ${expectedState}`
    );
    assert.ok(
      getLocalitiesForCity(city).length >= 3,
      `Launch city ${city} must have curated localities`
    );
  }
});

test('Location alias resolution, Delhi/Delhi NCR compatibility, and active listing count distinction work accurately', () => {
  // Alternative spellings and historical names
  assert.equal(resolveCanonicalCityName('Bangalore'), 'Bengaluru');
  assert.equal(resolveCanonicalCityName('Gurgaon'), 'Gurugram');
  assert.equal(resolveCanonicalCityName('Bombay'), 'Mumbai');
  assert.equal(resolveCanonicalCityName('Calcutta'), 'Kolkata');
  assert.equal(resolveCanonicalCityName('Madras'), 'Chennai');
  assert.equal(resolveCanonicalCityName('Cochin'), 'Kochi');
  assert.equal(resolveCanonicalCityName('Trivandrum'), 'Thiruvananthapuram');
  assert.equal(resolveCanonicalCityName('Calicut'), 'Kozhikode');
  assert.equal(resolveCanonicalCityName('Mysore'), 'Mysuru');
  assert.equal(resolveCanonicalCityName('Mangalore'), 'Mangaluru');
  assert.equal(resolveCanonicalCityName('Vizag'), 'Visakhapatnam');
  assert.equal(resolveCanonicalCityName('Baroda'), 'Vadodara');

  // Search by alternative names finds canonical launch city
  assert.ok(searchIndianCities('Bangalore').some((r) => r.city === 'Bengaluru'));
  assert.ok(searchIndianCities('Gurgaon').some((r) => r.city === 'Gurugram'));
  assert.ok(searchIndianCities('Vizag').some((r) => r.city === 'Visakhapatnam'));
  assert.ok(searchIndianCities('Trivandrum').some((r) => r.city === 'Thiruvananthapuram'));

  // Existing Delhi NCR records and Delhi launch city are equivalent
  assert.equal(areCitiesEquivalent('Delhi', 'Delhi NCR'), true);
  assert.equal(areCitiesEquivalent('Bangalore', 'Bengaluru'), true);
  assert.equal(areCitiesEquivalent('Jaipur', 'Udaipur'), false);

  // Distinguish between cities with active listings and supported cities with 0 active listings
  assert.equal(getActiveListingCountForCity('Bengaluru', sampleListings), 2);
  assert.equal(getActiveListingCountForCity('Mumbai', sampleListings), 1);
  assert.equal(getActiveListingCountForCity('Raipur', sampleListings), 0);
  assert.equal(getActiveListingCountForCity('Bhubaneswar', sampleListings), 0);
});

test('validateAuthInput and validateProfileUpdateInput accept non-metro Indian cities and resolve aliases', () => {
  const jaipurSignup = validateAuthInput('signup', {
    fullName: 'Aarav Verma',
    email: 'aarav@example.in',
    phone: '9876543210',
    city: 'Jaipur',
    neighborhood: 'Malviya Nagar',
    password: 'securePassword123',
  });
  assert.equal(jaipurSignup.valid, true);

  const gurgaonSignup = validateAuthInput('signup', {
    fullName: 'Neha Kapoor',
    email: 'neha@example.in',
    phone: '9876543210',
    city: 'Gurgaon',
    neighborhood: 'DLF Cyber City',
    password: 'securePassword123',
  });
  assert.equal(gurgaonSignup.valid, true);

  const kochiProfile = validateProfileUpdateInput({
    name: 'Meera Nair',
    photoURL: '',
    city: 'Kochi',
    neighborhood: 'Kakkanad',
    phone: '9876543210',
    activeMode: 'renter',
  });
  assert.equal(kochiProfile.valid, true);
});




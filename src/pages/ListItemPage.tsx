import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react';
import {
  BorrowBoxUserProfile,
  CancellationPolicyType,
  CategoryName,
  IndianCity,
  ItemCondition,
  ProductListing,
} from '../types/marketplace';
import {
  ALL_CATEGORIES,
  ALL_CITIES,
  formatINR,
  validateListingInput,
} from '../utils/rentalLogic';
import {
  INDIA_STATES_AND_UTS,
  getStateForCity,
  getLocalitiesForCity,
} from '../data/indiaLocations';
import { PageRoute } from '../components/Navbar';
import { ProductImage } from '../components/ProductImage';

interface ListItemPageProps {
  demoUser: BorrowBoxUserProfile | null;
  editingListing?: ProductListing | null;
  onSaveListing: (
    listing: ProductListing,
    isEdit: boolean
  ) => Promise<void> | void;
  onCancelEdit?: () => void;
  onNavigate: (route: PageRoute) => void;
}

const DEFAULT_CATEGORY_IMAGE: Record<CategoryName, string> = {
  Photography: 'sony_camera',
  Gaming: 'ps5_console',
  Electronics: 'projector_4k',
  Tools: 'bosch_drill',
  Outdoor: 'camping_tent',
  'Musical Instruments': 'fender_guitar',
  Events: 'projector_4k',
  Education: 'bosch_drill',
};

interface AiPriceSuggestion {
  aiGenerated: boolean;
  isEstimateOnly: boolean;
  disclaimer: string;
  recommendedDailyINR: number;
  minDailyINR: number;
  maxDailyINR: number;
  suggestedDepositINR: number;
  rationale: string;
}

export const ListItemPage: React.FC<ListItemPageProps> = ({
  demoUser,
  editingListing = null,
  onSaveListing,
  onCancelEdit,
  onNavigate,
}) => {
  const [title, setTitle] = useState(editingListing?.title || '');
  const [category, setCategory] = useState<CategoryName | ''>(
    editingListing?.category || ''
  );
  const [dailyPriceINR, setDailyPriceINR] = useState(
    editingListing ? String(editingListing.dailyPriceINR) : '500'
  );
  const [refundableDepositINR, setRefundableDepositINR] = useState(
    editingListing ? String(editingListing.refundableDepositINR) : '3000'
  );
  const [replacementValueINR, setReplacementValueINR] = useState(
    editingListing?.replacementValueINR
      ? String(editingListing.replacementValueINR)
      : '25000'
  );
  const [condition, setCondition] = useState<ItemCondition>(
    editingListing?.condition || 'Excellent'
  );
  const [city, setCity] = useState<IndianCity | ''>(
    editingListing?.city || demoUser?.city || ''
  );
  const [selectedState, setSelectedState] = useState<string>(() => {
    const initCity = editingListing?.city || demoUser?.city || '';
    return initCity ? getStateForCity(initCity) || '' : '';
  });
  const [neighborhood, setNeighborhood] = useState(
    editingListing?.neighborhood || demoUser?.neighborhood || ''
  );

  const availableCities = React.useMemo(() => {
    if (!selectedState) return ALL_CITIES;
    const st = INDIA_STATES_AND_UTS.find((s) => s.name === selectedState);
    return st ? st.cities : ALL_CITIES;
  }, [selectedState]);

  const localitySuggestions = React.useMemo(() => {
    return city ? getLocalitiesForCity(city) : [];
  }, [city]);
  const [pickupLocation, setPickupLocation] = useState(
    editingListing?.pickupLocation || ''
  );
  const [description, setDescription] = useState(
    editingListing?.description || ''
  );
  const [includedItemsText, setIncludedItemsText] = useState(
    editingListing?.includedItems?.join(', ') ||
      'Main unit, charger/cables, protective carry case'
  );
  const [rentalRulesText, setRentalRulesText] = useState(
    editingListing?.rentalRules?.join('. ') ||
      'Original Government ID required at pickup. Return clean and on time.'
  );
  const [availableFrom, setAvailableFrom] = useState(
    editingListing?.availableFrom || '2026-10-29'
  );
  const [availableTo, setAvailableTo] = useState(
    editingListing?.availableTo || '2026-12-31'
  );
  const [minRentalDays, setMinRentalDays] = useState(
    editingListing ? String(editingListing.minRentalDays) : '1'
  );
  const [cancellationPolicy, setCancellationPolicy] =
    useState<CancellationPolicyType>(
      editingListing?.cancellationPolicy ||
        'Flexible (Full refund 24h prior)'
    );
  const [uploadedImageDataUrl, setUploadedImageDataUrl] = useState<string>(
    editingListing?.imageUrl || ''
  );
  const [ownerName, setOwnerName] = useState(
    editingListing?.owner.name || demoUser?.name || ''
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Phase 4 AI Assistant states
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [aiDescNotice, setAiDescNotice] = useState<string | null>(null);
  const [isEstimatingPrice, setIsEstimatingPrice] = useState(false);
  const [priceEstimate, setPriceEstimate] =
    useState<AiPriceSuggestion | null>(null);

  useEffect(() => {
    if (editingListing) {
      setTitle(editingListing.title);
      setCategory(editingListing.category);
      setDailyPriceINR(String(editingListing.dailyPriceINR));
      setRefundableDepositINR(String(editingListing.refundableDepositINR));
      setReplacementValueINR(
        String(
          editingListing.replacementValueINR ||
            editingListing.dailyPriceINR * 35
        )
      );
      setCondition(editingListing.condition);
      setCity(editingListing.city);
      setNeighborhood(editingListing.neighborhood);
      setPickupLocation(editingListing.pickupLocation);
      setDescription(editingListing.description);
      setAvailableFrom(editingListing.availableFrom);
      setAvailableTo(editingListing.availableTo);
      setMinRentalDays(String(editingListing.minRentalDays));
      setUploadedImageDataUrl(editingListing.imageUrl);
    }
  }, [editingListing]);

  const parsedDaily = Number(dailyPriceINR) || 0;
  const estimatedMonthlyEarnings = parsedDaily * 10;

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 720;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.78);
          setUploadedImageDataUrl(compressed);
        } else {
          setUploadedImageDataUrl(reader.result as string);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleAiDescriptionAssist = async () => {
    setAiDescNotice(null);
    if (!title.trim() || title.trim().length < 3) {
      setErrors((prev) => ({
        ...prev,
        title:
          'Enter a product title first so the AI assistant can draft a description.',
      }));
      return;
    }
    setIsGeneratingDesc(true);
    try {
      const res = await fetch('/api/ai/listing-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category: category || 'Electronics',
          condition,
          city: city || 'India',
          neighborhood: neighborhood.trim(),
          includedItems: includedItemsText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiDescNotice(data.error || 'Could not generate AI description.');
      } else {
        if (data.description) {
          setDescription(data.description);
        }
        if (data.suggestedRules) {
          setRentalRulesText(data.suggestedRules);
        }
        setAiDescNotice(data.notice || 'Description drafted.');
      }
    } catch {
      setAiDescNotice('Network error while contacting AI description service.');
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const handleAiPriceEstimate = async () => {
    setIsEstimatingPrice(true);
    try {
      const res = await fetch('/api/ai/price-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || category || 'Rental Gear',
          category: category || 'Electronics',
          condition,
          city: city || 'India',
          replacementValueINR: Number(replacementValueINR) || 25000,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPriceEstimate(data);
      }
    } catch {
      // Ignore network error
    } finally {
      setIsEstimatingPrice(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateListingInput({
      title,
      category,
      dailyPriceINR: Number(dailyPriceINR),
      refundableDepositINR: Number(refundableDepositINR),
      replacementValueINR: Number(replacementValueINR),
      condition,
      city,
      neighborhood,
      pickupLocation,
      description,
      includedItemsText,
      rentalRulesText,
      ownerName,
      availableFrom,
      availableTo,
      minRentalDays: Number(minRentalDays),
      cancellationPolicy,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    const validCategory = category as CategoryName;
    const validCity = city as IndianCity;
    const chosenImage =
      uploadedImageDataUrl.trim() ||
      DEFAULT_CATEGORY_IMAGE[validCategory] ||
      'sony_camera';

    const listingId = editingListing?.id || `bb-user-${Date.now()}`;

    const newListing: ProductListing = {
      id: listingId,
      title: title.trim(),
      category: validCategory,
      dailyPriceINR: Math.round(Number(dailyPriceINR)),
      refundableDepositINR: Math.round(Number(refundableDepositINR)),
      replacementValueINR: Math.max(
        500,
        Math.round(Number(replacementValueINR) || Number(dailyPriceINR) * 35)
      ),
      condition,
      city: validCity,
      neighborhood: neighborhood.trim(),
      pickupLocation: pickupLocation.trim(),
      description: description.trim(),
      specifications: [
        `Category: ${validCategory}`,
        `Condition: ${condition}`,
        `Approx. Area: ${neighborhood.trim()}, ${validCity}`,
      ],
      includedItems: includedItemsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      rentalRules: rentalRulesText
        .split('.')
        .map((s) => s.trim())
        .filter(Boolean),
      availableFrom: availableFrom || '2026-10-29',
      availableTo: availableTo || '2026-12-31',
      minRentalDays: Math.max(1, Math.min(60, Number(minRentalDays) || 1)),
      featured: true,
      isDemoData: false,
      status: editingListing?.status || 'active',
      cancellationPolicy,
      imageUrl: chosenImage,
      gallery: [
        {
          id: `${listingId}-g1`,
          label: 'Primary Product View',
          caption: title.trim(),
          imageUrl: chosenImage,
          viewMode: 'full',
        },
      ],
      owner: {
        id: demoUser?.uid || editingListing?.owner.id || `owner-${Date.now()}`,
        name: ownerName.trim(),
        neighborhood: neighborhood.trim(),
        city: validCity,
        rating: editingListing?.owner.rating || 0,
        completedRentals: editingListing?.owner.completedRentals || 0,
        responseTime: 'New community listing',
        memberSince: '2026',
        kycVerified: false,
      },
    };

    setIsSaving(true);
    try {
      await onSaveListing(newListing, Boolean(editingListing));
      onNavigate({ page: 'details', itemId: newListing.id });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSaving(false);
    }
  };

  const previewImageKey =
    uploadedImageDataUrl.trim() ||
    (category ? DEFAULT_CATEGORY_IMAGE[category] : 'sony_camera');

  return (
    <div className="bg-transparent min-h-screen py-10 lg:py-12 text-[#F8FAFC]">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6">
        <button
          type="button"
          onClick={() => {
            if (editingListing && onCancelEdit) {
              onCancelEdit();
            } else {
              onNavigate({ page: 'browse' });
            }
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#94A3B8] hover:text-[#8B5CF6] mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {editingListing ? 'Back to Dashboard' : 'Back to Marketplace'}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#F8FAFC] tracking-tight mb-2">
              {editingListing
                ? `Edit Listing: ${editingListing.title}`
                : 'List an Unused Item & Earn in ₹'}
            </h1>
            <p className="text-sm text-[#94A3B8] mb-8">
              Publish a real community rental listing stored in Firestore. Use
              the optional AI tools to draft descriptions or estimate daily ₹
              pricing.
            </p>

            <form
              onSubmit={(e) => void handleSubmit(e)}
              noValidate
              className="space-y-6 border border-white/[0.08] rounded-2xl p-6 sm:p-8 bg-[#161E2E] shadow-2xl"
            >
              {/* Product Title */}
              <div>
                <label
                  htmlFor="list-title"
                  className="block text-xs font-semibold text-[#F8FAFC] mb-1.5"
                >
                  Product Name & Model *
                </label>
                <input
                  id="list-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., DJI RS 3 Mini Gimbal Stabilizer or Bosch High-Pressure Washer"
                  className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
                />
                {errors.title && (
                  <p className="text-xs text-[#EF4444] mt-1">{errors.title}</p>
                )}
              </div>

              {/* Category, Condition & Replacement Value */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="list-category"
                    className="block text-xs font-semibold text-[#F8FAFC] mb-1.5"
                  >
                    Category *
                  </label>
                  <select
                    id="list-category"
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as CategoryName | '')
                    }
                    className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="">Select Category</option>
                    {ALL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-xs text-[#EF4444] mt-1">
                      {errors.category}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="list-condition"
                    className="block text-xs font-semibold text-[#F8FAFC] mb-1.5"
                  >
                    Item Condition *
                  </label>
                  <select
                    id="list-condition"
                    value={condition}
                    onChange={(e) =>
                      setCondition(e.target.value as ItemCondition)
                    }
                    className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="Like New">Like New</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="list-retail-value"
                    className="block text-xs font-semibold text-[#F8FAFC] mb-1.5"
                  >
                    Approx. Retail Price (₹)
                  </label>
                  <input
                    id="list-retail-value"
                    type="number"
                    min={500}
                    step={500}
                    value={replacementValueINR}
                    onChange={(e) => setReplacementValueINR(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-sm font-mono-tabular text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              {/* Daily Price & Refundable Deposit in INR + AI Price Estimator Button */}
              <div className="space-y-3 p-4 rounded-xl bg-[#111827] border border-white/[0.08]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#F8FAFC]">
                    Rental Pricing & Security Deposit (₹)
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleAiPriceEstimate()}
                    disabled={isEstimatingPrice}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 text-[#A78BFA] border border-[#8B5CF6]/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {isEstimatingPrice ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    Get AI Price Estimate (₹)
                  </button>
                </div>

                {priceEstimate && (
                  <div className="p-3.5 rounded-lg bg-[#161E2E] border border-[#8B5CF6]/30 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-[#06B6D4]">
                        Suggested Estimate:{' '}
                        <span className="font-mono-tabular text-[#F8FAFC]">
                          {formatINR(priceEstimate.recommendedDailyINR)}/day
                        </span>{' '}
                        (Range: {formatINR(priceEstimate.minDailyINR)} –{' '}
                        {formatINR(priceEstimate.maxDailyINR)}/day · Deposit:{' '}
                        {formatINR(priceEstimate.suggestedDepositINR)})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setDailyPriceINR(
                            String(priceEstimate.recommendedDailyINR)
                          );
                          setRefundableDepositINR(
                            String(priceEstimate.suggestedDepositINR)
                          );
                        }}
                        className="px-2.5 py-1 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded cursor-pointer"
                      >
                        Apply Estimate
                      </button>
                    </div>
                    <p className="text-[#94A3B8] leading-relaxed">
                      {priceEstimate.rationale}
                    </p>
                    <p className="text-[11px] text-[#94A3B8] italic">
                      {priceEstimate.disclaimer}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label
                      htmlFor="list-daily-price"
                      className="block text-xs font-semibold text-[#F8FAFC] mb-1.5"
                    >
                      Daily Rental Price (₹ / day) *
                    </label>
                    <input
                      id="list-daily-price"
                      type="number"
                      min={50}
                      step={50}
                      value={dailyPriceINR}
                      onChange={(e) => setDailyPriceINR(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#161E2E] border border-white/[0.08] rounded-xl text-sm font-mono-tabular text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                    />
                    {errors.dailyPriceINR && (
                      <p className="text-xs text-[#EF4444] mt-1">
                        {errors.dailyPriceINR}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="list-deposit"
                      className="block text-xs font-semibold text-[#F8FAFC] mb-1.5"
                    >
                      Refundable Security Deposit (₹) *
                    </label>
                    <input
                      id="list-deposit"
                      type="number"
                      min={0}
                      step={500}
                      value={refundableDepositINR}
                      onChange={(e) => setRefundableDepositINR(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#161E2E] border border-white/[0.08] rounded-xl text-sm font-mono-tabular text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                    />
                    {errors.refundableDepositINR && (
                      <p className="text-xs text-[#EF4444] mt-1">
                        {errors.refundableDepositINR}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Date Availability Window & Cancellation Policy */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="list-avail-from"
                    className="block text-xs font-semibold text-[#F8FAFC] mb-1.5"
                  >
                    Available From *
                  </label>
                  <input
                    id="list-avail-from"
                    type="date"
                    value={availableFrom}
                    onChange={(e) => setAvailableFrom(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-xs font-mono-tabular text-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="list-avail-to"
                    className="block text-xs font-semibold text-[#F8FAFC] mb-1.5"
                  >
                    Available Until *
                  </label>
                  <input
                    id="list-avail-to"
                    type="date"
                    value={availableTo}
                    min={availableFrom}
                    onChange={(e) => setAvailableTo(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-xs font-mono-tabular text-[#F8FAFC]"
                  />
                  {errors.availableTo && (
                    <p className="text-xs text-[#EF4444] mt-1">
                      {errors.availableTo}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="list-min-days"
                    className="block text-xs font-semibold text-[#F8FAFC] mb-1.5"
                  >
                    Min Rental Days
                  </label>
                  <input
                    id="list-min-days"
                    type="number"
                    min={1}
                    max={30}
                    value={minRentalDays}
                    onChange={(e) => setMinRentalDays(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-sm font-mono-tabular text-[#F8FAFC]"
                  />
                </div>
              </div>

              {/* India-Wide Dynamic Location Hierarchy: State -> City -> Locality */}
              <div className="space-y-3 p-4 rounded-xl bg-[#111827] border border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#F8FAFC]">
                    Listing Location (Pan-India)
                  </span>
                  <span className="text-[11px] text-[#06B6D4]">
                    Available across all 28 states & 8 UTs
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="list-state"
                      className="block text-xs font-medium text-[#94A3B8] mb-1"
                    >
                      State / Union Territory
                    </label>
                    <select
                      id="list-state"
                      value={selectedState}
                      onChange={(e) => {
                        const nextState = e.target.value;
                        setSelectedState(nextState);
                        if (nextState) {
                          const stateObj = INDIA_STATES_AND_UTS.find(
                            (s) => s.name === nextState
                          );
                          if (stateObj && !stateObj.cities.includes(city)) {
                            setCity('');
                          }
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#161E2E] border border-white/[0.08] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                    >
                      <option value="">All States & UTs (or select State)</option>
                      {INDIA_STATES_AND_UTS.map((st) => (
                        <option key={st.name} value={st.name}>
                          {st.name} ({st.type === 'ut' ? 'UT' : 'State'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="list-city"
                      className="block text-xs font-semibold text-[#F8FAFC] mb-1"
                    >
                      City *
                    </label>
                    <select
                      id="list-city"
                      value={city}
                      onChange={(e) => {
                        const nextCity = e.target.value as IndianCity | '';
                        setCity(nextCity);
                        if (nextCity) {
                          const parentState = getStateForCity(nextCity);
                          if (parentState) setSelectedState(parentState);
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#161E2E] border border-white/[0.08] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                    >
                      <option value="">Select City</option>
                      {availableCities.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {errors.city && (
                      <p className="text-xs text-[#EF4444] mt-1">{errors.city}</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="list-neighborhood"
                      className="block text-xs font-semibold text-[#F8FAFC]"
                    >
                      Neighborhood / Locality *
                    </label>
                    {localitySuggestions.length > 0 && (
                      <span className="text-[11px] text-[#94A3B8]">
                        Click a common hub or type any locality
                      </span>
                    )}
                  </div>
                  <input
                    id="list-neighborhood"
                    list="list-locality-options"
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder={
                      city
                        ? `e.g. Locality in ${city}`
                        : 'e.g., Koramangala, Bandra West, Connaught Place'
                    }
                    className="w-full px-3.5 py-2.5 bg-[#161E2E] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
                  />
                  <datalist id="list-locality-options">
                    {localitySuggestions.map((loc) => (
                      <option key={loc} value={loc} />
                    ))}
                  </datalist>

                  {localitySuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {localitySuggestions.slice(0, 6).map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setNeighborhood(loc)}
                          className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                            neighborhood === loc
                              ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                              : 'bg-[#161E2E] text-[#94A3B8] border-white/[0.08] hover:text-[#F8FAFC]'
                          }`}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  )}

                  {errors.neighborhood && (
                    <p className="text-xs text-[#EF4444] mt-1">
                      {errors.neighborhood}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="list-pickup"
                    className="block text-xs font-semibold text-[#F8FAFC] mb-1.5"
                  >
                    Approximate Pickup Area / Landmark *
                  </label>
                  <input
                    id="list-pickup"
                    type="text"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    placeholder="e.g., Approx. 80 Feet Road, Koramangala"
                    className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
                  />
                  {errors.pickupLocation && (
                    <p className="text-xs text-[#EF4444] mt-1">
                      {errors.pickupLocation}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="list-cancellation"
                    className="block text-xs font-semibold text-[#F8FAFC] mb-1.5"
                  >
                    Cancellation Policy
                  </label>
                  <select
                    id="list-cancellation"
                    value={cancellationPolicy}
                    onChange={(e) =>
                      setCancellationPolicy(
                        e.target.value as CancellationPolicyType
                      )
                    }
                    className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="Flexible (Full refund 24h prior)">
                      Flexible (Full refund 24h prior)
                    </option>
                    <option value="Moderate (50% refund 24h prior)">
                      Moderate (50% refund 24h prior)
                    </option>
                    <option value="Strict (Non-refundable once accepted)">
                      Strict (Non-refundable once accepted)
                    </option>
                  </select>
                </div>
              </div>

              {/* Image Upload */}
              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#111827] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-[#F8FAFC]">
                      Product Photo Upload
                    </p>
                    <p className="text-xs text-[#94A3B8]">
                      Upload a photo of your item (auto-compressed) or use the
                      category studio photo.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1D293B] hover:bg-[#334155] text-[#F8FAFC] border border-white/[0.1] rounded-lg text-xs font-semibold cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                {uploadedImageDataUrl && (
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-14 rounded overflow-hidden border border-white/[0.08] bg-[#161E2E] shrink-0">
                      <ProductImage
                        srcKeyOrUrl={previewImageKey}
                        alt="Listing preview"
                        className="w-full h-full"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadedImageDataUrl('')}
                      className="text-xs text-[#8B5CF6] underline hover:text-[#A78BFA] cursor-pointer"
                    >
                      Reset to Category Studio Photo
                    </button>
                  </div>
                )}
              </div>

              {/* Description + Phase 4 AI Description Assistant */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label
                    htmlFor="list-description"
                    className="block text-xs font-semibold text-[#F8FAFC]"
                  >
                    Product Description & Condition Details *
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleAiDescriptionAssist()}
                    disabled={isGeneratingDesc}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 text-[#A78BFA] border border-[#8B5CF6]/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {isGeneratingDesc ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="w-3.5 h-3.5" />
                    )}
                    Draft Description with AI
                  </button>
                </div>
                <textarea
                  id="list-description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe how well the item works, what projects it is suited for, and any care instructions..."
                  className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
                />
                {aiDescNotice && (
                  <p className="text-xs text-[#06B6D4] mt-1">{aiDescNotice}</p>
                )}
                {errors.description && (
                  <p className="text-xs text-[#EF4444] mt-1">
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Included Accessories & Owner Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="list-included"
                    className="block text-xs font-semibold text-[#F8FAFC] mb-1.5"
                  >
                    Included Accessories (Comma-separated)
                  </label>
                  <input
                    id="list-included"
                    type="text"
                    value={includedItemsText}
                    onChange={(e) => setIncludedItemsText(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="list-owner-name"
                    className="block text-xs font-semibold text-[#F8FAFC] mb-1.5"
                  >
                    Your Name (Displayed as Owner) *
                  </label>
                  <input
                    id="list-owner-name"
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g., Siddharth Verma"
                    className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
                  />
                  {errors.ownerName && (
                    <p className="text-xs text-[#EF4444] mt-1">
                      {errors.ownerName}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (editingListing && onCancelEdit) {
                      onCancelEdit();
                    } else {
                      onNavigate({ page: 'browse' });
                    }
                  }}
                  className="px-4 py-2.5 text-sm font-semibold text-[#F8FAFC] bg-[#1D293B] border border-white/[0.08] rounded-xl hover:bg-[#334155] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-xl transition-all bb-glow-button cursor-pointer"
                >
                  {isSaving
                    ? 'Saving Listing...'
                    : editingListing
                    ? 'Save Listing Changes'
                    : 'Publish Rental Listing'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Owner Earnings Calculator */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#161E2E] space-y-4 shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#06B6D4]">
                Owner Earnings Estimator
              </p>
              <div>
                <p className="text-xs text-[#94A3B8]">
                  If rented 10 days per month at {formatINR(parsedDaily)}/day:
                </p>
                <p className="text-3xl font-bold text-[#F8FAFC] font-mono-tabular mt-1">
                  {formatINR(estimatedMonthlyEarnings)}{' '}
                  <span className="text-sm font-normal text-[#94A3B8]">
                    / month
                  </span>
                </p>
              </div>
              <ul className="space-y-2.5 text-xs text-[#94A3B8] pt-3 border-t border-white/[0.08]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                  <span>
                    Saved to Cloud Firestore under your authenticated owner
                    account.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#8B5CF6] shrink-0 mt-0.5" />
                  <span>
                    Protected by your{' '}
                    {formatINR(Number(refundableDepositINR) || 0)} refundable
                    security deposit and QR handover code.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#06B6D4] shrink-0 mt-0.5" />
                  <span>
                    You can edit or archive this listing anytime from your
                    Lender Dashboard.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

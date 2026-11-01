import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { resolveProductImage } from '../assets/imageRegistry';

interface ProductImageProps {
  srcKeyOrUrl: string;
  alt: string;
  className?: string;
  viewMode?: 'full' | 'closeup' | 'accessories';
}

const ProductImageComponent: React.FC<ProductImageProps> = ({
  srcKeyOrUrl,
  alt,
  className = '',
  viewMode = 'full',
}) => {
  const [hasError, setHasError] = useState(false);
  const resolvedSrc = resolveProductImage(srcKeyOrUrl);

  const scaleTransform =
    viewMode === 'closeup'
      ? 'scale-125 origin-center'
      : viewMode === 'accessories'
      ? 'scale-110 origin-bottom-right'
      : 'scale-100';

  if (hasError || !resolvedSrc) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#1D293B] text-[#94A3B8] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Package className="w-8 h-8 text-[#8B5CF6] mb-2 stroke-[1.5]" />
        <span className="text-xs font-medium text-[#F8FAFC] line-clamp-2 max-w-[20ch]">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden bg-[#1D293B] relative ${className}`}>
      <img
        src={resolvedSrc}
        alt={alt}
        width={640}
        height={480}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-transform duration-200 ease-out ${scaleTransform}`}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B0F19]/40 via-transparent to-transparent" />
    </div>
  );
};

export const ProductImage = React.memo(ProductImageComponent);

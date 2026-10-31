import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { resolveProductImage } from '../assets/imageRegistry';

interface ProductImageProps {
  srcKeyOrUrl: string;
  alt: string;
  className?: string;
  viewMode?: 'full' | 'closeup' | 'accessories';
}

export const ProductImage: React.FC<ProductImageProps> = ({
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
        className={`flex flex-col items-center justify-center bg-slate-100 text-slate-500 p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Package className="w-8 h-8 text-slate-400 mb-2 stroke-[1.5]" />
        <span className="text-xs font-medium text-slate-600 line-clamp-2 max-w-[20ch]">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden bg-slate-100 relative ${className}`}>
      <img
        src={resolvedSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-transform duration-200 ${scaleTransform}`}
      />
    </div>
  );
};

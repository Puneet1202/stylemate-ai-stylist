import React from 'react';
import { OutfitCardData, ClothingItem } from '../types';
import { Heart, ExternalLink } from 'lucide-react';

interface OutfitCardProps {
  data: OutfitCardData;
  wardrobe: ClothingItem[];
  isFavorite: boolean;
  onToggleFavorite: (outfit: OutfitCardData) => void;
}

const placeholderImage = (query = 'clothing') =>
  `https://source.unsplash.com/featured/?${encodeURIComponent(query)}`;

const OutfitCard: React.FC<OutfitCardProps> = ({ data, wardrobe, isFavorite, onToggleFavorite }) => {
  // Defensive: ensure selectedItemIds exists
  const selectedIds = Array.isArray(data.selectedItemIds) ? data.selectedItemIds : [];
  const selectedItems = wardrobe.filter((item) => selectedIds.includes(item.id));

  // missingItems per your types: MissingItem[]
  const missingItems = Array.isArray(data.missingItems) ? data.missingItems : [];

  // pinterestLooks per your types: PinterestLook[]
  const pinterestLooks = Array.isArray(data.pinterestLooks) ? data.pinterestLooks : [];

  // Short reasoning
  const shortReasoning = data.reasoning
    ? data.reasoning.split('\n').slice(0, 2).join(' ').slice(0, 220)
    : '';

  // Nothing to show?
  if (selectedItems.length === 0 && missingItems.length === 0 && pinterestLooks.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm animate-fade-in mt-2 w-full max-w-sm">
      <div className="relative bg-stone-50 px-4 py-2 border-b border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wide">From your wardrobe</h4>
        </div>

        <button
          aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
          onClick={() => onToggleFavorite(data)}
          className="p-1 rounded-md hover:bg-stone-100 transition"
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'text-red-500' : 'text-stone-400'}`} />
        </button>
      </div>

      <div className="p-3">
        {/* Selected items grid */}
        {selectedItems.length > 0 && (
          <div>
            <div className="grid grid-cols-2 gap-3">
              {selectedItems.map((item) => (
                <div key={item.id} className="flex flex-col gap-1.5 group">
                  <div className="aspect-square bg-stone-50 rounded-lg overflow-hidden border border-stone-100 relative">
                    <img
                      src={item.image || placeholderImage(`${item.color} ${item.category}`)}
                      alt={`${item.color} ${item.category}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = placeholderImage(item.category || 'clothing');
                      }}
                    />
                  </div>
                  <div className="text-center px-1">
                    <p className="text-[10px] font-semibold text-stone-800 capitalize truncate leading-tight">
                      {item.color} {item.category}
                    </p>
                    {item.style && item.style.length > 0 && (
                      <p className="text-[9px] text-stone-500 mt-0.5 truncate">{item.style.join(', ')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missing items (if any) */}
        {missingItems.length > 0 && (
          <div className="py-2 mt-3">
            <div className="text-sm font-medium text-stone-700">Need to buy:</div>
            <ul className="mt-2 text-xs text-stone-600 list-disc list-inside">
              {missingItems.map((m, i) => (
                <li key={m.id || i} className="truncate">
                  {m.name}
                </li>
              ))}
            </ul>

            {/* Shopping options for first missing item (if any) — keeps UI compact */}
            {missingItems[0]?.shoppingOptions && missingItems[0].shoppingOptions.length > 0 && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {missingItems[0].shoppingOptions.map((opt, idx) => (
                  <a
                    key={idx}
                    href={opt.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-sm rounded-md bg-stone-900 text-white hover:bg-stone-700"
                  >
                    Buy on {opt.storeName}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reasoning / short description */}
        {shortReasoning && (
          <div className="mt-3 text-xs text-stone-600">
            {shortReasoning}
            {data.reasoning && data.reasoning.length > shortReasoning.length && '…'}
          </div>
        )}

        {/* Pinterest thumbnails */}
        {pinterestLooks.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-stone-500 mb-2">Inspiration</div>
            <div className="grid grid-cols-3 gap-2">
              {pinterestLooks.slice(0, 6).map((p, idx) => {
                const imgUrl = (p as any).previewImageUrl || (p as any).imageUrl || '';
                const link = (p as any).pinterestUrl || (p as any).link || '#';
                return (
                  <a
                    key={idx}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-md overflow-hidden"
                    title={p.title || 'View on Pinterest'}
                  >
                    <img
                      src={imgUrl || placeholderImage(p.title || 'style')}
                      alt={p.title || 'Pinterest look'}
                      className="w-full h-20 object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = placeholderImage('style');
                      }}
                    />
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        {data.selectedItemIds && data.selectedItemIds.length > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-stone-500">{selectedItems.length} item(s) selected</div>
            <a
              className="text-xs inline-flex items-center gap-1 text-stone-600 hover:text-stone-800"
              href="#"
              onClick={(e) => {
                e.preventDefault();
              }}
            >
              View details <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutfitCard;

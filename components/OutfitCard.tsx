
import React from 'react';
import { OutfitCardData, ClothingItem } from '../types';

interface OutfitCardProps {
  data: OutfitCardData;
  wardrobe: ClothingItem[];
  isFavorite: boolean;
  onToggleFavorite: (outfit: OutfitCardData) => void;
}

const OutfitCard: React.FC<OutfitCardProps> = ({ data, wardrobe }) => {
  // Filter items that match the selectedItemIds
  const selectedItems = wardrobe.filter(item => data.selectedItemIds.includes(item.id));

  if (selectedItems.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm animate-fade-in mt-2 w-full max-w-sm">
      <div className="bg-stone-50 px-4 py-2 border-b border-stone-100">
        <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wide flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          From your wardrobe
        </h4>
      </div>
      
      <div className="p-3">
        <div className="grid grid-cols-2 gap-3">
          {selectedItems.map(item => (
            <div key={item.id} className="flex flex-col gap-1.5 group">
              <div className="aspect-square bg-stone-50 rounded-lg overflow-hidden border border-stone-100 relative">
                <img 
                  src={item.image} 
                  alt={item.category} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                />
              </div>
              <div className="text-center px-1">
                 <p className="text-[10px] font-semibold text-stone-800 capitalize truncate leading-tight">
                    {item.color} {item.category}
                 </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OutfitCard;

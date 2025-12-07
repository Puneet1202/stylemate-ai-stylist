import React, { useState } from 'react';
import { ClothingItem, OutfitSuggestion } from '../types';
import { generateOutfit, generateOutfitVisualization } from '../services/geminiService';
import { Sparkles, ArrowRight, ShoppingBag, RotateCw, Loader2 } from 'lucide-react';

interface OutfitGeneratorProps {
  wardrobe: ClothingItem[];
  onFindMissingItems: (query: string) => void;
}

const OutfitGenerator: React.FC<OutfitGeneratorProps> = ({ wardrobe, onFindMissingItems }) => {
  const [occasion, setOccasion] = useState('');
  const [notes, setNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestion, setSuggestion] = useState<OutfitSuggestion | null>(null);
  const [visualizedImage, setVisualizedImage] = useState<string | null>(null);
  const [isVisualizing, setIsVisualizing] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!occasion.trim() || wardrobe.length === 0) return;

    setIsGenerating(true);
    setSuggestion(null);
    setVisualizedImage(null);

    try {
      const result = await generateOutfit(wardrobe, occasion, notes);
      setSuggestion(result);
      
      // Auto-trigger visualization
      setIsVisualizing(true);
      const image = await generateOutfitVisualization(result.description);
      setVisualizedImage(image);
    } catch (error) {
      alert("Failed to generate outfit. Please try again.");
    } finally {
      setIsGenerating(false);
      setIsVisualizing(false);
    }
  };

  const getSelectedItems = () => {
    if (!suggestion) return [];
    return wardrobe.filter(item => suggestion.selectedItemIds.includes(item.id));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-stone-800">Style Assistant</h2>
        <p className="text-stone-500">Tell me where you're going, and I'll create the perfect look from your closet.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Form */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Occasion</label>
                <input
                  type="text"
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  placeholder="e.g., Date Night, Office, Brunch..."
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-500 focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Style Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., I want to wear my blue jeans, it's cold outside..."
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-500 focus:border-transparent outline-none transition-all h-24 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={isGenerating || wardrobe.length === 0}
                className="w-full bg-stone-900 text-white py-3.5 rounded-xl font-medium hover:bg-stone-800 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <RotateCw className="w-5 h-5 animate-spin" />
                    Styling...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Outfit
                  </>
                )}
              </button>
              {wardrobe.length === 0 && (
                <p className="text-xs text-red-500 text-center">Add items to your wardrobe first!</p>
              )}
            </form>
          </div>

          {/* Missing Items Suggestion */}
          {suggestion && suggestion.missingItems.length > 0 && (
            <div className="bg-gradient-to-br from-rose-50 to-orange-50 p-6 rounded-2xl border border-rose-100">
              <h3 className="font-semibold text-rose-900 mb-3 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Completes the Look
              </h3>
              <ul className="space-y-2 mb-4">
                {suggestion.missingItems.map((item, idx) => (
                  <li key={idx} className="text-sm text-rose-800 flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => onFindMissingItems(suggestion.missingItems.join(", "))}
                className="w-full bg-white text-rose-600 border border-rose-200 py-2 rounded-lg text-sm font-medium hover:bg-rose-50 transition-colors"
              >
                Find these items
              </button>
            </div>
          )}
        </div>

        {/* Results Display */}
        <div className="lg:col-span-8">
          {!suggestion ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 text-stone-400">
              <Sparkles className="w-16 h-16 mb-4 opacity-20" />
              <p>Your AI stylist is waiting...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Generated Visual */}
              <div className="relative w-full aspect-video md:aspect-[2/1] bg-stone-900 rounded-2xl overflow-hidden shadow-lg group">
                {isVisualizing && !visualizedImage ? (
                  <div className="absolute inset-0 flex items-center justify-center text-white/70">
                    <div className="text-center">
                       <Loader2 className="w-10 h-10 animate-spin mx-auto mb-2" />
                       <p className="text-sm font-light tracking-wide">Sketching your look...</p>
                    </div>
                  </div>
                ) : visualizedImage ? (
                  <img src={visualizedImage} alt="AI Generated Look" className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white/50">
                    <p>Visualization unavailable</p>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-20">
                  <h3 className="text-2xl font-bold text-white mb-1">{suggestion.outfitName}</h3>
                  <p className="text-white/80 line-clamp-2">{suggestion.reasoning}</p>
                </div>
              </div>

              {/* Selected Items Grid */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
                <h4 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-4">Selected From Wardrobe</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {getSelectedItems().map((item) => (
                    <div key={item.id} className="group relative aspect-square bg-stone-50 rounded-xl overflow-hidden border border-stone-100">
                       <img src={item.image} alt={item.category} className="w-full h-full object-cover" />
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                          {item.category}
                       </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                <h4 className="font-semibold text-stone-800 mb-2">Styling Advice</h4>
                <p className="text-stone-600 leading-relaxed">{suggestion.description}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OutfitGenerator;
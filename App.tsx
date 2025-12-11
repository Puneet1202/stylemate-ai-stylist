
import React, { useState, useEffect } from 'react';
import Wardrobe from './components/Wardrobe';
import StylistChat from './components/StylistChat';
import Shopping from './components/Shopping';
import OutfitCard from './components/OutfitCard';
import { AppTab, ClothingItem, OutfitCardData } from './types';
import { Shirt, Sparkles, ShoppingBag, Menu, X, Heart } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.WARDROBE);
  
  // WARDROBE STATE
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>(() => {
    try {
      const savedItems = localStorage.getItem("styleMate_wardrobe_v1");
      if (!savedItems) return [];
      const parsed = JSON.parse(savedItems);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item: any) => ({
        ...item,
        id: item.id || crypto.randomUUID(),
        category: item.category || "Unknown",
        color: item.color || "Unknown",
        image: item.image || "",
        season: Array.isArray(item.season) ? item.season : [],
        style: Array.isArray(item.style) ? item.style : [],
        description: item.description || ""
      }));
    } catch { return []; }
  });

  // FAVORITES STATE
  const [favorites, setFavorites] = useState<OutfitCardData[]>(() => {
    try {
      const saved = localStorage.getItem("styleMate_favorites_v1");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [shoppingQuery, setShoppingQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem("styleMate_wardrobe_v1", JSON.stringify(wardrobe));
  }, [wardrobe]);

  useEffect(() => {
    localStorage.setItem("styleMate_favorites_v1", JSON.stringify(favorites));
  }, [favorites]);

  // Handlers
  const handleAddItem = (item: ClothingItem) => setWardrobe(prev => [item, ...prev]);
  const handleRemoveItem = (id: string) => setWardrobe(prev => prev.filter(item => item.id !== id));
  
  const handleToggleFavorite = (outfit: OutfitCardData) => {
    setFavorites(prev => {
      if (prev.some(f => f.id === outfit.id)) {
        return prev.filter(f => f.id !== outfit.id);
      }
      return [outfit, ...prev];
    });
  };

  const NavButton = ({ tab, icon: Icon, label }: { tab: AppTab; icon: any; label: string }) => (
    <button
      onClick={() => { setActiveTab(tab); setIsMobileMenuOpen(false); }}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-medium text-sm ${
        activeTab === tab
          ? 'bg-stone-900 text-white shadow-lg'
          : 'text-stone-500 hover:bg-stone-200 hover:text-stone-900'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-stone-900 selection:bg-stone-200 font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex justify-between items-center h-16 md:h-20">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab(AppTab.WARDROBE)}>
              <div className="w-9 h-9 bg-stone-900 rounded-xl flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-lg md:text-xl font-bold tracking-tight text-stone-900">AI Style Mate</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              <NavButton tab={AppTab.WARDROBE} icon={Shirt} label="Wardrobe" />
              <NavButton tab={AppTab.STYLIST} icon={Sparkles} label="Stylist" />
              <NavButton tab={AppTab.FAVORITES} icon={Heart} label="Favorites" />
              <NavButton tab={AppTab.SHOPPING} icon={ShoppingBag} label="Shop" />
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-stone-600 rounded-lg hover:bg-stone-100"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-stone-100 p-4 flex flex-col gap-2 shadow-xl animate-fade-in-down">
             <NavButton tab={AppTab.WARDROBE} icon={Shirt} label="Wardrobe" />
             <NavButton tab={AppTab.STYLIST} icon={Sparkles} label="Stylist" />
             <NavButton tab={AppTab.FAVORITES} icon={Heart} label="Favorites" />
             <NavButton tab={AppTab.SHOPPING} icon={ShoppingBag} label="Shop" />
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4 md:px-6 max-w-7xl mx-auto min-h-screen">
        {activeTab === AppTab.WARDROBE && (
          <Wardrobe
            items={wardrobe}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
          />
        )}
        
        {activeTab === AppTab.STYLIST && (
          <StylistChat
            wardrobe={wardrobe}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {activeTab === AppTab.FAVORITES && (
           <div className="max-w-4xl mx-auto animate-fade-in">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-stone-800">Your Favorite Looks</h2>
                <p className="text-stone-500">Saved outfits and shopping inspiration.</p>
              </div>
              {favorites.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-stone-100">
                  <Heart className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                  <p className="text-stone-400">No favorites yet. Chat with the stylist to save looks!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {favorites.map(fav => (
                    <OutfitCard 
                      key={fav.id} 
                      data={fav} 
                      wardrobe={wardrobe} 
                      isFavorite={true}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              )}
           </div>
        )}

        {activeTab === AppTab.SHOPPING && (
          <Shopping initialQuery={shoppingQuery} />
        )}
      </main>
    </div>
  );
};

export default App;

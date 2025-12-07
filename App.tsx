import React, { useState, useEffect } from 'react';
import Wardrobe from './components/Wardrobe';
import OutfitGenerator from './components/OutfitGenerator';
import Shopping from './components/Shopping';
import { AppTab, ClothingItem } from './types';
import { Shirt, Sparkles, ShoppingBag, Menu, X } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.WARDROBE);
  
  // Initialize wardrobe from localStorage
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>(() => {
    try {
      const savedItems = localStorage.getItem("styleMate_wardrobe_v1");
      return savedItems ? JSON.parse(savedItems) : [];
    } catch (error) {
      console.error("Failed to load wardrobe from local storage:", error);
      return [];
    }
  });
  
  const [shoppingQuery, setShoppingQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Persist wardrobe to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("styleMate_wardrobe_v1", JSON.stringify(wardrobe));
    } catch (error) {
      console.error("Failed to save wardrobe to local storage:", error);
    }
  }, [wardrobe]);

  const handleAddItem = (item: ClothingItem) => {
    setWardrobe((prev) => [item, ...prev]);
  };

  const handleRemoveItem = (id: string) => {
    setWardrobe((prev) => prev.filter((item) => item.id !== id));
  };

  const handleFindMissingItems = (query: string) => {
    setShoppingQuery(query);
    setActiveTab(AppTab.SHOPPING);
  };

  const NavButton = ({ tab, icon: Icon, label }: { tab: AppTab; icon: any; label: string }) => (
    <button
      onClick={() => {
        setActiveTab(tab);
        setIsMobileMenuOpen(false);
      }}
      className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-medium ${
        activeTab === tab
          ? 'bg-stone-900 text-white shadow-lg scale-105'
          : 'text-stone-500 hover:bg-stone-200 hover:text-stone-900'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-stone-900 selection:bg-stone-200">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab(AppTab.WARDROBE)}>
              <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center text-white">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-xl font-bold tracking-tight text-stone-900">AI Style Mate</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-2">
              <NavButton tab={AppTab.WARDROBE} icon={Shirt} label="Wardrobe" />
              <NavButton tab={AppTab.OUTFIT_GENERATOR} icon={Sparkles} label="Stylist" />
              <NavButton tab={AppTab.SHOPPING} icon={ShoppingBag} label="Shop" />
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-stone-600"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-stone-100 p-4 flex flex-col gap-2 shadow-xl animate-fade-in-down">
             <NavButton tab={AppTab.WARDROBE} icon={Shirt} label="Wardrobe" />
             <NavButton tab={AppTab.OUTFIT_GENERATOR} icon={Sparkles} label="Stylist" />
             <NavButton tab={AppTab.SHOPPING} icon={ShoppingBag} label="Shop" />
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="pt-28 pb-12 px-4 md:px-6 max-w-7xl mx-auto min-h-screen">
        {activeTab === AppTab.WARDROBE && (
          <Wardrobe
            items={wardrobe}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
          />
        )}
        
        {activeTab === AppTab.OUTFIT_GENERATOR && (
          <OutfitGenerator
            wardrobe={wardrobe}
            onFindMissingItems={handleFindMissingItems}
          />
        )}

        {activeTab === AppTab.SHOPPING && (
          <Shopping initialQuery={shoppingQuery} />
        )}
      </main>
    </div>
  );
};

export default App;
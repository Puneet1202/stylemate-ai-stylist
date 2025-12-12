import React, { useState, useEffect, useRef } from 'react';
import { ClothingItem, ChatMessage, StylistResponse, OutfitCardData } from '../types';
import { generateStylistResponse } from '../services/geminiService';
import OutfitCard from './OutfitCard';
import { Send, Loader2, Sparkles, User, RefreshCcw } from 'lucide-react';

interface StylistChatProps {
  wardrobe: ClothingItem[];
  favorites: OutfitCardData[];
  onToggleFavorite: (outfit: OutfitCardData) => void;
}

const StylistChat: React.FC<StylistChatProps> = ({ wardrobe, favorites, onToggleFavorite }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('styleMate_conversations_v1');
      return saved
        ? JSON.parse(saved)
        : [
            {
              id: 'init',
              role: 'stylist',
              content:
                "Hi! I'm your AI Style Mate. Upload your clothes, then tell me where you're going (e.g. 'Date Night')!",
              timestamp: Date.now(),
            },
          ];
    } catch {
      return [];
    }
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('styleMate_conversations_v1', JSON.stringify(messages));
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response: StylistResponse = await generateStylistResponse(text, wardrobe, messages);

      const stylistMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'stylist',
        content: response.message || '',
        data: response,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, stylistMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'stylist',
        content: 'Sorry, I’m having trouble connecting right now. Please try again.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    if (confirm('Clear conversation history?')) {
      const initMsg: ChatMessage = {
        id: 'init',
        role: 'stylist',
        content: "Hi! I'm your AI Style Mate. Upload your clothes, then tell me where you're going!",
        timestamp: Date.now(),
      };
      setMessages([initMsg]);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-stone-200">
      {/* Header */}
      <div className="bg-stone-50 p-4 border-b border-stone-100 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-stone-900 rounded-full flex items-center justify-center text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-stone-800">AI Stylist</h2>
            <p className="text-xs text-stone-500">Wardrobe First</p>
          </div>
        </div>

        <button onClick={clearHistory} className="text-stone-400 hover:text-stone-600 p-2">
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#FAFAF9]">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const data = msg.data as StylistResponse | undefined;

          // Prefer new schema: data.outfits[0]
          const outfit = data?.outfits && data.outfits.length > 0 ? data.outfits[0] : undefined;

          // Fallback legacy fields
          const legacyInspo = (data as any)?.inspirationImages;
          const legacyShopping = (data as any)?.shopping;

          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 max-w-[90%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div
                  className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
                    isUser ? 'bg-stone-200 text-stone-600' : 'bg-stone-900 text-white'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                </div>

                {/* Bubble + Rich Content */}
                <div className="flex flex-col gap-2 w-full">
                  {/* Text bubble (short message only) */}
                  <div
                    className={`px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      isUser
                        ? 'bg-stone-800 text-white rounded-tr-none'
                        : 'bg-white border border-stone-200 text-stone-700 rounded-tl-none'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* OutfitCard (uses new schema) */}
                  {!isUser && outfit && outfit.selectedItemIds && outfit.selectedItemIds.length > 0 && (
                    <OutfitCard
                      data={outfit}
                      wardrobe={wardrobe}
                      isFavorite={favorites.some((f) => f.id === outfit.id)}
                      onToggleFavorite={onToggleFavorite}
                    />
                  )}

                  {/* If no outfit selected but outfit exists with missingItems, show OutfitCard too */}
                  {!isUser && outfit && (!outfit.selectedItemIds || outfit.selectedItemIds.length === 0) && (outfit.missingItems?.length || outfit.pinterestLooks?.length) && (
                    <OutfitCard
                      data={outfit}
                      wardrobe={wardrobe}
                      isFavorite={favorites.some((f) => f.id === outfit.id)}
                      onToggleFavorite={onToggleFavorite}
                    />
                  )}

                  {/* Pinterest Inspiration Grid (new schema) */}
                  {!isUser && outfit?.pinterestLooks && outfit.pinterestLooks.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {outfit.pinterestLooks.map((img, idx) => {
                        // pinterestLooks: { title, previewImageUrl, pinterestUrl } per types
                        const imageUrl = (img as any).previewImageUrl || (img as any).imageUrl || '';
                        const link = (img as any).pinterestUrl || (img as any).pinterestUrl || (img as any).link || '#';
                        const title = (img as any).title || `Look ${idx + 1}`;
                        return (
                          <a key={idx} href={link} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90">
                            <img src={imageUrl || `https://source.unsplash.com/featured/?${encodeURIComponent(title)}`} alt={title} className="w-full h-32 object-cover rounded-xl" />
                            <div className="text-xs mt-1">{title}</div>
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {/* Pinterest Inspiration Grid (legacy fallback) */}
                  {!isUser && !outfit?.pinterestLooks && Array.isArray(legacyInspo) && legacyInspo.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {legacyInspo.map((img: any, idx: number) => (
                        <a key={idx} href={img.link || '#'} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90">
                          <img src={img.imageUrl || `https://source.unsplash.com/featured/?${encodeURIComponent(img.title || 'style')}`} alt={img.title || `Inspo ${idx+1}`} className="w-full h-32 object-cover rounded-xl" />
                          <div className="text-xs mt-1">{img.title}</div>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Shopping "Buy" buttons (new schema: missingItems with shoppingOptions) */}
                  {!isUser && outfit?.missingItems && outfit.missingItems.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {outfit.missingItems.map((miss, i) => (
                        <div key={miss.id || i} className="p-3 border rounded-xl bg-white shadow-sm">
                          <div className="font-medium">{miss.name}</div>
                          {miss.pinterestQuery && <div className="text-xs text-stone-500">{miss.pinterestQuery}</div>}
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {(miss.shoppingOptions || []).map((opt, j) => (
                              <a key={j} href={opt.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1 text-sm rounded-md bg-stone-900 text-white hover:bg-stone-700">
                                Buy on {opt.storeName}
                              </a>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Shopping fallback (legacy: data.shopping) */}
                  {!isUser && !outfit?.missingItems && Array.isArray(legacyShopping) && legacyShopping.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {legacyShopping.map((item: any, i: number) => (
                        <div key={i} className="p-3 border rounded-xl bg-white shadow-sm">
                          <div className="font-medium">{item.name}</div>
                          {item.priceRange && <div className="text-xs text-stone-500">{item.priceRange}</div>}
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {(item.links || []).map((link: any, j: number) => (
                              <a key={j} href={link.url || link.link} target="_blank" rel="noopener noreferrer" className="px-3 py-1 text-sm rounded-md bg-stone-900 text-white hover:bg-stone-700">
                                Buy on {link.label || 'Store'}
                              </a>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggestions (quick-replies) */}
                  {!isUser && data?.suggestions && data.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {data.suggestions.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(s)}
                          disabled={isLoading}
                          className="text-xs bg-white border border-stone-200 px-3 py-1.5 rounded-full text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition-all disabled:opacity-50"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Bottom ref */}
        <div ref={messagesEndRef} />

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[80%]">
              <div className="w-8 h-8 shrink-0 rounded-full bg-stone-900 text-white flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="bg-white border border-stone-200 px-5 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                <span className="text-sm text-stone-400">Styling...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-stone-100">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe the occasion (e.g. 'Wedding', 'Party')..."
            className="flex-1 bg-stone-50 border border-stone-200 text-stone-800 placeholder-stone-400 rounded-xl px-4 py-3 focus:ring-2 focus:ring-stone-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-stone-900 text-white p-3 rounded-xl hover:bg-stone-800 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default StylistChat;

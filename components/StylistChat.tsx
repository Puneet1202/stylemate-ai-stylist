
import React, { useState, useEffect, useRef } from 'react';
import { ClothingItem, ChatMessage, StylistResponse, OutfitCardData } from '../types';
import { generateStylistResponse } from '../services/geminiService';
import OutfitCard from './OutfitCard';
import { Send, Loader2, Sparkles, User, RefreshCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface StylistChatProps {
  wardrobe: ClothingItem[];
  favorites: OutfitCardData[];
  onToggleFavorite: (outfit: OutfitCardData) => void;
}

const StylistChat: React.FC<StylistChatProps> = ({ wardrobe, favorites, onToggleFavorite }) => {
  // Load conversation from local storage or start new
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('styleMate_conversations_v1');
      return saved ? JSON.parse(saved) : [{
        id: 'init',
        role: 'stylist',
        content: "Hi! I'm your AI Style Mate. Upload your clothes, then tell me where you're going (e.g. 'Date Night')!",
        timestamp: Date.now()
      }];
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
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response: StylistResponse = await generateStylistResponse(text, wardrobe, messages);
      
      const stylistMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'stylist',
        content: response.message,
        data: response,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, stylistMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'stylist',
        content: "Sorry, I'm having trouble connecting right now. Please try again.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    if (confirm("Clear conversation history?")) {
      const initMsg: ChatMessage = {
          id: 'init',
          role: 'stylist',
          content: "Hi! I'm your AI Style Mate. Upload your clothes, then tell me where you're going!",
          timestamp: Date.now()
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
        <button onClick={clearHistory} className="text-stone-400 hover:text-stone-600 p-2" title="Clear Chat">
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#FAFAF9]">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 max-w-[90%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${isUser ? 'bg-stone-200 text-stone-600' : 'bg-stone-900 text-white'}`}>
                  {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                </div>

                {/* Bubble */}
                <div className="flex flex-col gap-2 w-full">
                  <div className={`px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    isUser 
                      ? 'bg-stone-800 text-white rounded-tr-none' 
                      : 'bg-white border border-stone-200 text-stone-700 rounded-tl-none prose prose-stone max-w-none'
                  }`}>
                    {isUser ? (
                      msg.content
                    ) : (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    )}
                  </div>

                  {/* Wardrobe Items Display (Only for Stylist) */}
                  {!isUser && msg.data?.outfits && msg.data.outfits.length > 0 && (
                     msg.data.outfits[0].selectedItemIds.length > 0 && (
                      <OutfitCard 
                        data={msg.data.outfits[0]}
                        wardrobe={wardrobe}
                        isFavorite={false}
                        onToggleFavorite={() => {}}
                      />
                    )
                  )}

                  {/* Suggestions Chips */}
                  {!isUser && msg.data?.suggestions && msg.data.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {msg.data.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(suggestion)}
                          disabled={isLoading}
                          className="text-xs bg-white border border-stone-200 px-3 py-1.5 rounded-full text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition-all disabled:opacity-50"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
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

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-stone-100">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="flex gap-2 relative"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe the occasion (e.g. 'Wedding', 'Party')..."
            className="flex-1 bg-stone-50 border border-stone-200 text-stone-800 placeholder-stone-400 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:bg-white transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-stone-900 text-white p-3 rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default StylistChat;

import React, { useState, useEffect } from 'react';
import { searchForItems } from '../services/geminiService';
import { Search, ExternalLink, ShoppingBag, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ShoppingProps {
  initialQuery?: string;
}

const Shopping: React.FC<ShoppingProps> = ({ initialQuery }) => {
  const [query, setQuery] = useState(initialQuery || '');
  const [results, setResults] = useState<{ text: string, groundingChunks: any[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialQuery) {
        handleSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const data = await searchForItems(searchQuery);
      setResults(data);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  // Helper to extract links from grounding chunks
  const getLinks = () => {
    if (!results?.groundingChunks) return [];
    
    // Flatten chunks to find web sources
    const links: { title: string; uri: string }[] = [];
    results.groundingChunks.forEach((chunk: any) => {
      if (chunk.web) {
        links.push({
          title: chunk.web.title || "Product Link",
          uri: chunk.web.uri
        });
      }
    });
    return links;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
       <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-stone-800">Shopping Assistant</h2>
        <p className="text-stone-500">Find the missing pieces to complete your style.</p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-2xl mx-auto">
        <form onSubmit={onSubmit} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for 'White linen shirt' or 'Beige trench coat'..."
            className="w-full pl-12 pr-4 py-4 rounded-full border border-stone-200 shadow-sm focus:ring-2 focus:ring-stone-500 focus:border-transparent outline-none transition-all text-lg"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-stone-400 w-5 h-5" />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 top-2 bottom-2 bg-stone-900 text-white px-6 rounded-full font-medium hover:bg-stone-800 transition-colors disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Search'}
          </button>
        </form>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main AI Response */}
        <div className="md:col-span-2 space-y-6">
           {loading ? (
             <div className="space-y-4 p-6 bg-white rounded-2xl border border-stone-100 shadow-sm animate-pulse">
               <div className="h-4 bg-stone-200 rounded w-3/4"></div>
               <div className="h-4 bg-stone-200 rounded w-full"></div>
               <div className="h-4 bg-stone-200 rounded w-5/6"></div>
             </div>
           ) : results ? (
             <div className="bg-white p-8 rounded-2xl border border-stone-100 shadow-sm prose prose-stone max-w-none">
                <ReactMarkdown>{results.text}</ReactMarkdown>
             </div>
           ) : (
             <div className="text-center py-20 opacity-50">
               <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-stone-300" />
               <p className="text-stone-500">Search for something to see recommendations.</p>
             </div>
           )}
        </div>

        {/* Sidebar Links (Grounding) */}
        <div className="md:col-span-1">
           {results && getLinks().length > 0 && (
             <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 sticky top-4">
               <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
                 <ExternalLink className="w-4 h-4" />
                 Sources
               </h3>
               <ul className="space-y-3">
                 {getLinks().map((link, i) => (
                   <li key={i}>
                     <a 
                       href={link.uri} 
                       target="_blank" 
                       rel="noreferrer"
                       className="block p-3 bg-white rounded-xl border border-stone-100 hover:border-stone-300 hover:shadow-md transition-all text-sm group"
                     >
                       <span className="font-medium text-stone-700 group-hover:text-blue-600 line-clamp-2">{link.title}</span>
                       <span className="text-xs text-stone-400 mt-1 block truncate">{new URL(link.uri).hostname}</span>
                     </a>
                   </li>
                 ))}
               </ul>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Shopping;
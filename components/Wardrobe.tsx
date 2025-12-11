import React, { useState, useRef } from 'react';
import { ClothingItem, ChartData } from '../types';
import { analyzeClothingImage } from '../services/geminiService';
import { Upload, Plus, Trash2, Tag, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface WardrobeProps {
  items: ClothingItem[];
  onAddItem: (item: ClothingItem) => void;
  onRemoveItem: (id: string) => void;
}

const COLORS = ['#A8A29E', '#78716C', '#57534E', '#D6D3D1', '#E7E5E4', '#F5F5F4'];

const Wardrobe: React.FC<WardrobeProps> = ({ items, onAddItem, onRemoveItem }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsAnalyzing(true);
    setUploadProgress({ current: 0, total: files.length });

    // Explicitly cast to File[] to avoid 'unknown' type inference issues
    const fileArray: File[] = Array.from(files);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      // Update progress
      setUploadProgress({ current: i + 1, total: fileArray.length });

      try {
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        // Analyze with Gemini
        const analysis = await analyzeClothingImage(base64String);
        
        const newItem: ClothingItem = {
          id: crypto.randomUUID(),
          image: base64String,
          category: analysis.category || "Unknown",
          color: analysis.color || "Unknown",
          season: analysis.season || [],
          style: analysis.style || [],
          description: analysis.description
        };

        onAddItem(newItem);
      } catch (error) {
        console.error(`Failed to analyze image ${file.name}`, error);
        // We continue processing other files even if one fails
      }
    }

    setIsAnalyzing(false);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Prepare chart data
  const categoryData = items.reduce((acc: Record<string, number>, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});

  const chartData: ChartData[] = Object.keys(categoryData).map((key, index) => ({
    name: key,
    value: categoryData[key],
    fill: COLORS[index % COLORS.length]
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header & Upload */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-800">My Wardrobe</h2>
          <p className="text-stone-500">Manage your collection ({items.length} items)</p>
        </div>
        
        <div className="relative">
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-6 py-3 rounded-xl transition-all shadow-md disabled:opacity-70 disabled:cursor-wait"
          >
            {isAnalyzing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            {isAnalyzing && uploadProgress 
              ? `Analyzing ${uploadProgress.current}/${uploadProgress.total}...` 
              : 'Add Items'}
          </button>
        </div>
      </div>

      {/* Progress Indicator (Optional visual feedback below header) */}
      {isAnalyzing && uploadProgress && (
        <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-stone-800 h-full transition-all duration-300 ease-out"
            style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
          />
        </div>
      )}

      {/* Stats Section */}
      {items.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1 w-full h-64">
            <h3 className="text-lg font-semibold mb-4 text-stone-700">Category Breakdown</h3>
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2 text-stone-600">
             <p className="text-sm">
               💡 <strong>Style Tip:</strong> You have a strong collection of 
               <span className="font-semibold text-stone-800"> {chartData.sort((a,b) => b.value - a.value)[0]?.name}</span>. 
               Consider adding more variety in colors to expand your outfit options!
             </p>
          </div>
        </div>
      )}

      {/* Grid */}
      {items.length === 0 ? (
        <div className="text-center py-20 bg-stone-100 rounded-3xl border-2 border-dashed border-stone-300">
          <Upload className="w-12 h-12 text-stone-400 mx-auto mb-4" />
          <p className="text-lg text-stone-500">Your wardrobe is empty.</p>
          <p className="text-sm text-stone-400">Upload photos of your clothes to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <div key={item.id} className="group relative bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden transition-all hover:shadow-lg">
              <div className="aspect-square relative overflow-hidden bg-stone-50">
                <img
                  src={item.image}
                  alt={item.category}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="absolute top-2 right-2 bg-white/90 p-2 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                  title="Remove Item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-stone-800 capitalize">{item.category}</h3>
                  <span className="text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded-full">{item.color}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.style.slice(0, 3).map((tag, i) => (
                    <span key={i} className="text-[10px] text-stone-500 border border-stone-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                      <Tag className="w-3 h-3" /> {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Wardrobe;
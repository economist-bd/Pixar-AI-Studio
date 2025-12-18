import React, { useState, useEffect, useRef } from 'react';
import { Camera, Download, Sparkles, Image as ImageIcon, Loader2, AlertCircle, Clock, Upload, X, Settings, Palette } from 'lucide-react';

export default function App() {
  const [userPrompt, setUserPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Settings
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [referenceImage, setReferenceImage] = useState(null); 
  const [selectedStyle, setSelectedStyle] = useState('Pixar'); // New Style State

  // API Key state
  const [customKey, setCustomKey] = useState(''); 
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const fileInputRef = useRef(null);

  // Style Definitions
  const styles = {
    'Pixar': {
      label: 'Pixar 3D',
      desc: 'ডিজনি পিক্সার স্টাইল',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Disney Pixar / Dreamworks animation.
      - Render: Unreal Engine 5, Octane Render, 8k resolution.
      - Lighting: Cinematic, soft shadows, volumetric lighting.
      - Colors: Vibrant, warm, rich textures.
      - Skin/Surface: Smooth animated texture, expressive features.
      `
    },
    'Lo-Fi': {
      label: 'Lo-Fi Chill',
      desc: 'রিলাক্সিং অ্যানিমে স্টাইল',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Lo-fi aesthetic, 90s anime style, Studio Ghibli inspired.
      - Vibe: Relaxing, nostalgic, calm, study beats background.
      - Colors: Muted pastels, soft purple/pink/blue tones, slightly grainy, retro filter.
      - Render: 2D flat shading or cel-shaded, hand-drawn feel.
      `
    },
    'Cozy': {
      label: 'Cozy Warm',
      desc: 'উষ্ণ এবং আরামদায়ক',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Cozy illustration, Hygge atmosphere, warm and inviting.
      - Lighting: Warm golden hour, fairy lights, soft candle glow, fireplace warmth.
      - Textures: Soft fabrics (knitted), wood, plants, detailed comfortable environment.
      - Render: High quality 3D render or detailed digital painting, soft focus.
      `
    }
  };

  // Countdown timer
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Handle Image Upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("ছবির সাইজ ৫MB এর কম হতে হবে।");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImage(reader.result);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const clearReferenceImage = () => {
    setReferenceImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generateImage = async () => {
    if (cooldown > 0) return;
    
    if (!userPrompt.trim() && !referenceImage) {
      setError('অনুগ্রহ করে প্রম্পট লিখুন অথবা একটি রেফারেন্স ছবি দিন।');
      return;
    }

    setLoading(true);
    setError('');
    setGeneratedImage(null);

    const compositionRules = `
      FRAMING & COMPOSITION RULES (STRICT):
      - Aspect Ratio: ${aspectRatio}.
      - Default Shot: FULL BODY shot showing the character/scene fully.
      - If "Close Up" or "Portrait" is requested in prompt:
        * For HUMANS: Generate a HALF BODY shot (Waist up).
        * For ANIMALS/OBJECTS: Maintain FULL BODY shot but fill the frame.
    `;

    // Dynamic Prompt Construction based on selected style
    const finalPrompt = `
      Create a high-quality image based on the user description.
      
      User Scene Description: ${userPrompt}
      
      ${compositionRules}
      
      ${styles[selectedStyle].instruction}
    `;

    try {
      const apiKey = customKey || import.meta.env.VITE_GOOGLE_API_KEY || ""; 
      let success = false;
      
      if (referenceImage) {
          // Multimodal Logic
          const base64Data = referenceImage.split(',')[1];
          const mimeType = referenceImage.split(';')[0].split(':')[1];

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { text: finalPrompt + " (Use the attached image as a visual reference)." },
                    { inlineData: { mimeType: mimeType, data: base64Data } }
                  ]
                }],
                generationConfig: { responseModalities: ["IMAGE"] }
              })
            }
          );
          
          if (!response.ok) throw await handleApiError(response);
          
          const result = await response.json();
          const imgData = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
          if (imgData) {
              setGeneratedImage(`data:image/png;base64,${imgData}`);
              success = true;
          }

      } else {
          // Text Logic: Try Imagen 4.0 first
          try {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  instances: [{ prompt: finalPrompt }],
                  parameters: { sampleCount: 1, aspectRatio: aspectRatio },
                }),
              }
            );

            if (response.ok) {
                const result = await response.json();
                if (result.predictions && result.predictions[0]?.bytesBase64Encoded) {
                    setGeneratedImage(`data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`);
                    success = true;
                }
            }
          } catch (e) { console.log("Imagen 4.0 error:", e); }

          // Fallback to Gemini Flash
          if (!success) {
             const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: finalPrompt }] }],
                    generationConfig: { responseModalities: ["IMAGE"] }
                  })
                }
              );

              if (!response.ok) throw await handleApiError(response);

              const result = await response.json();
              const imgData = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
              if (imgData) setGeneratedImage(`data:image/png;base64,${imgData}`);
              else throw new Error("No image generated.");
          }
      }

    } catch (err) {
      console.error(err);
      setError(err.message || "ছবি তৈরি করতে সমস্যা হয়েছে।");
      if(err.message.includes("Key") || err.message.includes("403") || err.message.includes("সমস্যা")) {
        setShowKeyInput(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApiError = async (response) => {
      const errData = await response.json().catch(() => ({}));
      if (response.status === 429) {
          setCooldown(60);
          return new Error(`সার্ভার ব্যস্ত। ৬০ সেকেন্ড অপেক্ষা করুন।`);
      }
      if (response.status === 400 || response.status === 403) {
          setShowKeyInput(true);
          return new Error("API Key সমস্যা। নিচের বক্সে আপনার Key দিন।");
      }
      return new Error(errData.error?.message || "Error generating image.");
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `${selectedStyle.toLowerCase()}-art-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 text-white font-sans">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8 space-y-2">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
            <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 drop-shadow-lg">
              AI Art Studio
            </h1>
          </div>
          <p className="text-gray-300 text-sm md:text-base">
            Pixar 3D, Lo-Fi, বা Cozy স্টাইলে চমৎকার ছবি তৈরি করুন।
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4 md:p-8 shadow-2xl">
          <div className="space-y-6">
            
            {/* Control Row: Ratio, Upload, Style */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Style Selector */}
                <div className="flex-1">
                    <label className="block text-xs font-medium text-blue-200 uppercase tracking-wide mb-2 flex items-center gap-2">
                        <Palette size={14} /> আর্ট স্টাইল
                    </label>
                    <div className="flex flex-col gap-2">
                        {Object.keys(styles).map((styleKey) => (
                            <button
                                key={styleKey}
                                onClick={() => setSelectedStyle(styleKey)}
                                className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all text-left flex items-center justify-between ${
                                    selectedStyle === styleKey 
                                    ? 'bg-purple-600 text-white ring-2 ring-purple-300 shadow-lg' 
                                    : 'bg-black/30 text-gray-400 hover:bg-black/50'
                                }`}
                            >
                                <span>{styles[styleKey].label}</span>
                                {selectedStyle === styleKey && <Sparkles size={14} />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Aspect Ratio Selector */}
                <div className="flex-1">
                    <label className="block text-xs font-medium text-blue-200 uppercase tracking-wide mb-2 flex items-center gap-2">
                        <Settings size={14} /> ছবির সাইজ
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {['9:16', '1:1', '16:9'].map((ratio) => (
                            <button
                                key={ratio}
                                onClick={() => setAspectRatio(ratio)}
                                className={`py-2 px-2 rounded-lg text-sm font-semibold transition-all ${
                                    aspectRatio === ratio 
                                    ? 'bg-purple-600 text-white ring-2 ring-purple-300' 
                                    : 'bg-black/30 text-gray-400 hover:bg-black/50'
                                }`}
                            >
                                {ratio}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Reference Image Uploader */}
                <div className="flex-1">
                    <label className="block text-xs font-medium text-blue-200 uppercase tracking-wide mb-2 flex items-center gap-2">
                        <Upload size={14} /> রেফারেন্স (ঐচ্ছিক)
                    </label>
                    {!referenceImage ? (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-white/20 rounded-lg h-[42px] md:h-full flex items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-white/5 transition-all text-gray-400 text-sm gap-2 p-2"
                        >
                            <ImageIcon size={16} /> আপলোড
                        </div>
                    ) : (
                        <div className="relative h-[42px] md:h-full bg-black/40 rounded-lg flex items-center px-3 border border-purple-500/50">
                            <span className="text-xs text-green-400 flex items-center gap-2 truncate flex-1">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                যুক্ত হয়েছে
                            </span>
                            <button onClick={clearReferenceImage} className="text-gray-400 hover:text-red-400 p-1">
                                <X size={16} />
                            </button>
                        </div>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                </div>
            </div>

            {/* Prompt Input */}
            <div>
                <label className="block text-sm font-medium text-blue-200 uppercase tracking-wide mb-2">
                  ছবির বর্ণনা (Prompt) - {styles[selectedStyle].desc}
                </label>
                <div className="relative group">
                  <textarea
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    placeholder={`উদাহরণ: ${selectedStyle === 'Lo-Fi' ? 'একটি মেয়ে জানালার পাশে বসে বই পড়ছে, বৃষ্টি হচ্ছে...' : 'একটি কিউট বিড়াল স্পেস সুট পরে আছে...'}`}
                    rows={2}
                    className="w-full bg-black/40 border-2 border-white/10 text-white rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-500/20 transition-all placeholder-gray-500 text-lg resize-none"
                    onKeyDown={(e) => {
                        if(e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            generateImage();
                        }
                    }}
                    disabled={cooldown > 0}
                  />
                  <div className="absolute right-3 top-3 p-1 bg-white/10 rounded-lg text-gray-400">
                    <Camera size={20} />
                  </div>
                </div>
            </div>

            {/* API Key Input */}
            <div className={`transition-all duration-300 ${showKeyInput ? 'opacity-100 block' : 'opacity-0 h-0 overflow-hidden'}`}>
                <label className="block text-xs text-red-300 mb-1">API Key প্রয়োজন (Get free from aistudio.google.com)</label>
                <input
                    type="password"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="API Key (AIza...)"
                    className="w-full bg-red-900/30 border border-red-500/50 text-white rounded-lg px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
                />
            </div>

            <button
              onClick={generateImage}
              disabled={loading || cooldown > 0}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transform transition-all duration-200 flex items-center justify-center gap-2
                ${loading || cooldown > 0
                  ? 'bg-gray-600 cursor-not-allowed opacity-70' 
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 hover:scale-[1.02] active:scale-[0.98] ring-1 ring-white/20'
                }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  {selectedStyle} আর্ট তৈরি হচ্ছে...
                </>
              ) : cooldown > 0 ? (
                <>
                  <Clock className="w-5 h-5 animate-pulse" />
                  অপেক্ষা করুন ({cooldown}s)
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  ম্যাজিক শুরু করুন
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-200 animate-in fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="mt-8 flex justify-center">
            {generatedImage && (
              <div className={`relative group animate-in zoom-in duration-500 ${aspectRatio === '9:16' ? 'w-full max-w-sm' : 'w-full'}`}>
                <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                  <img
                    src={generatedImage}
                    alt="Generated Art"
                    className="w-full h-auto object-cover"
                    style={{ aspectRatio: aspectRatio.replace(':','/') }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                    <button
                      onClick={handleDownload}
                      className="w-full py-3 bg-white text-gray-900 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      ডাউনলোড করুন
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center text-gray-500 text-sm">
           Powered by Google Gemini & Imagen • AI Art Studio
        </div>
      </div>
    </div>
  );
}
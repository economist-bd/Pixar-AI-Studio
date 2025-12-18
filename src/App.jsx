import React, { useState, useEffect, useRef } from 'react';
import { Camera, Download, Sparkles, Image as ImageIcon, Loader2, AlertCircle, Clock, Upload, X, Settings } from 'lucide-react';

export default function App() {
  const [userPrompt, setUserPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Settings
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [referenceImage, setReferenceImage] = useState(null); // Stores base64 of uploaded image
  
  // API Key state
  const [customKey, setCustomKey] = useState(''); // এখানে আপনার কী (Key) বসাতে পারেন যদি প্রয়োজন হয়
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const fileInputRef = useRef(null);

  // Countdown timer for rate limits
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
        const base64String = reader.result;
        setReferenceImage(base64String);
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

    // COMPOSITION LOGIC
    const compositionRules = `
      FRAMING & COMPOSITION RULES (STRICT):
      - Aspect Ratio: ${aspectRatio}.
      - Default Shot: FULL BODY shot showing the character from head to toe, ensuring the surrounding environment (background) is visible and establishes context.
      - If "Close Up" or "Portrait" is requested in prompt:
        * For HUMANS: Generate a HALF BODY shot (Waist up).
        * For ANIMALS/OBJECTS: Maintain FULL BODY shot but fill the frame.
    `;

    const finalPrompt = `
      Create a high-quality 3D animated Disney Pixar style image.
      
      User Scene Description: ${userPrompt}
      
      ${compositionRules}
      
      MANDATORY ART STYLE:
      - Style: Disney Pixar / Dreamworks animation.
      - Render: Unreal Engine 5, Octane Render, 8k resolution.
      - Lighting: Cinematic, soft shadows, volumetric lighting.
      - Colors: Vibrant, warm, rich textures.
      - Skin/Surface: Smooth animated texture, expressive features.
    `;

    try {
      // Use environment key if custom key is empty
      const apiKey = customKey || ""; 
      let success = false;
      
      // LOGIC: If Reference Image exists, we MUST use Gemini Flash (Multimodal)
      if (referenceImage) {
          console.log("Using Reference Image mode (Gemini Flash)...");
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
                    { text: finalPrompt + " (Use the attached image as a visual reference for character/color/vibe)." },
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
          // TEXT ONLY MODE: Try Imagen 4.0 first (Better Quality)
          try {
            console.log("Attempting Imagen 4.0...");
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  instances: [{ prompt: finalPrompt }],
                  parameters: { 
                      sampleCount: 1,
                      aspectRatio: aspectRatio 
                  },
                }),
              }
            );

            if (response.ok) {
                const result = await response.json();
                if (result.predictions && result.predictions[0]?.bytesBase64Encoded) {
                    setGeneratedImage(`data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`);
                    success = true;
                }
            } else {
                console.warn("Imagen 4.0 failed, trying fallback...");
            }
          } catch (e) {
            console.log("Imagen 4.0 error:", e);
          }

          // Fallback to Gemini Flash if Imagen failed
          if (!success) {
             console.log("Fallback to Gemini 2.5 Flash...");
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
      if(err.message.includes("Key") || err.message.includes("403")) setShowKeyInput(true);
    } finally {
      setLoading(false);
    }
  };

  // Helper to handle API errors and rate limits
  const handleApiError = async (response) => {
      const errData = await response.json().catch(() => ({}));
      if (response.status === 429) {
          let waitTime = 60;
          try {
              const retryInfo = errData.error?.details?.find(d => d['@type']?.includes('RetryInfo'));
              if (retryInfo?.retryDelay) waitTime = Math.ceil(parseFloat(retryInfo.retryDelay.replace('s', ''))) || 60;
          } catch (e) {}
          setCooldown(waitTime);
          return new Error(`সার্ভার ব্যস্ত (Quota Limit)। ${waitTime} সেকেন্ড অপেক্ষা করুন।`);
      }
      if (response.status === 400 || response.status === 403) {
          setShowKeyInput(true);
          return new Error("API Key সমস্যা।");
      }
      return new Error(errData.error?.message || "Error generating image.");
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `pixar-style-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 text-white font-sans selection:bg-pink-500 selection:text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
        {/* Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
            <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 drop-shadow-lg">
              Pixar AI Studio
            </h1>
          </div>
          <p className="text-gray-300 text-sm md:text-base">
            রেফারেন্স ছবি আপলোড করুন অথবা প্রম্পট দিয়ে ৯:১৬ রেশিওতে পিক্সার স্টাইলের ছবি তৈরি করুন।
          </p>
        </div>

        {/* Main Interface */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4 md:p-8 shadow-2xl">
          
          <div className="space-y-6">
            
            {/* Controls Row: Ratio & Upload */}
            <div className="flex flex-col md:flex-row gap-4 justify-between">
                
                {/* Aspect Ratio Selector */}
                <div className="flex-1">
                    <label className="block text-xs font-medium text-blue-200 uppercase tracking-wide mb-2 flex items-center gap-2">
                        <Settings size={14} /> ছবির সাইজ (রেশিও)
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
                        <Upload size={14} /> রেফারেন্স ছবি (ঐচ্ছিক)
                    </label>
                    {!referenceImage ? (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-white/20 rounded-lg h-[42px] flex items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-white/5 transition-all text-gray-400 text-sm gap-2"
                        >
                            <ImageIcon size={16} /> ছবি আপলোড করুন
                        </div>
                    ) : (
                        <div className="relative h-[42px] bg-black/40 rounded-lg flex items-center px-3 border border-purple-500/50">
                            <span className="text-xs text-green-400 flex items-center gap-2 truncate flex-1">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                ছবি যুক্ত হয়েছে
                            </span>
                            <button onClick={clearReferenceImage} className="text-gray-400 hover:text-red-400 p-1">
                                <X size={16} />
                            </button>
                        </div>
                    )}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageUpload} 
                        accept="image/*" 
                        className="hidden" 
                    />
                </div>
            </div>

            {/* Text Prompt Input */}
            <div>
                <label className="block text-sm font-medium text-blue-200 uppercase tracking-wide mb-2">
                  ছবির বর্ণনা (Prompt)
                </label>
                <div className="relative group">
                  <textarea
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    placeholder="উদাহরণ: একটি তোতা পাখি গাছের ডালে বসে আছে..."
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
                <p className="text-xs text-gray-400 mt-2">
                   * ডিফল্ট: ফুল বডি (৯:১৬)। ক্লোজআপ চাইলে উল্লেখ করুন।
                </p>
            </div>

            {/* API Key Input (Hidden by default) */}
            <div className={`transition-all duration-300 ${showKeyInput ? 'opacity-100 block' : 'opacity-0 h-0 overflow-hidden'}`}>
                <input
                    type="password"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="API Key (AIza...)"
                    className="w-full bg-red-900/30 border border-red-500/50 text-white rounded-lg px-3 py-2 text-sm"
                />
            </div>

            {/* Generate Button */}
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
                  {referenceImage ? "রেফারেন্স ব্যবহার করে তৈরি হচ্ছে..." : "ছবি তৈরি হচ্ছে..."}
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

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-200 animate-in fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Result Section */}
          <div className="mt-8 flex justify-center">
            {generatedImage ? (
              <div className={`relative group animate-in zoom-in duration-500 ${aspectRatio === '9:16' ? 'w-full max-w-sm' : 'w-full'}`}>
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
                <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                  <img
                    src={generatedImage}
                    alt="Generated Pixar Art"
                    className="w-full h-auto object-cover"
                    style={{ aspectRatio: aspectRatio.replace(':','/') }}
                  />
                  
                  {/* Overlay Actions */}
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
            ) : (
              !loading && !error && (
                <div className={`border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-gray-500 group hover:border-white/20 transition-colors bg-black/20 w-full ${aspectRatio === '9:16' ? 'max-w-sm aspect-[9/16]' : 'aspect-square'}`}>
                  <ImageIcon className="w-12 h-12 mb-3 opacity-50 group-hover:scale-110 transition-transform" />
                  <p>আপনার ছবি এখানে দেখা যাবে</p>
                  <p className="text-xs text-gray-600 mt-1">Ratio: {aspectRatio}</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-gray-500 text-sm">
           Powered by Google Gemini & Imagen • Pixar Style AI
        </div>
      </div>
    </div>
  );
}
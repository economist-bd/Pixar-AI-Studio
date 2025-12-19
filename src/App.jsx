import React, { useState, useEffect, useRef } from 'react';
import { Camera, Download, Sparkles, Image as ImageIcon, Loader2, AlertCircle, Clock, Upload, X, Settings, Palette, Search } from 'lucide-react';

export default function App() {
  const [userPrompt, setUserPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Settings
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [referenceImage, setReferenceImage] = useState(null); 
  const [selectedStyle, setSelectedStyle] = useState('Pixar');

  // API Key state
  const [customKey, setCustomKey] = useState(''); 
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const fileInputRef = useRef(null);

  // Expanded Style Definitions
  const styles = {
    'Hyper Realistic': {
      label: 'Hyper Realism',
      desc: 'একদম বাস্তবের মতো (Ultra High Detail)',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Hyper-realistic photography, Photorealism, 8k UHD.
      - Camera: DSLR, 85mm lens, f/1.8, high shutter speed.
      - Lighting: Natural lighting, Ray tracing, Global illumination, Cinematic lighting.
      - Details: Extremely detailed skin texture, pores, surfaces, imperfections, sharp focus.
      - Vibe: National Geographic photography, Cinematic reality.
      `
    },
    'Cinematic': {
      label: 'Cinematic Movie',
      desc: 'মুভির সিনের মতো',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Cinematic Movie Still, Hollywood Blockbuster style.
      - Aspect: Wide dynamic range, color graded (teal and orange).
      - Lighting: Dramatic lighting, rim light, volumetric fog, anamorphic lens flares.
      - Render: Unreal Engine 5, Octane Render, 8k resolution.
      `
    },
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
    'Studio Ghibli': {
      label: 'Studio Ghibli',
      desc: 'হায়াও মিয়াজাকি স্টাইল',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Studio Ghibli / Hayao Miyazaki animation style.
      - Vibe: Whimsical, detailed nature, peaceful, magical realism.
      - Colors: Vibrant greens, blues, watercolor backgrounds, hand-drawn feel.
      - Render: 2D anime style, high detail.
      `
    },
    'Makoto Shinkai': {
      label: 'Makoto Shinkai',
      desc: '"Your Name" মুভি স্টাইল',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Makoto Shinkai anime style (Your Name, Weathering with You).
      - Lighting: Hyper-realistic lighting, lens flares, beautiful sky and clouds.
      - Vibe: Emotional, scenic, highly detailed backgrounds.
      - Colors: Vibrant contrasts, detailed reflections.
      `
    },
    '90s Anime': {
      label: '90s Anime',
      desc: 'সেইলর মুন/রেট্রো অ্যানিমে',
      instruction: `
      MANDATORY ART STYLE:
      - Style: 1990s Anime aesthetic (Sailor Moon, Evangelion era).
      - Visuals: Cel-shaded, slight film grain, retro TV vibe.
      - Colors: Bold, slightly washed out vintage look.
      `
    },
    'Cyberpunk': {
      label: 'Cyberpunk',
      desc: 'ফিউচারিস্টিক নিয়ন',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Cyberpunk, Sci-fi, High-tech low-life.
      - Lighting: Neon lights (pink, blue, cyan), dark rainy atmosphere, night time.
      - Elements: Holograms, cyborgs, futuristic cityscapes.
      `
    },
    'Vaporwave': {
      label: 'Vaporwave',
      desc: '৮০র দশকের পরাবাস্তব',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Vaporwave aesthetic, 80s surrealism.
      - Elements: Roman statues, glitch art, palm trees, early CGI, checkerboard floors.
      - Colors: Pink, cyan, purple, pastel neon gradients.
      `
    },
    'Synthwave': {
      label: 'Synthwave',
      desc: 'রেট্রো ফিউচারিস্টিক',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Synthwave / Outrun aesthetic.
      - Elements: Retro-futuristic 80s, neon grids, sunsets, fast cars, wireframe.
      - Colors: Dark background with bright neon orange, purple, and magenta.
      `
    },
    'Retrowave': {
      label: 'Retrowave',
      desc: 'ভিন্টেজ ৮০স ভাইব',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Retrowave, vintage 80s pop culture.
      - Vibe: Nostalgic, arcade games, neon signs, cassette tapes.
      - Render: Stylized digital art.
      `
    },
    'Lo-Fi': {
      label: 'Lo-Fi Chill',
      desc: 'রিলাক্সিং স্টাডি বিটস',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Lo-fi aesthetic, relaxing anime loop style.
      - Vibe: Nostalgic, calm, cozy, study beats background.
      - Colors: Muted pastels, soft purple/pink/blue tones, slightly grainy.
      `
    },
    'Cottagecore': {
      label: 'Cottagecore',
      desc: 'গ্রাম্য ও প্রকৃতির ছোঁয়া',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Cottagecore aesthetic, romanticized rural life.
      - Elements: Flowers, gardening, baking, vintage dresses, mushrooms, forests.
      - Colors: Earthy tones, soft greens, warm yellows, natural light.
      `
    },
    'Cozy': {
      label: 'Cozy Warm',
      desc: 'উষ্ণ এবং আরামদায়ক',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Cozy illustration, Hygge atmosphere.
      - Lighting: Warm golden hour, fairy lights, fireplace warmth.
      - Textures: Soft fabrics, wood, comfortable environment.
      `
    },
    'Solarpunk': {
      label: 'Solarpunk',
      desc: 'প্রকৃতি ও প্রযুক্তির মিলন',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Solarpunk aesthetic.
      - Vibe: Optimistic future, nature integrated with technology.
      - Elements: Green cities, renewable energy, Art Nouveau influences, bright sunlight.
      `
    },
    'Dark Academia': {
      label: 'Dark Academia',
      desc: 'ক্লাসিক ও রহস্যময়',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Dark Academia aesthetic.
      - Elements: Classic literature, libraries, tweed, rainy days, gothic architecture.
      - Colors: Moody browns, blacks, beige, dark greens.
      `
    },
    'Isometric': {
      label: 'Isometric',
      desc: '৩ডি জ্যামিতিক ভিউ',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Isometric 3D art.
      - View: Orthographic projection (3/4 view).
      - Vibe: Clean, organized, miniature world feel, cute 3D render.
      `
    },
    'Voxel Art': {
      label: 'Voxel Art',
      desc: 'মাইনক্রাফট/ব্লক স্টাইল',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Voxel art, 3D pixel art.
      - Elements: Blocky cubes, Minecraft style, Lego-like structures.
      - Render: Sharp edges, distinct grid-based blocks.
      `
    },
    'Low Poly': {
      label: 'Low Poly',
      desc: 'মিনিমালিস্ট ৩ডি',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Low Poly 3D art.
      - Elements: Geometric shapes, sharp polygons, flat shading, minimal details.
      - Vibe: Abstract, clean, modern digital art.
      `
    },
    'Liminal Spaces': {
      label: 'Liminal',
      desc: 'স্বপ্নপুরী ও নির্জন',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Liminal Space aesthetic / Dreamcore.
      - Vibe: Eerie, transitional, empty, nostalgic, dream-like, weirdly familiar.
      - Elements: Empty hallways, pools, infinite rooms, soft artificial lighting.
      `
    },
    'Paper Cutout': {
      label: 'Paper Cutout',
      desc: 'লেয়ারড পেপার আর্ট',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Paper Cutout / Layered Paper Art.
      - Render: Depth shadows, stacked paper layers, craft aesthetic.
      - Vibe: Handmade, textured, colorful.
      `
    },
    'Pastel': {
      label: 'Pastel Aesthetic',
      desc: 'নরম ও উজ্জ্বল রঙ',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Pastel Aesthetic / Kawaii.
      - Colors: Soft pinks, baby blues, mint greens, pale yellows.
      - Vibe: Dreamy, cute, soft, airy.
      `
    },
    'Glitch Art': {
      label: 'Glitch Art',
      desc: 'ডিজিটাল এরর ইফেক্ট',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Glitch Art / Datamosh.
      - Elements: Pixel sorting, VHS distortion, RGB shift, digital noise.
      - Vibe: Chaotic, surreal, technological failure aesthetic.
      `
    },
    'Minimalist Vector': {
      label: 'Vector',
      desc: 'ফ্ল্যাট ও সিম্পল',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Minimalist Vector Art.
      - Elements: Clean lines, solid colors, no gradients, simple shapes.
      - Vibe: Iconic, modern, graphic design.
      `
    },
    'Flat Design': {
      label: 'Flat Design',
      desc: 'মডার্ন ইউআই স্টাইল',
      instruction: `
      MANDATORY ART STYLE:
      - Style: Modern Flat Design illustration.
      - Elements: 2D, bright colors, simple geometry, corporate art style (Corporate Memphis).
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
      // Safe access to environment variables
      let envKey = "";
      try {
        if (import.meta && import.meta.env) {
          envKey = import.meta.env.VITE_GOOGLE_API_KEY || "";
        }
      } catch (e) {
        console.warn("Could not access import.meta.env");
      }

      const apiKey = customKey || envKey || ""; 
      
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
      link.download = `${selectedStyle.toLowerCase().replace(/ /g, '-')}-${Date.now()}.png`;
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
            আপনার পছন্দের স্টাইল সিলেক্ট করুন এবং চমৎকার ছবি তৈরি করুন।
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4 md:p-8 shadow-2xl">
          <div className="space-y-6">
            
            {/* Control Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Style Selector (Scrollable) */}
                <div className="lg:col-span-1 flex flex-col h-[300px] md:h-[400px]">
                    <label className="block text-xs font-medium text-blue-200 uppercase tracking-wide mb-2 flex items-center gap-2">
                        <Palette size={14} /> আর্ট স্টাইল ({Object.keys(styles).length})
                    </label>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar border border-white/10 rounded-xl p-2 bg-black/20">
                        {Object.keys(styles).map((styleKey) => (
                            <button
                                key={styleKey}
                                onClick={() => setSelectedStyle(styleKey)}
                                className={`w-full py-2.5 px-3 rounded-lg text-sm font-medium transition-all text-left flex items-center justify-between group ${
                                    selectedStyle === styleKey 
                                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg ring-1 ring-white/30' 
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <div className="flex flex-col">
                                    <span className="font-bold">{styles[styleKey].label}</span>
                                    <span className={`text-[10px] ${selectedStyle === styleKey ? 'text-purple-100' : 'text-gray-500 group-hover:text-gray-400'}`}>
                                        {styles[styleKey].desc}
                                    </span>
                                </div>
                                {selectedStyle === styleKey && <Sparkles size={14} className="animate-spin-slow" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Column: Inputs */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Top Controls: Ratio & Upload */}
                    <div className="flex flex-col sm:flex-row gap-4">
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
                                            ? 'bg-purple-600 text-white ring-1 ring-purple-300' 
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
                                    className="border-2 border-dashed border-white/20 rounded-lg h-[42px] flex items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-white/5 transition-all text-gray-400 text-sm gap-2"
                                >
                                    <ImageIcon size={16} /> আপলোড
                                </div>
                            ) : (
                                <div className="relative h-[42px] bg-black/40 rounded-lg flex items-center px-3 border border-purple-500/50">
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
                        ছবির বর্ণনা (Prompt) - <span className="text-purple-300">{styles[selectedStyle].label}</span>
                        </label>
                        <div className="relative group">
                        <textarea
                            value={userPrompt}
                            onChange={(e) => setUserPrompt(e.target.value)}
                            placeholder="উদাহরণ: একটি মেয়ে জানালার পাশে বসে বই পড়ছে, বৃষ্টি হচ্ছে..."
                            rows={4}
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
                        তৈরি হচ্ছে...
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
        </div>
      </div>
    </div>
  );
}
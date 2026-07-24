import React from "react";

export function AbstractLight() {
  return (
    <section 
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ 
        background: "linear-gradient(135deg, #002f55 0%, #00508a 40%, #0083de 100%)" 
      }}
    >
      {/* Top light glow */}
      <div 
        className="absolute inset-0 opacity-50 mix-blend-overlay pointer-events-none"
        style={{
          background: "radial-gradient(circle at 50% -20%, rgba(255, 255, 255, 0.4) 0%, transparent 60%)"
        }}
      />
      
      {/* Bottom subtle glow */}
      <div 
        className="absolute inset-0 opacity-30 mix-blend-screen pointer-events-none"
        style={{
          background: "radial-gradient(circle at 80% 120%, #0083de 0%, transparent 50%)"
        }}
      />

      {/* SVG Noise Texture for refined 'matte' feel */}
      <div 
        className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")'
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center flex flex-col items-center">
        {/* Subtle Orange Accent */}
        <div className="w-12 h-1 bg-[#de5b00] rounded-full mb-8 shadow-sm"></div>
        
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium text-white tracking-tight mb-6">
          Ministry Resources Hub
        </h1>
        
        <p className="text-lg md:text-xl text-white/90 max-w-2xl font-light leading-relaxed drop-shadow-sm">
          A free digital library of practical discipleship tools for pastors and leaders for enhanced ministry impact.
        </p>

        {/* Optional decorative rays if needed, but linear/radial gradient is usually cleaner. */}
        <div className="mt-10 flex gap-4">
          <button className="px-8 py-3 bg-white text-[#002f55] font-medium rounded-md hover:bg-gray-50 transition-colors duration-300 shadow-lg">
            Explore Library
          </button>
          <button className="px-8 py-3 bg-transparent border border-white/30 text-white font-medium rounded-md hover:bg-white/10 transition-colors duration-300">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}

import React from 'react';

export function BibleCloseup() {
  return (
    <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden font-sans">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: "url('/__mockup/images/heroes/bible-closeup.png')",
          filter: "blur(2px) brightness(0.85)"
        }}
      />
      
      {/* Navy Overlay */}
      <div className="absolute inset-0 z-10 bg-[#002f55]/60 mix-blend-multiply" />
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#002f55]/40 via-transparent to-[#002f55]/80" />

      {/* Content */}
      <div className="relative z-20 max-w-4xl mx-auto px-6 text-center text-white flex flex-col items-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight mb-6 drop-shadow-md">
          Ministry Resources Hub
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed text-white/95 font-light drop-shadow">
          A free digital library of practical discipleship tools for pastors and leaders for enhanced ministry impact.
        </p>
        
        {/* Subtle orange accent divider */}
        <div className="w-16 h-1 bg-[#de5b00] mt-8 rounded-full opacity-80" />
      </div>
    </section>
  );
}

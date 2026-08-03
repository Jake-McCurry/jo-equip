import React from "react";

export function PhotoOverlay() {
  return (
    <section 
      className="relative w-full min-h-screen flex items-center justify-center overflow-hidden font-sans"
      style={{
        backgroundImage: "url('/__mockup/images/heroes/discipleship-group.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      {/* Navy gradient overlay for text readability */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          background: "radial-gradient(circle at center, rgba(0, 47, 85, 0.85) 0%, rgba(0, 47, 85, 0.6) 100%)",
        }}
      />
      
      {/* Additional solid overlay for extra safety if needed */}
      <div className="absolute inset-0 bg-[#002f55]/30 z-0" />

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 max-w-4xl mx-auto">
        <h1 className="text-white text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight mb-6">
          Ministry Resources Hub
        </h1>
        <p className="text-white/95 text-lg md:text-xl lg:text-2xl font-light leading-relaxed max-w-3xl">
          A free digital library of practical discipleship tools for pastors and leaders for enhanced ministry impact.
        </p>
        
        {/* Tiny orange accent just to bring in the brand colors implicitly */}
        <div className="mt-10 h-1 w-24 bg-[#de5b00] rounded-full opacity-80" />
      </div>
    </section>
  );
}

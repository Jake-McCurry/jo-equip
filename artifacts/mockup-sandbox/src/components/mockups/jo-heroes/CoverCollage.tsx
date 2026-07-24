import React from "react";
import "./_covercollage.css";

const covers = [
  "/__mockup/images/shelf/40-days-of-gods-love.jpg",
  "/__mockup/images/shelf/adventure-of-living-with-jesus.jpg",
  "/__mockup/images/shelf/beholding-the-majesty-of-god.jpg",
  "/__mockup/images/shelf/extraordinary-evangelism.jpg",
  "/__mockup/images/shelf/has-science-discovered-god.jpg",
  "/__mockup/images/shelf/hearing-the-voice-of-god.png",
  "/__mockup/images/shelf/from-coping-to-cure.jpg",
  "/__mockup/images/shelf/i-want-happiness-now.jpg",
  "/__mockup/images/shelf/eight-great-ways-to-honor-your-wife.jpg",
  "/__mockup/images/shelf/5-steps-to-break-destructive-behavior.jpg",
];

export function CoverCollage() {
  // Create a randomized grid by repeating and shuffling covers
  // For a static mockup, we'll just repeat the array a few times
  const columns = Array.from({ length: 8 }, (_, i) => {
    const isOffset = i % 2 !== 0;
    // mix up the order a bit for each column
    const columnCovers = [...covers].sort(() => Math.random() - 0.5);
    // double the length to make sure they span height
    const extendedCovers = [...columnCovers, ...columnCovers];
    
    return (
      <div key={i} className={`hero-collage-column ${isOffset ? 'offset' : ''}`}>
        {extendedCovers.map((src, j) => (
          <img key={`${i}-${j}`} src={src} alt="Book cover" className="hero-collage-img" />
        ))}
      </div>
    );
  });

  return (
    <section className="hero-collage-container min-h-screen flex items-center justify-center font-sans">
      <div className="hero-collage-grid">
        {columns}
      </div>
      <div className="hero-collage-overlay" />
      
      <div className="relative z-10 container mx-auto px-4 md:px-6 text-center max-w-4xl">
        <h1 className="text-white text-4xl md:text-5xl font-medium tracking-tight mb-6">
          Ministry Resources Hub
        </h1>
        <p className="text-white/90 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto font-light">
          A free digital library of practical discipleship tools for pastors and leaders for enhanced ministry impact.
        </p>
        
        <div className="mt-10 flex items-center justify-center gap-4">
          <button className="bg-[#0083de] hover:bg-[#0070be] text-white px-8 py-3 rounded-full font-medium transition-colors shadow-lg shadow-blue-900/20">
            Browse Library
          </button>
          <button className="bg-transparent border border-white/30 hover:bg-white/10 text-white px-8 py-3 rounded-full font-medium transition-colors">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}

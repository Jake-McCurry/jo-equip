import React from 'react';

export function PeopleCollage() {
  return (
    <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden bg-[#002f55]">
      {/* Background Collage */}
      <div className="absolute inset-0 z-0 opacity-70">
        <div className="grid grid-cols-2 md:grid-cols-3 grid-rows-2 h-full w-full gap-2 p-2">
          <div className="row-span-2 relative">
            <img 
              src="/__mockup/images/heroes/collage-pastor.png" 
              alt="Pastor preparing sermon" 
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <div className="relative">
            <img 
              src="/__mockup/images/heroes/collage-group.png" 
              alt="Small group studying" 
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <div className="relative hidden md:block">
            <img 
              src="/__mockup/images/heroes/collage-tablet.png" 
              alt="Watching video on tablet" 
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <div className="relative">
            <img 
              src="/__mockup/images/heroes/collage-coffee.png" 
              alt="One on one discipleship" 
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <div className="relative hidden md:block">
            <img 
              src="/__mockup/images/heroes/collage-phone.png" 
              alt="Reading devotional" 
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Overlays to ensure text readability */}
      <div className="absolute inset-0 z-10 bg-[#002f55]/25"></div>
      <div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#002f55]/60 via-[#002f55]/30 to-transparent"></div>

      {/* Content */}
      <div className="relative z-20 max-w-4xl mx-auto px-6 text-center flex flex-col items-center">
        <div className="mb-6 inline-flex items-center justify-center p-3 bg-white/10 rounded-full backdrop-blur-sm border border-white/20">
          <span className="text-[#de5b00] mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </span>
          <span className="text-white text-sm font-semibold uppercase tracking-wider">Equip JesusOnline</span>
        </div>
        
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium text-white mb-6 leading-tight drop-shadow-md">
          Ministry Resources Hub
        </h1>
        
        <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-10 leading-relaxed font-light drop-shadow-sm">
          A free digital library of practical discipleship tools for pastors and leaders for enhanced ministry impact.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="px-8 py-4 bg-[#de5b00] hover:bg-[#c24f00] text-white font-medium rounded shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            Browse Library
          </button>
          <button className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white border border-white/30 font-medium rounded backdrop-blur-sm transition-all duration-300">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}

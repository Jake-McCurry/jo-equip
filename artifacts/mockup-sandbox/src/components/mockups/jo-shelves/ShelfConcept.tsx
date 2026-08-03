import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, PlayCircle } from 'lucide-react';
import './_group.css';

const BOOKS = [
  { title: "40 Days of God's Love", image: "/__mockup/images/shelf/40-days-of-gods-love.jpg" },
  { title: "Adventure of Living with Jesus", image: "/__mockup/images/shelf/adventure-of-living-with-jesus.jpg" },
  { title: "Beholding the Majesty of God", image: "/__mockup/images/shelf/beholding-the-majesty-of-god.jpg" },
  { title: "Extraordinary Evangelism", image: "/__mockup/images/shelf/extraordinary-evangelism.jpg" },
  { title: "Has Science Discovered God?", image: "/__mockup/images/shelf/has-science-discovered-god.jpg" },
  { title: "Hearing the Voice of God", image: "/__mockup/images/shelf/hearing-the-voice-of-god.png" },
  { title: "From Coping to Cure", image: "/__mockup/images/shelf/from-coping-to-cure.jpg" },
  { title: "I Want Happiness Now", image: "/__mockup/images/shelf/i-want-happiness-now.jpg" },
  { title: "Eight Great Ways to Honor Your Wife", image: "/__mockup/images/shelf/eight-great-ways-to-honor-your-wife.jpg" },
  { title: "5 Steps to Break Destructive Behavior", image: "/__mockup/images/shelf/5-steps-to-break-destructive-behavior.jpg" },
];

const VIDEOS = [
  { id: "0MLbBGsWSXg", title: "Total Life Discipleship" },
  { id: "kIS9mGVCPMU", title: "Share Jesus" },
  { id: "2vk2ZQlaJZo", title: "Sermon Toolbox" },
];

const CHANNELS = [
  { title: "Evidence", color: "#3b5a99", desc: "Examine the facts behind the faith." },
  { title: "Growth", color: "#4c8a4c", desc: "Deepen your daily walk with Christ." },
  { title: "Church", color: "#7a3a8a", desc: "Resources for thriving communities." },
];

function Carousel({ 
  title, 
  children, 
  dark = false 
}: { 
  title: string, 
  children: React.ReactNode, 
  dark?: boolean 
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollBy = (amount: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative w-full">
      <div className="px-6 md:px-12 mb-4 flex items-center justify-between">
        <h2 className={`text-2xl md:text-3xl font-semibold tracking-tight ${dark ? 'text-white' : 'text-[#002f55]'}`}>
          {title}
        </h2>
        <button className="text-[#de5b00] font-medium hover:underline text-sm md:text-base flex items-center group">
          See all <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
        </button>
      </div>

      <div className="relative group/carousel">
        {/* Left Arrow */}
        <button 
          onClick={() => scrollBy(-400)}
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 md:p-3 rounded-r-xl shadow-lg opacity-0 group-hover/carousel:opacity-100 transition-opacity disabled:opacity-0 ${dark ? 'bg-[#002f55]/90 text-white hover:bg-[#00427a]' : 'bg-white/90 text-[#002f55] hover:bg-gray-50'}`}
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
        </button>

        {/* Scroll Container */}
        <div 
          ref={scrollRef}
          className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory px-6 md:px-12 gap-4 pb-8 pt-4"
        >
          {children}
        </div>

        {/* Right Arrow */}
        <button 
          onClick={() => scrollBy(400)}
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 md:p-3 rounded-l-xl shadow-lg opacity-0 group-hover/carousel:opacity-100 transition-opacity disabled:opacity-0 ${dark ? 'bg-[#002f55]/90 text-white hover:bg-[#00427a]' : 'bg-white/90 text-[#002f55] hover:bg-gray-50'}`}
          aria-label="Scroll right"
        >
          <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
        </button>
      </div>
    </div>
  );
}

export function ShelfConcept() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans antialiased selection:bg-[#de5b00] selection:text-white">
      
      {/* Hero Section */}
      <section className="bg-[#002f55] text-white pt-24 pb-20 px-6 md:px-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto relative z-10">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight leading-tight">
            Free Resources to Make & Multiply Disciples
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
            Equip yourself and your community with world-class discipleship books, video playlists, and ministry channels. All 100% free.
          </p>
          <button className="bg-[#0083de] hover:bg-[#0070be] text-white px-8 py-4 rounded-full font-semibold text-lg transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(0,131,222,0.4)]">
            Start Exploring Now
          </button>
        </div>
      </section>

      {/* Featured Books Shelf */}
      <section className="py-16 md:py-20 bg-white">
        <Carousel title="Featured Books">
          {BOOKS.map((book, i) => (
            <div 
              key={i} 
              className="flex-none w-[160px] md:w-[220px] snap-start group cursor-pointer"
            >
              <div className="aspect-[2/3] w-full rounded-lg overflow-hidden shadow-md transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-xl group-hover:shadow-[#002f55]/20 bg-gray-100 mb-4">
                <img 
                  src={book.image} 
                  alt={book.title} 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <h3 className="font-semibold text-[#002f55] text-sm md:text-base leading-tight group-hover:text-[#de5b00] transition-colors line-clamp-2">
                {book.title}
              </h3>
            </div>
          ))}
        </Carousel>
      </section>

      {/* Video Playlists Shelf */}
      <section className="py-16 md:py-20 bg-[#002f55] text-white">
        <Carousel title="Video Playlists" dark>
          {VIDEOS.map((video, i) => (
            <div 
              key={i} 
              className="flex-none w-[280px] md:w-[400px] snap-start group cursor-pointer"
            >
              <div className="aspect-video w-full rounded-xl overflow-hidden shadow-lg transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-black/50 bg-[#001f3f] mb-4 relative">
                <img 
                  src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} 
                  alt={video.title} 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/20 backdrop-blur-sm p-4 rounded-full group-hover:bg-[#de5b00] group-hover:scale-110 transition-all duration-300">
                    <PlayCircle className="w-8 h-8 md:w-10 md:h-10 text-white fill-white/20" />
                  </div>
                </div>
              </div>
              <h3 className="font-semibold text-white text-base md:text-lg leading-tight group-hover:text-[#de5b00] transition-colors">
                {video.title}
              </h3>
              <p className="text-sm text-blue-200 mt-1 opacity-80">Playlist • 12 videos</p>
            </div>
          ))}
          {/* Repeating videos to ensure scrolling effect for mockup */}
          {VIDEOS.map((video, i) => (
            <div 
              key={`repeat-${i}`} 
              className="flex-none w-[280px] md:w-[400px] snap-start group cursor-pointer"
            >
              <div className="aspect-video w-full rounded-xl overflow-hidden shadow-lg transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-black/50 bg-[#001f3f] mb-4 relative">
                <img 
                  src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} 
                  alt={video.title} 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/20 backdrop-blur-sm p-4 rounded-full group-hover:bg-[#de5b00] group-hover:scale-110 transition-all duration-300">
                    <PlayCircle className="w-8 h-8 md:w-10 md:h-10 text-white fill-white/20" />
                  </div>
                </div>
              </div>
              <h3 className="font-semibold text-white text-base md:text-lg leading-tight group-hover:text-[#de5b00] transition-colors">
                {video.title}
              </h3>
              <p className="text-sm text-blue-200 mt-1 opacity-80">Playlist • 12 videos</p>
            </div>
          ))}
        </Carousel>
      </section>

      {/* Explore Channels Shelf */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-[1600px] mx-auto">
          <div className="px-6 md:px-12 mb-8 flex items-center justify-between">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#002f55]">
              Explore Channels
            </h2>
          </div>
          
          <div className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory px-6 md:px-12 gap-6 pb-8">
            {CHANNELS.map((channel, i) => (
              <div 
                key={i}
                className="flex-none w-[300px] md:w-[400px] lg:flex-1 snap-start rounded-2xl p-8 md:p-10 text-white relative overflow-hidden group cursor-pointer transition-transform duration-300 hover:-translate-y-1 shadow-lg"
                style={{ backgroundColor: channel.color }}
              >
                {/* Decorative background element */}
                <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white opacity-10 group-hover:scale-150 transition-transform duration-700 ease-out" />
                
                <div className="relative z-10">
                  <h3 className="text-2xl md:text-3xl font-bold mb-3">{channel.title}</h3>
                  <p className="text-white/90 text-sm md:text-base leading-relaxed mb-8 max-w-[80%]">
                    {channel.desc}
                  </p>
                  <span className="inline-flex items-center text-sm font-semibold uppercase tracking-wider text-white group-hover:underline">
                    View Channel
                    <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Area Placeholder */}
      <footer className="bg-[#001f3f] text-white py-12 text-center">
        <p className="text-blue-200 text-sm">© {new Date().getFullYear()} JesusOnline Ministries. All rights reserved.</p>
      </footer>
    </div>
  );
}

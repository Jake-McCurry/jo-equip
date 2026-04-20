import React from "react";
import type { ChannelId } from "@/data/channels";

interface Props {
  channel: ChannelId;
  className?: string;
}

/* Generated thematic illustrations — lightweight SVG, on-brand */

function ChurchArt({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="church-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* sun glow */}
      <circle cx="250" cy="55" r="40" fill="#ffffff" opacity="0.12" />
      <circle cx="250" cy="55" r="22" fill="#ffffff" opacity="0.18" />
      {/* distant hills */}
      <path d="M0,150 Q60,120 120,140 T240,135 T320,145 L320,200 L0,200 Z" fill="rgba(255,255,255,0.08)" />
      <path d="M0,165 Q80,140 160,158 T320,160 L320,200 L0,200 Z" fill="rgba(255,255,255,0.12)" />

      {/* church body */}
      <g transform="translate(110,50)">
        {/* steeple base */}
        <rect x="42" y="30" width="16" height="40" fill="#ffffff" opacity="0.95" />
        {/* spire */}
        <polygon points="50,0 36,30 64,30" fill="#ffffff" opacity="0.95" />
        {/* cross */}
        <rect x="48.5" y="-12" width="3" height="14" fill="#ffffff" />
        <rect x="44" y="-7" width="12" height="3" fill="#ffffff" />
        {/* main building */}
        <rect x="10" y="70" width="80" height="60" fill="#ffffff" opacity="0.95" />
        {/* arched door */}
        <path d="M44 130 L44 108 Q50 100 56 108 L56 130 Z" fill={accent} />
        {/* windows */}
        <path d="M22 100 L22 90 Q26 84 30 90 L30 100 Z" fill={accent} opacity="0.7" />
        <path d="M70 100 L70 90 Q74 84 78 90 L78 100 Z" fill={accent} opacity="0.7" />
        {/* side wing left */}
        <rect x="-5" y="90" width="20" height="40" fill="#ffffff" opacity="0.85" />
        <path d="M0 110 L0 102 Q3 98 7 102 L7 110 Z" fill={accent} opacity="0.6" />
        {/* side wing right */}
        <rect x="85" y="90" width="20" height="40" fill="#ffffff" opacity="0.85" />
        <path d="M93 110 L93 102 Q96 98 100 102 L100 110 Z" fill={accent} opacity="0.6" />
      </g>
      {/* ground */}
      <rect x="0" y="180" width="320" height="20" fill="rgba(0,0,0,0.15)" />
      <rect x="0" y="180" width="320" height="200" fill="url(#church-sky)" />
    </svg>
  );
}

function GrowthArt({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {/* sun */}
      <circle cx="60" cy="50" r="28" fill="#ffffff" opacity="0.18" />
      <circle cx="60" cy="50" r="14" fill="#ffffff" opacity="0.25" />

      {/* small background sprouts */}
      <g opacity="0.4">
        <path d="M40 175 Q40 160 36 152 M40 175 Q40 162 44 154" stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" />
        <ellipse cx="35" cy="151" rx="6" ry="3" fill="#ffffff" transform="rotate(-30 35 151)" />
        <ellipse cx="45" cy="153" rx="6" ry="3" fill="#ffffff" transform="rotate(30 45 153)" />

        <path d="M280 175 Q280 158 274 148 M280 175 Q280 160 286 150" stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" />
        <ellipse cx="273" cy="147" rx="6" ry="3" fill="#ffffff" transform="rotate(-30 273 147)" />
        <ellipse cx="287" cy="149" rx="6" ry="3" fill="#ffffff" transform="rotate(30 287 149)" />
      </g>

      {/* main tree/sprout */}
      <g transform="translate(160,180)">
        {/* trunk */}
        <path d="M-3 0 L-3 -55 Q-3 -65 0 -68 Q3 -65 3 -55 L3 0 Z" fill="#ffffff" opacity="0.95" />
        {/* lower leaves */}
        <ellipse cx="-22" cy="-50" rx="20" ry="9" fill="#ffffff" opacity="0.9" transform="rotate(-25 -22 -50)" />
        <ellipse cx="22" cy="-50" rx="20" ry="9" fill="#ffffff" opacity="0.9" transform="rotate(25 22 -50)" />
        {/* mid leaves */}
        <ellipse cx="-30" cy="-80" rx="22" ry="10" fill="#ffffff" opacity="0.95" transform="rotate(-20 -30 -80)" />
        <ellipse cx="30" cy="-80" rx="22" ry="10" fill="#ffffff" opacity="0.95" transform="rotate(20 30 -80)" />
        {/* top leaves */}
        <ellipse cx="-18" cy="-110" rx="20" ry="9" fill="#ffffff" transform="rotate(-30 -18 -110)" />
        <ellipse cx="18" cy="-110" rx="20" ry="9" fill="#ffffff" transform="rotate(30 18 -110)" />
        <ellipse cx="0" cy="-125" rx="14" ry="8" fill="#ffffff" />
        {/* fruit dots */}
        <circle cx="-15" cy="-85" r="3.5" fill={accent} />
        <circle cx="20" cy="-95" r="3.5" fill={accent} />
        <circle cx="-5" cy="-115" r="3.5" fill={accent} />
        <circle cx="10" cy="-105" r="3" fill={accent} opacity="0.85" />
      </g>

      {/* ground */}
      <ellipse cx="160" cy="190" rx="180" ry="14" fill="rgba(0,0,0,0.18)" />
    </svg>
  );
}

function EvidenceArt({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {/* subtle background sparkles */}
      <circle cx="50" cy="40" r="2" fill="#ffffff" opacity="0.5" />
      <circle cx="280" cy="55" r="2.5" fill="#ffffff" opacity="0.4" />
      <circle cx="290" cy="160" r="2" fill="#ffffff" opacity="0.4" />
      <circle cx="35" cy="155" r="2" fill="#ffffff" opacity="0.4" />

      {/* open book */}
      <g transform="translate(60,70)">
        {/* book shadow */}
        <ellipse cx="100" cy="118" rx="100" ry="8" fill="rgba(0,0,0,0.2)" />
        {/* left page */}
        <path d="M5 20 Q50 8 100 20 L100 110 Q50 100 5 110 Z" fill="#ffffff" opacity="0.95" />
        {/* right page */}
        <path d="M195 20 Q150 8 100 20 L100 110 Q150 100 195 110 Z" fill="#ffffff" opacity="0.95" />
        {/* spine shadow */}
        <line x1="100" y1="20" x2="100" y2="110" stroke={accent} strokeWidth="1.5" opacity="0.4" />
        {/* page lines left */}
        <line x1="20" y1="38" x2="92" y2="33" stroke={accent} strokeWidth="1.5" opacity="0.55" />
        <line x1="20" y1="48" x2="92" y2="44" stroke={accent} strokeWidth="1.5" opacity="0.4" />
        <line x1="20" y1="58" x2="80" y2="55" stroke={accent} strokeWidth="1.5" opacity="0.4" />
        <line x1="20" y1="68" x2="92" y2="66" stroke={accent} strokeWidth="1.5" opacity="0.4" />
        <line x1="20" y1="78" x2="75" y2="76" stroke={accent} strokeWidth="1.5" opacity="0.4" />
        {/* page lines right */}
        <line x1="108" y1="33" x2="180" y2="38" stroke={accent} strokeWidth="1.5" opacity="0.55" />
        <line x1="108" y1="44" x2="180" y2="48" stroke={accent} strokeWidth="1.5" opacity="0.4" />
        <line x1="108" y1="55" x2="170" y2="58" stroke={accent} strokeWidth="1.5" opacity="0.4" />
        <line x1="108" y1="66" x2="180" y2="68" stroke={accent} strokeWidth="1.5" opacity="0.4" />
        <line x1="108" y1="76" x2="165" y2="78" stroke={accent} strokeWidth="1.5" opacity="0.4" />
      </g>

      {/* magnifying glass over the right page */}
      <g transform="translate(190,75)">
        {/* handle */}
        <line x1="48" y1="48" x2="78" y2="78" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" />
        <line x1="48" y1="48" x2="78" y2="78" stroke={accent} strokeWidth="4" strokeLinecap="round" opacity="0.6" />
        {/* lens ring */}
        <circle cx="28" cy="28" r="28" fill="rgba(255,255,255,0.25)" stroke="#ffffff" strokeWidth="5" />
        <circle cx="28" cy="28" r="28" fill="none" stroke={accent} strokeWidth="2" opacity="0.4" />
        {/* highlight */}
        <ellipse cx="18" cy="18" rx="7" ry="4" fill="#ffffff" opacity="0.6" transform="rotate(-30 18 18)" />
      </g>
    </svg>
  );
}

export function ChannelArt({ channel, className = "" }: Props) {
  const accent =
    channel === "church" ? "#5b3a8a" :
    channel === "growth" ? "#00855c" :
    "#de5b00";

  return (
    <div className={className}>
      {channel === "church" && <ChurchArt accent={accent} />}
      {channel === "growth" && <GrowthArt accent={accent} />}
      {channel === "evidence" && <EvidenceArt accent={accent} />}
    </div>
  );
}

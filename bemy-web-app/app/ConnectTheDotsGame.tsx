'use client';

import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useSearchParams } from 'next/navigation';

const CANVAS_W = 700;
const CANVAS_H = 250;
const ZOOM_W = 175;
const ZOOM_H = 130;

// Dots spell "I ♥ U" spread across a wide canvas.
// Camera starts zoomed on the "I", pans through "♥", then "U", then zooms out to reveal the full message.
const DOTS: { x: number; y: number }[] = [
  // === I (straight vertical line) ===
  { x: 80,  y: 55  }, // 0
  { x: 80,  y: 95  }, // 1
  { x: 80,  y: 135 }, // 2
  { x: 80,  y: 175 }, // 3

  // === ♥ (scaled 1.5x from center 297,143) ===
  { x: 170, y: 97 }, // 4  - left mid
  { x: 177, y: 57  }, // 5  - left upper
  { x: 220, y: 36  }, // 6  - left peak
  { x: 260, y: 55  }, // 7  - left-center
  { x: 297, y: 91  }, // 8  - center dip
  { x: 350, y: 55  }, // 9  - right-center
  { x: 390, y: 36  }, // 10 - right peak
  { x: 420, y: 57  }, // 11 - right upper
  { x: 430, y: 97 }, // 12 - right mid
  { x: 410, y: 158 }, // 13 - right lower
  { x: 380, y: 182 }, // 14 - lower right
  { x: 338, y: 215 }, // 15 - bottom right
  { x: 297, y: 240 }, // 16 - bottom tip
  { x: 260, y: 215 }, // 17 - bottom left
  { x: 220, y: 182 }, // 18 - lower left
  { x: 170, y: 108 }, // 19 - left lower

  // === U ===
  { x: 470, y: 55  }, // 20 - top-left
  { x: 470, y: 120 }, // 21 - mid-left
  { x: 478, y: 163 }, // 22 - lower-left
  { x: 513, y: 188 }, // 23 - bottom center
  { x: 548, y: 163 }, // 24 - lower-right
  { x: 556, y: 120 }, // 25 - mid-right
  { x: 556, y: 55  }, // 26 - top-right
];

const FULL_VB = { x: -35, y: -35, w: CANVAS_W + 70, h: CANVAS_H + 70 };

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function vbForDot(dot: { x: number; y: number }) {
  return {
    x: clamp(dot.x - ZOOM_W / 2, 0, CANVAS_W - ZOOM_W),
    y: clamp(dot.y - ZOOM_H / 2, 0, CANVAS_H - ZOOM_H),
    w: ZOOM_W,
    h: ZOOM_H,
  };
}

function CatSprite({ x, y, facingLeft }: { x: number; y: number; facingLeft: boolean }) {
  const flip = facingLeft ? 1 : -1;
  return (
    <g transform={`translate(${x},${y - 20}) scale(${flip},1)`} style={{ pointerEvents: 'none' }}>

  {/* tail */}
  <path
    d="M 10,12 Q 22,2 16,18 Q 14,22 8,16"
    stroke="#f4a261"
    strokeWidth="3"
    fill="none"
    strokeLinecap="round"
  />

  {/* body (tiny) */}
  <ellipse cx="0" cy="14" rx="8" ry="6" fill="#f4a261" />

  {/* paws */}
  <ellipse cx="-4" cy="18" rx="2" ry="1.5" fill="#f4a261" />
  <ellipse cx="4" cy="18" rx="2" ry="1.5" fill="#f4a261" />

  {/* head (big + round) */}
  <circle cx="0" cy="0" r="12" fill="#f4a261" />

  {/* ears */}
  <polygon points="-7,-6 -13,-18 -3,-10" fill="#f4a261" />
  <polygon points="7,-6 13,-18 3,-10" fill="#f4a261" />

  {/* inner ears */}
  <polygon points="-7,-8 -10.5,-15 -4,-11" fill="#ffb8c6" />
  <polygon points="7,-8 10.5,-15 4,-11" fill="#ffb8c6" />

  {/* eyes (BIG + sparkly) */}
  <ellipse cx="-5" cy="-2" rx="2.5" ry="3.2" fill="#222" />
  <ellipse cx="5" cy="-2" rx="2.5" ry="3.2" fill="#222" />
  <circle cx="-4.2" cy="-3.5" r="1" fill="white" />
  <circle cx="5.8" cy="-3.5" r="1" fill="white" />
  <circle cx="-5.5" cy="-1" r="0.6" fill="white" opacity="0.8" />
  <circle cx="4.5" cy="-1" r="0.6" fill="white" opacity="0.8" />

  {/* blush */}
  <ellipse cx="-8" cy="2" rx="2" ry="1.2" fill="#ffb8c6" opacity="0.6" />
  <ellipse cx="8" cy="2" rx="2" ry="1.2" fill="#ffb8c6" opacity="0.6" />

  {/* nose */}
  <polygon points="0,1 -1.5,3 1.5,3" fill="#ff8fab" />

  {/* mouth (cute w shape) */}
  <path
    d="M -1.5,3.5 Q 0,5.5 1.5,3.5"
    stroke="#222"
    strokeWidth="1"
    fill="none"
    strokeLinecap="round"
  />

  {/* whiskers */}
  <line x1="-14" y1="0" x2="-7" y2="0" stroke="#555" strokeWidth="1" strokeLinecap="round" />
  <line x1="-14" y1="3" x2="-7" y2="2" stroke="#555" strokeWidth="1" strokeLinecap="round" />
  <line x1="7" y1="0" x2="14" y2="0" stroke="#555" strokeWidth="1" strokeLinecap="round" />
  <line x1="7" y1="2" x2="14" y2="3" stroke="#555" strokeWidth="1" strokeLinecap="round" />

</g>


  );
}

function decodeName(raw: string | null): string | null {
  if (!raw) return null;
  try {
    // URL-safe base64 → standard base64
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    return atob(b64);
  } catch {
    return null;
  }
}

export default function ConnectTheDotsGame() {
  const searchParams = useSearchParams();
  const name = decodeName(searchParams.get('q'));

  const [connected, setConnected] = useState<number[]>([0]);
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState<'yes' | null>(null);
  const [noPos, setNoPos] = useState({ x: 0, y: 0 });
  const [showShare, setShowShare] = useState(false);
  const [shareInput, setShareInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const audioRef  = useRef<HTMLAudioElement | null>(null);
  const swooshRef = useRef<HTMLAudioElement | null>(null);
  const wowRef    = useRef<HTMLAudioElement | null>(null);
  const cheeringRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/bg-music.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.4;
    }
    if (musicOn) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [musicOn]);

  useEffect(() => {
    swooshRef.current = new Audio('/swoosh.mp3');
    swooshRef.current.volume = 0.5;
    wowRef.current = new Audio('/wow.mp3');
    wowRef.current.volume = 0.7;
    cheeringRef.current = new Audio('/cheering.mp3');
    cheeringRef.current.volume = 0.7;
    return () => { audioRef.current?.pause(); };
  }, []);

  const catRef        = useRef({ x: -50, y: DOTS[0].y });
  const catTargetRef  = useRef({ x: DOTS[0].x, y: DOTS[0].y });
  const vbRef         = useRef(vbForDot(DOTS[0]));
  const vbTargetRef   = useRef(vbForDot(DOTS[0]));
  const facingLeftRef = useRef(false);
  const rafRef        = useRef<number | null>(null);

  // Single animation loop for both cat movement and camera pan
  const [, forceRender] = useState(0);
  useEffect(() => {
    const loop = () => {
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

      // animate cat
      const cat = catRef.current;
      const tgt = catTargetRef.current;
      const dx = tgt.x - cat.x;
      const dy = tgt.y - cat.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.6) {
        const spd = Math.min(3.8, dist * 0.11);
        catRef.current = { x: cat.x + (dx / dist) * spd, y: cat.y + (dy / dist) * spd };
        if (Math.abs(dx) > 0.2) facingLeftRef.current = dx < 0;
      }

      // animate camera
      const vb  = vbRef.current;
      const vbt = vbTargetRef.current;
      const T = 0.055;
      vbRef.current = {
        x: lerp(vb.x, vbt.x, T),
        y: lerp(vb.y, vbt.y, T),
        w: lerp(vb.w, vbt.w, T),
        h: lerp(vb.h, vbt.h, T),
      };

      forceRender(n => n + 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const handleDotClick = (i: number) => {
    if (connected.length !== i) return;
    const next = [...connected, i];
    setConnected(next);
    catTargetRef.current = DOTS[i];
    
    if (next.length === DOTS.length) {
       if (wowRef.current) {
          wowRef.current.currentTime = 0;
          wowRef.current.play().catch(() => {});
      }
      vbTargetRef.current = FULL_VB;
     
      setTimeout(() => setRevealed(true), 1500);
    } else {
      if (swooshRef.current) {
      swooshRef.current.currentTime = 0;
      swooshRef.current.play().catch(() => {});
    }
      // pan camera to the NEXT dot so user always sees where to click
      setTimeout(() => {
        vbTargetRef.current = vbForDot(DOTS[i + 1]);
      }, 700);
    }
  };

  const catPos     = catRef.current;
  const vb         = vbRef.current;
  const facingLeft = facingLeftRef.current;
  const vbStr      = `${vb.x.toFixed(2)} ${vb.y.toFixed(2)} ${vb.w.toFixed(2)} ${vb.h.toFixed(2)}`;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh',
      background: 'linear-gradient(135deg, #ffe8f0 0%, #ffd6e8 100%)',
      padding: '20px', fontFamily: 'Georgia, serif',
    }}>
      <p style={{
        color: '#c2185b', marginBottom: '14px', fontSize: '0.9rem',
        letterSpacing: '0.04em', opacity: 0.85, margin: '0 0 14px',
      }}>
        Connect the dots in order ✨
      </p>

      <button
        onClick={() => setMusicOn(v => !v)}
        title={musicOn ? 'Mute music' : 'Play music'}
        style={{
          position: 'fixed', top: '16px', right: '16px',
          width: '40px', height: '40px', borderRadius: '50%',
          border: '2px solid #f48fb1', background: musicOn ? '#e91e63' : 'white',
          color: musicOn ? 'white' : '#e91e63', fontSize: '1.1rem',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          zIndex: 50,
        }}
      >
        {musicOn ? '🎵' : '🔇'}
      </button>

      <div style={{
        background: '#fff9fb', borderRadius: '18px',
        boxShadow: '0 6px 36px rgba(194,24,91,0.16)',
        overflow: 'hidden', width: '100%', maxWidth: '900px',
      }}>
        <svg viewBox={vbStr} style={{ width: '100%', height: 'auto', display: 'block' }}>

          {/* Connecting lines — skip joins between letters */}
          {connected.slice(1).map((dotIdx, i) => {
            const fromIdx = connected[i];
            // 3→4 is I-to-heart, 19→20 is heart-to-U
            if (fromIdx === 3 || fromIdx === 19) return null;
            const from = DOTS[fromIdx];
            const to   = DOTS[dotIdx];
            return (
              <line key={i}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke="#f48fb1" strokeWidth="2.5" strokeLinecap="round"
              />
            );
          })}

          {/* Dots */}
          {DOTS.map((dot, i) => {
            const isNext = connected.length === i;
            const isDone = i < connected.length;
            return (
              <g key={i} onClick={() => handleDotClick(i)}
                style={{ cursor: isNext ? 'pointer' : 'default' }}>
                <circle
                  cx={dot.x} cy={dot.y}
                  r={isNext ? 9 : 6}
                  fill={isDone ? '#f06292' : isNext ? '#e91e63' : '#fce4ec'}
                  stroke={isNext ? '#c2185b' : '#f48fb1'}
                  strokeWidth="1.5"
                />
                {!isDone && (
                  <text
                    x={dot.x} y={dot.y + 3.5}
                    textAnchor="middle"
                    fontSize={isNext ? '5.5' : '4.5'}
                    fill={isNext ? 'white' : '#c2185b'}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    
                  </text>
                )}
              </g>
            );
          })}

          {/* Cat */}
          <CatSprite x={catPos.x} y={catPos.y} facingLeft={facingLeft} />

          {/* Reveal label after zoom-out */}
          {revealed && (
            <>
              <text
                x={CANVAS_W / 2} y={CANVAS_H + 20}
                textAnchor="middle" fontSize="22" fill="#c2185b"
                fontFamily="Georgia, serif" fontWeight="bold"
              >
                I ♥ U
              </text>
              {[-220, -130, 130, 220].map((offset, i) => (
                <text key={i}
                  x={CANVAS_W / 2 + offset} y={CANVAS_H + 20}
                  textAnchor="middle" fontSize="14" fill="#f48fb1"
                  opacity="0.7"
                >
                  ♥
                </text>
              ))}
            </>
          )}
        </svg>
      </div>

      <p style={{ marginTop: '12px', fontSize: '0.78rem', color: '#e91e63', opacity: 0.65 }}>
        {connected.length} / {DOTS.length} dots connected
      </p>

      {revealed && !answer && (
        <div style={{
          marginTop: '22px', textAlign: 'center',
          animation: 'fadeInUp 0.9s ease both',
        }}>
          <div style={{ fontSize: '1.45rem', color: '#c2185b', fontWeight: 'bold', marginBottom: '18px' }}>
            💌 {'Will you be my Valentine?'} 💌
          </div>
           <div style={{ fontSize: '1.45rem', color: '#c2185b', fontWeight: 'bold', marginBottom: '18px' }}>
             {name ? name : ''} 
          </div>
          
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'center' }}>
            <button
              onClick={() => {
                setAnswer('yes');
                if (cheeringRef.current) {
                  cheeringRef.current.pause();
                  cheeringRef.current.currentTime = 0;
                  cheeringRef.current.play().catch(() => {});
                }
                confetti({
                  particleCount: 120,
                  spread: 90,
                  origin: { y: 0.6 },
                  zIndex: 9999
                });
              }}
              style={{
                padding: '12px 32px', fontSize: '1.1rem', fontWeight: 'bold',
                background: '#e91e63', color: 'white', border: 'none',
                borderRadius: '999px', cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(233,30,99,0.35)',
              }}
            >
              Yes 💖
            </button>
            <button
              onMouseEnter={() => setNoPos({
                x: (Math.random() - 0.5) * 300,
                y: (Math.random() - 0.5) * 200,
              })}
              style={{
                padding: '12px 32px', fontSize: '1.1rem', fontWeight: 'bold',
                background: 'white', color: '#aaa', border: '2px solid #ddd',
                borderRadius: '999px', cursor: 'pointer',
                transform: `translate(${noPos.x}px, ${noPos.y}px)`,
                transition: 'transform 0.15s ease',
              }}
            >
              No
            </button>
          </div>
        </div>
      )}

      {answer === 'yes' && (
        <div style={{ marginTop: '22px', textAlign: 'center', animation: 'fadeInUp 0.6s ease both' }}>
          <div style={{ fontSize: '1.6rem', color: '#c2185b', fontWeight: 'bold', marginBottom: '16px' }}>
            🎉 Yay! Happy Valentine's Day! 🌹
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => {
              setConnected([0]);
              setRevealed(false);
              setAnswer(null);
              setNoPos({ x: 0, y: 0 });
              catRef.current = { x: -50, y: DOTS[0].y };
              catTargetRef.current = { x: DOTS[0].x, y: DOTS[0].y };
              vbRef.current = vbForDot(DOTS[0]);
              vbTargetRef.current = vbForDot(DOTS[0]);
            }}
            style={{
              padding: '10px 26px', fontSize: '0.95rem', fontWeight: 'bold',
              background: 'white', color: '#888', border: '2px solid #ddd',
              borderRadius: '999px', cursor: 'pointer',
            }}
          >
            Play again 🔄
          </button>
          <button
            onClick={() => { setShowShare(true); setCopied(false); setShareInput(''); }}
            style={{
              padding: '10px 26px', fontSize: '0.95rem', fontWeight: 'bold',
              background: 'white', color: '#e91e63', border: '2px solid #e91e63',
              borderRadius: '999px', cursor: 'pointer',
            }}
          >
            Share with someone 💌
          </button>
          </div>
        </div>
      )}

      {/* Share modal */}
      {showShare && (
        <div
          onClick={() => setShowShare(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: '20px', padding: '32px',
              width: '90%', maxWidth: '380px', textAlign: 'center',
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#c2185b', marginBottom: '8px' }}>
              Send to someone special 💖
            </div>
            <p style={{ fontSize: '0.85rem', color: '#888', margin: '0 0 18px' }}>
              Enter their name to generate a link
            </p>
            <input
              value={shareInput}
              onChange={e => { setShareInput(e.target.value); setCopied(false); }}
              placeholder="Their name..."
              style={{
                width: '100%', padding: '10px 14px', fontSize: '1rem',
                border: '2px solid #f48fb1', borderRadius: '10px',
                outline: 'none', boxSizing: 'border-box', marginBottom: '14px',
                color: '#333',
              }}
            />
            {shareInput.trim() && (() => {
              const encoded = btoa(shareInput.trim()).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
              const url = `${typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''}?q=${encoded}`;
              return (
                <div>
                  <div style={{
                    background: '#fff0f5', border: '1px solid #f48fb1', borderRadius: '8px',
                    padding: '8px 12px', fontSize: '0.75rem', color: '#c2185b',
                    wordBreak: 'break-all', marginBottom: '12px', textAlign: 'left',
                  }}>
                    {url}
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(url); setCopied(true); }}
                    style={{
                      width: '100%', padding: '11px', fontSize: '1rem', fontWeight: 'bold',
                      background: copied ? '#4caf50' : '#e91e63', color: 'white',
                      border: 'none', borderRadius: '10px', cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    {copied ? '✓ Copied!' : 'Copy link'}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

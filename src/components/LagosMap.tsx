import clsx from 'clsx';
import type { Point } from '../lib/types';
import { AREAS, DEPOT } from '../lib/seed';
import type { Tone } from '../lib/format';

export interface MapVehicle { id: string; label: string; pos: Point; live: boolean; selected?: boolean; caption?: string }
export interface MapPin { id: string; pos: Point; label?: string; seq?: number; tone: Tone; selected?: boolean }

const toneFill: Record<Tone, string> = {
  success: '#237A50', warning: '#B7791F', error: '#C43D3D', info: '#3478B8', neutral: '#77827B', brand: '#174B3D',
};

/**
 * Schematic map of the Lagos service area used throughout the demo.
 * Production replaces this with Google Maps (Maps JavaScript API / Maps SDK) — see Integrations.
 */
export function LagosMap({
  vehicles = [], pins = [], route, className, showLabels = true, onVehicleClick, showDepot = true, crop,
}: {
  vehicles?: MapVehicle[]; pins?: MapPin[]; route?: Point[]; className?: string; showLabels?: boolean;
  onVehicleClick?: (id: string) => void; showDepot?: boolean; crop?: string;
}) {
  return (
    <div className={clsx('relative overflow-hidden rounded-xl border border-line bg-[#EEF0E8]', className)}>
      <svg viewBox={crop ?? '0 0 1000 620'} className="h-full w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Schematic map of Lagos delivery area">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#e2e5da" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="1000" height="620" fill="url(#grid)" />
        {/* Water */}
        <path d="M0,545 C220,520 520,565 1000,532 L1000,620 L0,620 Z" fill="#D5E4E1" />
        <path d="M430,330 C520,300 650,290 760,315 C860,335 940,330 1000,325 L1000,415 C900,420 820,418 740,412 C680,408 640,395 610,384 C560,368 520,388 470,398 C440,402 418,370 430,330 Z" fill="#D5E4E1" />
        <path d="M160,425 C260,405 360,398 450,394 C485,393 505,400 525,410 L522,432 C470,423 380,428 300,444 C240,455 195,460 160,452 Z" fill="#D5E4E1" />
        <text x="760" y="372" className="fill-[#8eaaa5] text-[15px] italic" fontFamily="Inter">Lagos Lagoon</text>
        <text x="640" y="590" className="fill-[#8eaaa5] text-[15px] italic" fontFamily="Inter">Atlantic Ocean</text>
        {/* Roads */}
        <g fill="none" strokeLinecap="round">
          {[
            'M330,118 C420,100 470,95 520,92',
            'M330,118 L392,190 L425,292 L300,372',
            'M392,190 L478,205',
            'M300,282 L425,292',
            'M478,205 C500,280 525,345 575,432',
            'M300,372 C380,400 450,440 505,476',
            'M505,476 C600,470 700,462 1000,470',
            'M60,420 C150,400 220,385 300,372',
          ].map((d) => (
            <g key={d}>
              <path d={d} stroke="#d9dccf" strokeWidth="9" />
              <path d={d} stroke="#ffffff" strokeWidth="5" />
            </g>
          ))}
        </g>
        {/* Area labels */}
        {showLabels && Object.entries(AREAS).map(([name, p]) => (
          <g key={name}>
            <circle cx={p.x} cy={p.y} r="3" fill="#b9bfae" />
            <text x={p.x + 7} y={p.y - 6} fontFamily="Inter" fontSize="12" fontWeight={500} fill="#77827B">{name}</text>
          </g>
        ))}
        {/* Depot */}
        {showDepot && (
          <g>
            <rect x={DEPOT.pos.x - 12} y={DEPOT.pos.y - 12} width="24" height="24" rx="6" fill="#0B2924" />
            <path d={`M${DEPOT.pos.x - 6} ${DEPOT.pos.y + 5} V${DEPOT.pos.y - 2} L${DEPOT.pos.x} ${DEPOT.pos.y - 7} L${DEPOT.pos.x + 6} ${DEPOT.pos.y - 2} V${DEPOT.pos.y + 5}Z`} fill="#D7C18A" />
            <text x={DEPOT.pos.x + 17} y={DEPOT.pos.y + 22} fontFamily="Inter" fontSize="12" fontWeight={700} fill="#0B2924">{DEPOT.name}</text>
          </g>
        )}
        {/* Route */}
        {route && route.length > 1 && (
          <polyline points={route.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#174B3D" strokeWidth="3" strokeDasharray="7 6" opacity=".7" />
        )}
        {/* Stops */}
        {pins.map((p) => (
          <g key={p.id}>
            {p.selected && <circle cx={p.pos.x} cy={p.pos.y} r="17" fill="none" stroke="#D7C18A" strokeWidth="3" />}
            <circle cx={p.pos.x} cy={p.pos.y} r="12" fill={toneFill[p.tone]} stroke="#fff" strokeWidth="2.5" />
            <text x={p.pos.x} y={p.pos.y + 4} textAnchor="middle" fontFamily="Inter" fontSize="11" fontWeight={700} fill="#fff">{p.seq ?? '•'}</text>
            {p.label && <text x={p.pos.x} y={p.pos.y + 28} textAnchor="middle" fontFamily="Inter" fontSize="11" fontWeight={600} fill="#252A27" stroke="#EEF0E8" strokeWidth="3" paintOrder="stroke">{p.label}</text>}
          </g>
        ))}
        {/* Vehicles */}
        {vehicles.map((v) => (
          <g key={v.id} onClick={() => onVehicleClick?.(v.id)} className={onVehicleClick ? 'cursor-pointer' : ''} style={{ transition: 'transform 1.4s linear' }} transform={`translate(${v.pos.x},${v.pos.y})`}>
            {v.live && <circle r="14" fill="#D7C18A" className="pulse-ring" />}
            <circle r="15" fill={v.live ? '#0B2924' : '#ffffff'} stroke={v.live ? '#D7C18A' : '#77827B'} strokeWidth="3" strokeDasharray={v.live ? undefined : '4 3'} />
            <path d="M-8,-3 h9 v8 h-9z M1,0 h4 l3,3 v2 h-7z" fill={v.live ? '#D7C18A' : '#77827B'} />
            <circle cx="-5" cy="6" r="1.8" fill={v.live ? '#D7C18A' : '#77827B'} />
            <circle cx="4" cy="6" r="1.8" fill={v.live ? '#D7C18A' : '#77827B'} />
            {v.selected && <circle r="21" fill="none" stroke="#D7C18A" strokeWidth="2" />}
            <g transform="translate(0,-26)">
              <rect x={-(v.label.length * 3.6 + 8)} y="-11" width={v.label.length * 7.2 + 16} height="18" rx="9" fill={v.live ? '#0B2924' : '#77827B'} />
              <text textAnchor="middle" y="2" fontFamily="Inter" fontSize="11" fontWeight={700} fill="#fff">{v.label}</text>
            </g>
            {v.caption && <text y="32" textAnchor="middle" fontFamily="Inter" fontSize="10.5" fontWeight={600} fill="#B7791F" stroke="#EEF0E8" strokeWidth="3" paintOrder="stroke">{v.caption}</text>}
          </g>
        ))}
      </svg>
      <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-white/85 px-2 py-1 text-[10px] font-medium text-ink-soft">
        Schematic demo map · production: Google Maps Platform
      </div>
    </div>
  );
}

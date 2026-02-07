'use client';

import { useId } from 'react';

type MeetingProvider = 'teams' | 'zoom' | 'calendly' | 'meet';
type IconVariant = 'live' | 'idle';

interface MeetingProviderIconProps {
  provider: MeetingProvider;
  variant?: IconVariant;
  size?: string;
  isMuted?: boolean;
  className?: string;
}

const ariaLabels: Record<MeetingProvider, string> = {
  teams: 'Teams Meeting',
  zoom: 'Zoom Meeting',
  calendly: 'Calendly',
  meet: 'Google Meet',
};

function TeamsSvg({ gradientId, className }: { gradientId: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 2228.833 2073.333"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Teams Meeting"
    >
      <path
        fill="#5059C9"
        d="M1554.637 777.5h575.713c54.391 0 98.483 44.092 98.483 98.483v524.398c0 199.901-162.051 361.952-361.952 361.952h-1.711c-199.901.028-361.975-162.023-362.004-361.924V828.971c.001-28.427 23.045-51.471 51.471-51.471z"
      />
      <circle fill="#5059C9" cx="1943.75" cy="440.583" r="233.25" />
      <circle fill="#7B83EB" cx="1218.083" cy="336.917" r="336.917" />
      <path
        fill="#7B83EB"
        d="M1667.323 777.5H717.01c-53.743 1.33-96.257 45.931-95.01 99.676v598.105c-7.505 322.519 247.657 590.16 570.167 598.053 322.51-7.893 577.671-275.534 570.167-598.053V877.176c1.245-53.745-41.268-98.346-95.011-99.676z"
      />
      <linearGradient
        id={gradientId}
        gradientUnits="userSpaceOnUse"
        x1="198.099"
        y1="1683.0726"
        x2="942.2344"
        y2="394.2607"
        gradientTransform="matrix(1 0 0 -1 0 2075.3333)"
      >
        <stop offset="0" stopColor="#5a62c3" />
        <stop offset=".5" stopColor="#4d55bd" />
        <stop offset="1" stopColor="#3940ab" />
      </linearGradient>
      <path
        fill={`url(#${gradientId})`}
        d="M95.01 466.5h950.312c52.473 0 95.01 42.538 95.01 95.01v950.312c0 52.473-42.538 95.01-95.01 95.01H95.01c-52.473 0-95.01-42.538-95.01-95.01V561.51c0-52.472 42.538-95.01 95.01-95.01z"
      />
      <path
        fill="#FFF"
        d="M820.211 828.193H630.241v517.297H509.211V828.193H320.123V727.844h500.088v100.349z"
      />
    </svg>
  );
}

function ZoomSvg({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Zoom Meeting"
    >
      <rect width="512" height="512" rx="85" fill="#2D8CFF" />
      <path
        fill="#fff"
        d="M310 178H148c-16.5 0-30 13.5-30 30v96c0 16.5 13.5 30 30 30h162c16.5 0 30-13.5 30-30v-96c0-16.5-13.5-30-30-30zm84 6v144l-48-36v-72l48-36z"
      />
    </svg>
  );
}

function CalendlySvg({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Calendly"
    >
      <rect width="120" height="120" rx="24" fill="#006BFF" />
      <rect x="28" y="38" width="64" height="54" rx="6" fill="none" stroke="#fff" strokeWidth="5" />
      <path d="M28 52h64" stroke="#fff" strokeWidth="5" />
      <circle cx="42" cy="34" r="4" fill="#fff" />
      <circle cx="78" cy="34" r="4" fill="#fff" />
      <path
        d="M44 68l10 10 22-22"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function GoogleMeetSvg({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 87.5 72"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Google Meet"
      preserveAspectRatio="xMidYMid meet"
    >
      <path fill="#00832d" d="M49.5 36l8.53 9.75 11.47 7.33 2-17.02-2-16.64-11.69 6.44z" />
      <path fill="#0066da" d="M0 51.5V66c0 3.315 2.685 6 6 6h14.5l3-10.96-3-9.54H0z" />
      <path fill="#e94235" d="M20.5 0L0 20.5l10.25 3 10.25-3V0z" />
      <path fill="#2684fc" d="M20.5 20.5H0v31h20.5z" />
      <path
        fill="#00ac47"
        d="M82.6 8.68L69.5 19.42v33.66l13.16 10.79c2.97 2.44 7.34.46 7.34-3.32V12.09c0-3.81-4.42-5.78-7.4-3.41z"
      />
      <path fill="#00832d" d="M49.5 36v15.5h-29V72h43c3.315 0 6-2.685 6-6V53.08z" />
      <path fill="#ffba00" d="M63.5 0h-43v20.5h29V36l19.5-16.08V6c0-3.315-2.685-6-6-6z" />
    </svg>
  );
}

const svgComponents: Record<
  MeetingProvider,
  React.FC<{ className?: string; gradientId?: string }>
> = {
  teams: ({ className, gradientId }) => <TeamsSvg className={className} gradientId={gradientId!} />,
  zoom: ({ className }) => <ZoomSvg className={className} />,
  calendly: ({ className }) => <CalendlySvg className={className} />,
  meet: ({ className }) => <GoogleMeetSvg className={className} />,
};

export function MeetingProviderIcon({
  provider,
  variant = 'idle',
  size = 'w-3.5 h-3.5',
  isMuted = false,
  className = '',
}: MeetingProviderIconProps) {
  const uniqueId = useId();
  const gradientId = `teams-gradient-${uniqueId}`;

  const isIdle = variant === 'idle';

  const svgClassName = [
    size,
    'shrink-0',
    isIdle && 'grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all',
    isIdle && isMuted && 'opacity-40',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const SvgComponent = svgComponents[provider];

  return (
    <span className="group" title={ariaLabels[provider]}>
      <SvgComponent className={svgClassName} gradientId={gradientId} />
    </span>
  );
}

export type { MeetingProvider, IconVariant, MeetingProviderIconProps };

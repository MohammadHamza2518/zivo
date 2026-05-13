import Link from 'next/link';

interface LogoProps {
  height?: number;
  className?: string;
  showText?: boolean;
}

export default function Logo({ height = 40, className = '', showText = true }: LogoProps) {
  // The cropped image has an aspect ratio of roughly 2.9 (444/153)
  // If the user wants height 40, width will be ~116.
  
  return (
    <Link 
      href="/" 
      className={`flex flex-col items-center gap-1 no-underline group transition-transform active:scale-95 ${className}`}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
    >
      <img 
        src="/zivo-logo-final.png" 
        alt="Zivo Talk" 
        style={{ 
          height: `${height}px`, 
          width: 'auto',
          display: 'block',
          filter: 'drop-shadow(0 0 12px rgba(139, 92, 246, 0.3))',
          transition: 'all 0.3s ease'
        }}
        className="group-hover:scale-105"
      />
      {/* Professional Underline */}
      <div style={{ 
        height: '3px', 
        width: '60%', 
        background: 'linear-gradient(90deg, transparent, #8b5cf6, transparent)',
        borderRadius: '99px',
        opacity: 0.8,
        transition: 'width 0.3s ease'
      }} className="group-hover:w-full" />
    </Link>
  );
}

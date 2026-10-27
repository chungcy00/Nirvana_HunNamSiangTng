import { Ban } from 'lucide-react';
export function SoldOutBadge({className = ''}: {className?: string}) {
  return <span className={`fgp-sold-badge ${className}`}><Ban size={18} strokeWidth={1.7} aria-hidden="true"/><span>已售罄</span></span>;
}

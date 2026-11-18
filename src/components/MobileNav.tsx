import React from 'react';
import { CheckCircle2, Library, ListMusic, Upload } from 'lucide-react';
import type { ActiveView } from '../types/music';

interface MobileNavProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onOpenImport: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeView,
  onSelectView,
  onOpenImport,
}) => {
  return (
    <nav
      aria-label="Mobile navigation"
      className="lg:hidden border-t border-white/[0.08] bg-[#0E1117]/95 backdrop-blur-md grid grid-cols-4 h-14 shrink-0"
    >
      <button
        type="button"
        onClick={() => onSelectView({ type: 'all' })}
        className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
          activeView.type === 'all' ? 'text-amber-400' : 'text-slate-400 hover:text-white'
        }`}
      >
        <Library className="w-5 h-5" />
        <span>Library</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectView({ type: 'offline' })}
        className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
          activeView.type === 'offline' ? 'text-amber-400' : 'text-slate-400 hover:text-white'
        }`}
      >
        <CheckCircle2 className="w-5 h-5" />
        <span>Offline</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectView({ type: 'playlists' })}
        className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
          activeView.type === 'playlists' || activeView.type === 'playlist'
            ? 'text-amber-400'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        <ListMusic className="w-5 h-5" />
        <span>Playlists</span>
      </button>

      <button
        type="button"
        onClick={onOpenImport}
        className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-400 hover:text-white transition-colors"
      >
        <Upload className="w-5 h-5" />
        <span>Import</span>
      </button>
    </nav>
  );
};

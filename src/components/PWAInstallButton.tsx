import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`flex items-center justify-center gap-2 rounded-lg bg-amber-500/12 text-amber-300 border border-amber-500/25 hover:bg-amber-500/20 transition-colors font-medium whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
          compact ? 'px-3 py-2 text-xs min-h-[40px]' : 'w-full px-4 py-2.5 text-sm min-h-[42px]'
        }`}
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.07] transition-colors font-medium whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
            compact ? 'px-3 py-2 text-xs min-h-[40px]' : 'w-full px-4 py-2.5 text-sm min-h-[42px]'
          }`}
        >
          <Smartphone className="w-4 h-4 shrink-0 text-amber-400" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#161A23] border border-white/10 p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Install Tarang on iOS</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close installation guide"
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="mt-4 space-y-2.5 text-sm text-slate-300 leading-relaxed">
                <li>1. Tap the <strong className="text-white">Share</strong> button in the Safari toolbar.</li>
                <li>2. Scroll down and select <strong className="text-white">Add to Home Screen</strong>.</li>
                <li>3. Open Tarang from your home screen for full offline playback.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-[#0B0D11] hover:bg-amber-400 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

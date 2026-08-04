import React from 'react'
import { Cloud, HardDrive } from 'lucide-react'

/**
 * Cache-freshness indicator: amber "Dane lokalne" (serving from local cache)
 * vs. green "Aktualne" (server-confirmed). Feed it the `fromCache` flag from
 * `useCollection`/`useDocument` — reuse this for any screen that needs to
 * communicate data freshness rather than inventing a new indicator.
 */
export const DataSourceChip: React.FC<{ fromCache: boolean }> = ({
  fromCache,
}) => (
  <div
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
      fromCache
        ? 'bg-amber-900/50 text-amber-300 border border-amber-700/50'
        : 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
    }`}
  >
    {fromCache ? (
      <HardDrive size={12} className="animate-pulse" />
    ) : (
      <Cloud size={12} />
    )}
    {fromCache ? 'Dane lokalne' : 'Aktualne'}
  </div>
)

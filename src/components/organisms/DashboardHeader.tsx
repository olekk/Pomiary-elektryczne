import React from "react";
import { RefreshCw } from "lucide-react";
import { StatusBadge } from "../molecules";

interface DashboardHeaderProps {
  isOnline: boolean;
  pendingSyncCount: number;
  isLoading: boolean;
  onRefresh: () => void;
  onRetrySync: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  isOnline,
  pendingSyncCount,
  isLoading,
  onRefresh,
  onRetrySync,
}) => {
  return (
    <div className="bg-blue-600 text-white p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Pomiary Elektryczne</h1>
          <p className="text-sm opacity-90">
            Field Service App <br />
            <span className="text-xs">Wersja z dnia: {__BUILD_DATE__}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge
            isOnline={isOnline}
            pendingCount={pendingSyncCount}
            onRetrySync={onRetrySync}
          />

          <button
            onClick={onRefresh}
            className="p-2 hover:bg-blue-700 active:bg-blue-800 rounded-full transition-colors"
            disabled={isLoading}
          >
            <RefreshCw size={24} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
};

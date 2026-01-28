import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useInspectionStore } from '../store/useInspectionStore';
import { DashboardHeader, DashboardStats, InspectionsList, CreateInspectionModal } from './organisms';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    inspections,
    loadInspections,
    createNewInspection,
    deleteInspection,
    isOnline,
    pendingSyncCount,
    retryPendingSync,
  } = useInspectionStore();

  const [isLoading, setIsLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);

  useEffect(() => {
    loadInspections().finally(() => setIsLoading(false));
  }, [loadInspections]);

  const handleCreateNew = (address: string, apartmentNumber: string, technician: string) => {
    createNewInspection(address, apartmentNumber, technician);
    setShowNewModal(false);
    navigate('/measurement');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Czy na pewno chcesz usunąć ten pomiar?')) {
      try {
        await deleteInspection(id);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert('Błąd podczas usuwania: ' + errorMessage);
      }
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await loadInspections();
    setIsLoading(false);
  };

  const syncedCount = inspections.filter((i) => i.synced).length;

  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardHeader
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        onRetrySync={retryPendingSync}
      />

      <div className="p-4">
        <DashboardStats
          totalCount={inspections.length}
          syncedCount={syncedCount}
          pendingCount={pendingSyncCount}
        />
      </div>

      <div className="p-4">
        <InspectionsList
          inspections={inspections}
          isLoading={isLoading}
          onDelete={handleDelete}
        />
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowNewModal(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white p-5 rounded-full shadow-2xl flex items-center justify-center transition-colors"
        style={{ width: '64px', height: '64px' }}
      >
        <Plus size={32} />
      </button>

      <CreateInspectionModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreate={handleCreateNew}
      />
    </div>
  );
};

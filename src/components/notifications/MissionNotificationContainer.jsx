// src/components/notifications/MissionNotificationContainer.jsx
import React from 'react';
import { usePoints } from '../../contexts/PointsContext';
import MissionCompletedModal from '../../components/MissionCompletedModal';

const MissionNotificationContainer = () => {
  // 1. Consumimos el estado del contexto (que exportaremos en el paso 3)
  const { missionSuccessData, handleCloseMissionModal } = usePoints();

  // 2. Si no hay datos o no debe mostrarse, no renderiza nada
  if (!missionSuccessData?.show) return null;

  // 3. Renderizamos el Modal en la raíz de la aplicación
  return (
    <MissionCompletedModal
      isOpen={missionSuccessData.show}
      points={missionSuccessData.points}
      onClose={handleCloseMissionModal}
    />
  );
};

export default MissionNotificationContainer;

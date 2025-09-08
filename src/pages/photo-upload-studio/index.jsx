// Versión temporal para debugging
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const PhotoUploadStudio = () => {
  const { user } = useAuth();
  
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>Photo Upload Studio - FUNCIONANDO</h1>
      <p>Usuario: {user?.email || 'No autenticado'}</p>
      <p>Esta es una versión temporal para debugging</p>
    </div>
  );
};

export default PhotoUploadStudio;

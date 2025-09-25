import React from 'react';

const ReelsFeedMobile = ({ videos = [] }) => {
  return (
    <div className="bg-blue-100 border-4 border-blue-500 p-8 text-center">
      <h2 className="text-xl font-bold text-blue-800">
        🎉 ReelsFeedMobile cargado correctamente!
      </h2>
      <p className="text-blue-600">Videos: {videos.length}</p>
    </div>
  );
};

export default ReelsFeedMobile;

const LoadingScreen = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-90">
    <div className="flex flex-col items-center">
      {/* Spinner */}
      <div className="w-12 h-12 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
      {/* Loading Text */}
      <div className="text-white text-lg mt-4">Loading...</div>
    </div>
  </div>
);

export default LoadingScreen;

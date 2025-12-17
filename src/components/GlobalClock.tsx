import React, { useEffect, useState } from "react";

const GlobalClock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time in 24h format without seconds for mobile
  const formatTime = (timezone: string) => {
    return currentTime.toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className="p-2 text-xs font-mono">
      {/* Top Time Bar */}
      <div className="bg-gray-900 border-b border-orange-500/30 p-1 flex flex-wrap justify-between items-center gap-2">
        <div className="flex flex-wrap gap-x-3 gap-y-1 sm:gap-x-6">
          <span className="text-orange-400 whitespace-nowrap">
            NYC <span className="hidden sm:inline">:</span>
            <span className="sm:ml-1">{formatTime("America/New_York")}</span>
          </span>
          <span className="text-orange-400 whitespace-nowrap">
            LON <span className="hidden sm:inline">:</span>
            <span className="sm:ml-1">{formatTime("Europe/London")}</span>
          </span>
          <span className="text-orange-400 whitespace-nowrap">
            TOK <span className="hidden sm:inline">:</span>
            <span className="sm:ml-1">{formatTime("Asia/Tokyo")}</span>
          </span>
          <span className="text-orange-400 whitespace-nowrap">
            SYD <span className="hidden sm:inline">:</span>
            <span className="sm:ml-1">{formatTime("Australia/Sydney")}</span>
          </span>
        </div>
        <div className="flex items-center space-x-2 whitespace-nowrap">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-green-400">LIVE</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalClock;

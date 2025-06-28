import React, { useEffect, useState } from "react";

const GlobalClock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="p-2 text-xs font-mono">
      {/* Top Time Bar */}
      <div className="bg-gray-900 border-b border-orange-500/30 p-1 flex justify-between items-center">
        <div className="flex space-x-6">
          <span className="text-orange-400">
            NYC:{" "}
            {currentTime.toLocaleTimeString("US", {
              timeZone: "America/New_York",
            })}
          </span>
          <span className="text-orange-400">
            LON:{" "}
            {currentTime.toLocaleTimeString("GB", {
              timeZone: "Europe/London",
            })}
          </span>
          <span className="text-orange-400">
            TOK:{" "}
            {currentTime.toLocaleTimeString("JP", {
              timeZone: "Asia/Tokyo",
            })}
          </span>
          <span className="text-orange-400">
            SYD:{" "}
            {currentTime.toLocaleTimeString("AU", {
              timeZone: "Australia/Sydney",
            })}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-green-400">LIVE</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalClock;

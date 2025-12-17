import React, { useEffect, useState } from "react";

const GlobalClock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time in 24h format without seconds for mobile
  const formatTimeMobile = (timezone: string) => {
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
      <div className="bg-gray-900 border-b border-orange-500/30 p-1 flex justify-between items-center">
        {/* Desktop view - original style */}
        <div className="hidden sm:flex space-x-6">
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

        {/* Mobile view - compact format */}
        <div className="flex sm:hidden flex-wrap gap-x-3 gap-y-1">
          <span className="text-orange-400 whitespace-nowrap">
            NYC {formatTimeMobile("America/New_York")}
          </span>
          <span className="text-orange-400 whitespace-nowrap">
            LON {formatTimeMobile("Europe/London")}
          </span>
          <span className="text-orange-400 whitespace-nowrap">
            TOK {formatTimeMobile("Asia/Tokyo")}
          </span>
          <span className="text-orange-400 whitespace-nowrap">
            SYD {formatTimeMobile("Australia/Sydney")}
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

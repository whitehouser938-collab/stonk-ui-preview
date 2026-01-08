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
    <div className="px-2 text-xs font-mono">
      {/* Top Time Bar */}
      <div className="border-b border-orange-500/30 p-1 flex justify-between items-center">
        {/* Desktop view - original style */}
        <div className="hidden sm:flex space-x-6">
          <span className="text-white">
            <span className="text-orange-500">NYC:</span>{" "}
            {currentTime.toLocaleTimeString("US", {
              timeZone: "America/New_York",
            })}
          </span>
          <span className="text-white">
            <span className="text-orange-500">LON:</span>{" "}
            {currentTime.toLocaleTimeString("GB", {
              timeZone: "Europe/London",
            })}
          </span>
          <span className="text-white">
            <span className="text-orange-500">TOK:</span>{" "}
            {currentTime.toLocaleTimeString("JP", {
              timeZone: "Asia/Tokyo",
            })}
          </span>
          <span className="text-white">
            <span className="text-orange-500">SYD:</span>{" "}
            {currentTime.toLocaleTimeString("AU", {
              timeZone: "Australia/Sydney",
            })}
          </span>
        </div>

        {/* Mobile view - compact format */}
        <div className="flex sm:hidden flex-wrap gap-x-3 gap-y-1">
          <span className="text-white whitespace-nowrap">
            <span className="text-orange-500">NYC</span> {formatTimeMobile("America/New_York")}
          </span>
          <span className="text-white whitespace-nowrap">
            <span className="text-orange-500">LON</span> {formatTimeMobile("Europe/London")}
          </span>
          <span className="text-white whitespace-nowrap">
            <span className="text-orange-500">TOK</span> {formatTimeMobile("Asia/Tokyo")}
          </span>
          <span className="text-white whitespace-nowrap">
            <span className="text-orange-500">SYD</span> {formatTimeMobile("Australia/Sydney")}
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

import React, { useEffect, useState } from "react";

const GlobalClock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex justify-start items-center space-x-2 sm:space-x-4 pl-4">
      <span className="text-orange-400 whitespace-nowrap">
        EST:{" "}
        {currentTime.toLocaleTimeString("en-US", {
          timeZone: "America/New_York",
        })}
      </span>
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        <span className="text-green-400">LIVE</span>
      </div>
    </div>
  );
};

export default GlobalClock;

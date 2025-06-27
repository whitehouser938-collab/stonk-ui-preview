import Datafeed from "public/charting_library/datafeeds/finder/datafeed";
import { useEffect, useRef, useState } from "react";

interface TradingViewChartProps {
  symbol?: string;
  height?: number;
}

type ResolutionString = TradingView.ResolutionString;

function TradingViewChart({
  symbol = "CRYPTOCAP:SOL",
  height,
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    let widget: any;

    const initChart = async () => {
      // Dynamically load the Charting Library
      const TradingView = await import(
        "public/charting_library/charting_library"
      );

      if (!TradingView || !TradingView.widget) {
        console.error("TradingView.widget is not available");
        return;
      }

      if (!chartContainerRef.current) return;
      widget = new TradingView.widget({
        container: chartContainerRef.current,
        autosize: true,
        symbol, // e.g., "CRYPTOCAP:BTC"
        interval: "60" as ResolutionString,
        timezone: "exchange",
        theme: "dark",
        // style: "1",
        locale: "en",
        enabled_features: [],
        disabled_features: ["header_compare", "header_symbol_search"],
        time_frames: [
          {
            text: "1M",
            resolution: "240" as ResolutionString,
            description: "1 Month",
          },
          {
            text: "7D",
            resolution: "60" as ResolutionString,
            description: "1 Week",
          },
          {
            text: "3D",
            resolution: "30" as ResolutionString,
            description: "3 Day",
          },
          {
            text: "1H",
            resolution: "1" as ResolutionString,
            description: "1 Hour",
          },
        ],
        datafeed: Datafeed,
        library_path: "charting_library/charting_library/",
      });
    };

    initChart();

    return () => {
      clearTimeout(timer);
      if (widget) {
        widget.remove();
      }
    };
  }, [symbol]);

  return (
    <div className="relative h-full w-full">
      <div
        className="tradingview-widget-container"
        ref={chartContainerRef}
        style={{
          height: height ? `${height}px` : "100%",
          width: "100%",
        }}
      ></div>

      {isLoading && (
        <div className="absolute inset-0 z-10 animate-pulse space-y-4 bg-[#1a1a1f] p-4">
          {/* You can add loading skeleton elements here if needed */}
        </div>
      )}
    </div>
  );
}

export default TradingViewChart;

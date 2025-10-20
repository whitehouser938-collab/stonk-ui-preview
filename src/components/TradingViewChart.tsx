import Datafeed from "../../public/charting_library/datafeeds/finder/datafeed";
import { useEffect, useRef, useState } from "react";

interface TradingViewChartProps {
  symbol?: string;
  height?: number;
}

type ResolutionString = TradingView.ResolutionString;

function TradingViewChart({ symbol, height }: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const tvWidgetRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initChart = async () => {
      const TradingView = await import(
        "../../public/charting_library/charting_library"
      );

      if (!TradingView || !TradingView.widget) {
        console.error("TradingView.widget is not available");
        return;
      }

      if (!chartContainerRef.current) return;

      // Destroy previous widget if exists
      if (tvWidgetRef.current) {
        tvWidgetRef.current.remove();
        tvWidgetRef.current = null;
      }

      // Initialize widget
      const widget = new TradingView.widget({
        container: chartContainerRef.current,
        autosize: true,
        symbol: symbol || "CRYPTOCAP:BTC",
        interval: "1" as ResolutionString,
        timezone: "exchange",
        theme: "dark",
        locale: "en",
        enabled_features: [],
        disabled_features: [
          "header_compare",
          "header_symbol_search",
          "header_quick_search",
          "edit_buttons_in_legend",
        ],
        settings_overrides: {
          "mainSeries.priceFormat.precision": 6,
          "paneProperties.background": "#1e293b",
        },
        time_frames: [
          { text: "1M", resolution: "240" as ResolutionString, description: "1 Month" },
          { text: "7D", resolution: "60" as ResolutionString, description: "1 Week" },
          { text: "3D", resolution: "30" as ResolutionString, description: "3 Day" },
          { text: "1H", resolution: "1" as ResolutionString, description: "1 Hour" },
        ],
        datafeed: Datafeed,
        library_path: "/charting_library/charting_library/",
      });

      tvWidgetRef.current = widget;

      widget.onChartReady(() => {
        setIsLoading(false);
      });
    };

    initChart();

    return () => {
      if (tvWidgetRef.current) {
        tvWidgetRef.current.remove();
        tvWidgetRef.current = null;
      }
    };
  }, [symbol]);

  return (
    <div className="relative h-full w-full">
      <div
        className="tradingview-widget-container"
        ref={chartContainerRef}
        style={{ height: height ? `${height}px` : "100%", width: "100%" }}
      />
      {isLoading && (
        <div className="absolute inset-0 z-10 animate-pulse bg-[#1a1a1f] p-4">
          {/* Optional loading skeleton */}
        </div>
      )}
    </div>
  );
}

export default TradingViewChart;

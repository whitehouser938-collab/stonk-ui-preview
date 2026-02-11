import Datafeed from "@/charting/datafeed";
import { useEffect, useRef, useState } from "react";
import {
  ChartingLibraryWidgetOptions,
  IChartingLibraryWidget,
  ResolutionString,
} from "../../public/charting_library/charting_library";
import { Chain } from "@/types";
import { buildTvSymbol } from "@/charting/helpers";
import { logger } from "@/utils/logger";

declare global {
  interface Window {
    TradingView: any;
    Datafeeds: any;
  }
}

export {};

interface TradingViewChartProps {
  tokenSymbol: string;
  tokenAddress: string;
  tokenSupply: number;
  chain: Chain;
  height?: number;
  isMobile?: boolean;
}
const formatTinyPrice = (price: number) => {
    if (price >= 0.01) {
        return price.toString();
    }

    const subscripts = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];

    const plain = price.toString();

    let normalized = plain;

    if (plain.includes('e')) {
        const [mantissa, expStr] = plain.split('e');
        const exp = parseInt(expStr, 10);

        if (exp < 0) {
            // 5.12e-7  → 0.000000512
            const zeros = Math.abs(exp) - 1;
            const digits = mantissa.replace('.', '');

            normalized = '0.' + '0'.repeat(zeros) + digits;
        }
    }

    // "0.000000512" → leadingZeros = 6
    const match = normalized.match(/^0\.0+/);
    if (!match) {
        return price.toString();
    }

    const leadingZeros = match[0].length - 2; // subtract "0."

    // Extract significant digits that come after the leading zeros
    const significant = normalized.slice(match[0].length);

    const subscript = leadingZeros
        .toString()
        .split('')
        .map(d => subscripts[parseInt(d)])
        .join('');

    // Final formatted price
    // Example: 0.000000512 → "0.0₆512"
    return `0.0${subscript}${significant.slice(0, 3)}`;
};

const customFormatters = {
    priceFormatterFactory: (symbolInfo: any, minTick: any) => {
        const mode = symbolInfo?.mode; 
        
        if (mode === 'mcap') {
            return {
                format: (value: number) => {
                    const absValue = Math.abs(value);
                    
                    if (absValue >= 1e12) return (value / 1e12).toFixed(2) + 'T';
                    if (absValue >= 1e9) return (value / 1e9).toFixed(2) + 'B';
                    if (absValue >= 1e6) return (value / 1e6).toFixed(2) + 'M';
                    if (absValue >= 1e3) return (value / 1e3).toFixed(2) + 'K';
                    return value.toFixed(2);
                }
            };
        }

        return {
            format: (price: number, signPositive: any) => {
                const absPrice = Math.abs(price);
                
                if (absPrice > -0.001 && absPrice < 0.001) {
                    return formatTinyPrice(price);
                }

                if (absPrice >= 10) {
                     return price.toFixed(2);
                }
                
                if (absPrice >= 0.001) {
                     return price.toFixed(6);
                }

                return price.toString();
            },
        };
    },

    studyFormatterFactory: (format: any, symbolInfo: any) => {
        if (format.type === 'volume') {
            return {
                format: (value: number) => {
                    if (value >= 1e12) return (value / 1e12).toFixed(2) + 'T';
                    if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
                    if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
                    if (value >= 1e3) return (value / 1e3).toFixed(2) + 'K';
                    return value.toFixed(2);
                }
            };
        }
        return null;
    }
};

function TradingViewChart({ tokenSymbol, tokenAddress, tokenSupply=1_000_000_000, chain, height, isMobile = false }: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const tvWidgetRef = useRef<any>(null);
  const scriptLoadedRef = useRef(false);
  const initializingRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const modeRef = useRef<"price" | "mcap">("mcap");
  const assetRef = useRef<"USD" | "WETH">("USD");


  useEffect(() => {
    if (initializingRef.current) return;

    const SCRIPT_SRC = "/charting_library/charting_library.js";

    const initChart = () => {
      if (!window.TradingView) return;

      if (!chartContainerRef.current) return;

      if (initializingRef.current) return;
      initializingRef.current = true;

      if (tvWidgetRef.current && tvWidgetRef.current._iFrame) {
        tvWidgetRef.current.remove();
      }

      const tvSymbol = buildTvSymbol({
        tokenAddress: tokenAddress,
        tokenSymbol: tokenSymbol,
        tokenSupply: tokenSupply,
        chain: chain,
        mode: "mcap",
        asset: "USD",
      })

      const widgetOptions: ChartingLibraryWidgetOptions = {
        container: chartContainerRef.current,
        autosize: true,
        symbol: tvSymbol,
        interval: "1" as ResolutionString,
        timezone: "exchange",
        theme: "dark",
        locale: "en",

        enabled_features: [
          "use_localstorage_for_settings",
          "hide_left_toolbar_by_default",
        ],
        disabled_features: [
          "header_compare",
          "header_symbol_search",
          "header_quick_search",
          "edit_buttons_in_legend",
          "timeframes_toolbar",
          "control_bar",
        ],

        custom_formatters: customFormatters,

        time_frames: [
          { text: "1M", resolution: "240" as ResolutionString, description: "1 Month" },
          { text: "7D", resolution: "60" as ResolutionString, description: "1 Week" },
          { text: "3D", resolution: "30" as ResolutionString, description: "3 Day" },
          { text: "1H", resolution: "1" as ResolutionString, description: "1 Hour" },
        ],

        datafeed: Datafeed,
        debug: true,
        library_path: "/charting_library/",
        toolbar_bg: "#121216",
        custom_css_url: "/tradingview-custom.css",
      }

      const widget: IChartingLibraryWidget  = new window.TradingView.widget(widgetOptions);

      tvWidgetRef.current = widget;

      widget.headerReady().then(() => {
        const priceButton = widget.createButton();
        priceButton.classList.add('apply-common-tooltip');
        
        // Style the button itself
        priceButton.style.backgroundColor = "transparent";
        priceButton.style.background = "transparent";
        
        priceButton.addEventListener("click", (e: any) => {
          const priceEl = priceButton.querySelector(".tv-opt-price") as HTMLElement;
          const mcapEl = priceButton.querySelector(".tv-opt-mcap") as HTMLElement;

          modeRef.current = modeRef.current === "price" ? "mcap" : "price";

          const mode = modeRef.current;
          const asset = assetRef.current;
          if (mode === "price") {
            priceEl.style.color = "";
            priceEl.style.fontWeight = "600";

            mcapEl.style.color = "#888";
            mcapEl.style.fontWeight = "400";
          } else {
            mcapEl.style.color = "";
            mcapEl.style.fontWeight = "600";

            priceEl.style.color = "#888";
            priceEl.style.fontWeight = "400";
          }

          const tvSymbol = buildTvSymbol({
            tokenAddress: tokenAddress,
            tokenSymbol: tokenSymbol,
            tokenSupply: tokenSupply,
            chain: chain,
            mode: mode,
            asset: asset,
          })

          widget.activeChart().setSymbol(tvSymbol);
        });

        priceButton.innerHTML = `
          <div style="display:flex;align-items:center;gap:4px;cursor:pointer;">
            <span 
              class="tv-opt-price"
              data-val="price"
              style="color:#888;"
            >
              Price
            </span>
            <span style="color:#666;">/</span>
            <span 
              class="tv-opt-mcap"
              data-val="mcap"
              style="font-weight:600;"
            >
              MCap
            </span>
          </div>
        `;

        const assetButton = widget.createButton();
        assetButton.classList.add('apply-common-tooltip');
        
        // Style the button itself
        assetButton.style.backgroundColor = "transparent";
        assetButton.style.background = "transparent";
        
        assetButton.addEventListener("click", (e: any) => {
          const usdEl = assetButton.querySelector(".tv-opt-asset-usd") as HTMLElement;
          const wethEl = assetButton.querySelector(".tv-opt-asset-weth") as HTMLElement;

          assetRef.current = assetRef.current === "USD" ? "WETH" : "USD";

          const mode = modeRef.current;
          const asset = assetRef.current;

          if (asset === "USD") {
            usdEl.style.color = "";
            usdEl.style.fontWeight = "600";

            wethEl.style.color = "#888";
            wethEl.style.fontWeight = "400";
          } else {
            wethEl.style.color = "";
            wethEl.style.fontWeight = "600";

            usdEl.style.color = "#888";
            usdEl.style.fontWeight = "400";
          }

          const tvSymbol = buildTvSymbol({
            tokenAddress: tokenAddress,
            tokenSymbol: tokenSymbol,
            tokenSupply: tokenSupply,
            chain: chain,
            mode: mode,
            asset: asset,
          })

          widget.activeChart().setSymbol(tvSymbol);
        });
        assetButton.innerHTML = `
          <div style="display:flex;align-items:center;gap:4px;cursor:pointer;">
            <span 
              class="tv-opt-asset-usd"
              data-val="price"
              style="font-weight:600;"
            >
              USD
            </span>
            <span style="color:#666;">/</span>
            <span 
              class="tv-opt-asset-weth"
              data-val="mcap"
              style="color:#888;"
            >
              WETH
            </span>
          </div>
        `;
      });

      widget.onChartReady(() => {
        setIsLoading(false);

        // Hide the left toolbar by default
        setTimeout(() => {
          try {
            const chart = widget.activeChart();
            if (chart) {
              // Check if toolbar is visible, and if so, hide it
              const isToolbarVisible = chart.getCheckableActionState("drawingToolbarAction");
              if (isToolbarVisible) {
                chart.executeActionById("drawingToolbarAction");
              }
            }
          } catch (e) {
            logger.debug("Could not hide toolbar programmatically", e);
          }
        }, 100);

        // Apply custom styling to match page theme
        widget.applyOverrides({
          // Background colors - match #121216
          "paneProperties.backgroundType": "solid",
          "paneProperties.background": "#121216",
          "paneProperties.backgroundGradientStartColor": "#121216",
          "paneProperties.backgroundGradientEndColor": "#121216",
          
          // Grid colors - subtle to match dark theme
          "paneProperties.vertGridProperties.color": "rgba(255, 255, 255, 0.05)",
          "paneProperties.horzGridProperties.color": "rgba(255, 255, 255, 0.05)",
          
          // Scale/axis colors
          "scalesProperties.textColor": "#9ca3af",
          "scalesProperties.lineColor": "rgba(255, 255, 255, 0.1)",
          "scalesProperties.crosshairLabelBgColorDark": "#121216",
          "scalesProperties.axisHighlightColor": "#fb923c",
          
          // Crosshair
          "paneProperties.crossHairProperties.color": "rgba(251, 146, 60, 0.5)",
          
          // Separator
          "paneProperties.separatorColor": "rgba(255, 255, 255, 0.1)",
        });
        
        initializingRef.current = false;
      });
    };

    // Script Loader (only once)
    if (window.TradingView) {
      scriptLoadedRef.current = true;
      initChart();
    } else {
      // only add script once
      if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
        const script = document.createElement("script");
        script.src = SCRIPT_SRC;
        script.onload = () => {
          scriptLoadedRef.current = true;
          initChart();
        };
        document.body.appendChild(script);
      } else {
        // script exists but not yet loaded
        document
          .querySelector(`script[src="${SCRIPT_SRC}"]`)
          ?.addEventListener("load", initChart);
      }
    }

    return () => {
      // ONLY remove if widget exists AND fully initialized
      if (tvWidgetRef.current && tvWidgetRef.current._iFrame) {
        tvWidgetRef.current.remove();
      }
      tvWidgetRef.current = null;
    };
  }, [tokenSymbol]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={chartContainerRef}
        id="tv_chart_container"
        style={{
          height: height ? `${height}px` : "100%",
          width: "100%",
        }}
      />
      {isLoading && (
        <div className="absolute inset-0 z-10 animate-pulse bg-[#1a1a1f] p-4"></div>
      )}
    </div>
  );
}

export default TradingViewChart;
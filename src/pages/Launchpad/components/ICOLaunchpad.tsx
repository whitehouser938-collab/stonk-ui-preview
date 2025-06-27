import { useState, useEffect } from "react";
import { Toast } from "@/components/ui/toast";
import {
  Rocket,
  Upload,
  Calendar,
  DollarSign,
  Users,
  Lock,
  Building,
  TrendingUp,
  Activity,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { deployTokenETH, DeployTokenResponse } from "../utils/deploy-token";
import { addTokenToDb } from "../utils/add-token-to-db";
import { useETHWalletSigner } from "@/hooks/signers/useWalletSigner";
import { useToast } from "@/hooks/use-toast";
import { useLoading } from "@/hooks/use-loading";
import LoadingScreen from "@/components/ui/loading";

export interface ICOLaunchData {
  name: string;
  symbol: string;
  totalSupply: string;
  description: string;
  website?: string;
  telegramUrl?: string;
  twitterUrl?: string;
  logoUrl?: string;
  launchpad: string; // "BASE" or "SOL"
}

const recentIPOs = [
  {
    symbol: "RBLX",
    name: "Roblox Corp",
    price: 68.5,
    change: 15.2,
    volume: 45000000,
    date: "2024-01-15",
  },
  {
    symbol: "COIN",
    name: "Coinbase Global",
    price: 245.3,
    change: -3.4,
    volume: 12000000,
    date: "2024-01-12",
  },
  {
    symbol: "DASH",
    name: "DoorDash Inc",
    price: 142.75,
    change: 8.7,
    volume: 8500000,
    date: "2024-01-10",
  },
  {
    symbol: "SNOW",
    name: "Snowflake Inc",
    price: 198.9,
    change: -2.1,
    volume: 6700000,
    date: "2024-01-08",
  },
  {
    symbol: "PLTR",
    name: "Palantir Technologies",
    price: 16.45,
    change: 12.8,
    volume: 35000000,
    date: "2024-01-05",
  },
];

const upcomingIPOs = [
  {
    company: "TechCorp Solutions",
    symbol: "TCHS",
    priceRange: "$18-22",
    date: "2024-02-15",
    shares: "25M",
  },
  {
    company: "Green Energy Systems",
    symbol: "GREN",
    priceRange: "$12-16",
    date: "2024-02-20",
    shares: "30M",
  },
  {
    company: "FinTech Innovations",
    symbol: "FTIN",
    priceRange: "$25-30",
    date: "2024-02-25",
    shares: "20M",
  },
  {
    company: "BioMed Research Corp",
    symbol: "BMRC",
    priceRange: "$35-42",
    date: "2024-03-01",
    shares: "15M",
  },
];

const marketStats = {
  totalIPOs: 156,
  totalRaised: 42500000000,
  avgReturn: 23.4,
  successRate: 78.5,
};

export function ICOLaunchpad() {
  const { getETHSigner } = useETHWalletSigner();
  const { toast } = useToast();
  const { isLoading, startLoading, stopLoading } = useLoading();

  const [view, setView] = useState("launch");
  const [formData, setFormData] = useState<ICOLaunchData>({
    name: "",
    symbol: "",
    totalSupply: "",
    description: "",
    website: "",
    telegramUrl: "",
    twitterUrl: "",
    logoUrl: "",
    launchpad: "BASE", // Default launchpad
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedView, setSelectedView] = useState("ICO LAUNCHPAD");
  const [launchConfirm, setLaunchConfirm] = useState<
    DeployTokenResponse | undefined
  >(undefined);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleInputChange = (key: keyof ICOLaunchData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const resetFormData = () => {
    setFormData({
      name: "",
      symbol: "",
      totalSupply: "",
      description: "",
      website: "",
      telegramUrl: "",
      twitterUrl: "",
      logoUrl: "",
      launchpad: "BASE", // Reset to default launchpad
    });
  };

  const resetLaunchpad = () => {
    setView("launch");
    resetFormData();
    setLaunchConfirm(undefined);
  };

  const validateFormData = (data: ICOLaunchData) => {
    // Basic validation to ensure required fields are filled
    if (!data.name || !data.symbol || !data.totalSupply || !data.description) {
      console.error("Please fill in all required fields.");
      return false;
    }
    // Additional validation can be added here as needed
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevents the default form submission behavior
    startLoading(); // Start loading state
    console.log("Form Data:", formData); // Logs the form data to the console
    const valid = validateFormData(formData);
    if (valid) {
      // Here you would typically send the data to your backend API
      console.log("Form submitted successfully!");
      //Create Token on Chain
      if (formData.launchpad === "BASE") {
        const signer = await getETHSigner();
        const deployResponse: DeployTokenResponse = await deployTokenETH(
          formData,
          signer
        );
        // Add token to database
        if (deployResponse.success === false) {
          console.error("Token deployment failed:", deployResponse);
          toast({
            title: "Error",
            description: "Token deployment failed. Please try again.",
            variant: "destructive",
          });
          stopLoading(); // Stop loading state
          return;
        }
        console.log("Token deployed successfully:", deployResponse);
        setLaunchConfirm(deployResponse);
        // Add token to database
        const addTokenResponse = await addTokenToDb(
          formData,
          deployResponse.deployerAddress,
          deployResponse.tokenAddress,
          deployResponse.bondingCurveAddress
        );
        toast({
          title: "Success",
          description: "Your ICO has been successfully launched!",
          variant: "destructive",
        });
      }
      setView("confirmed"); // Switch to confirmed view
      stopLoading(); // Stop loading state

      resetFormData();
    } else {
      console.error("Form validation failed.");
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      stopLoading(); // Stop loading state
    }
  };

  return (
    <div className="bg-black text-gray-100 text-xs font-mono">
      {isLoading && <LoadingScreen />}{" "}
      {/* Render LoadingScreen when isLoading is true */}
      {/* Top Time Bar */}
      <div className="bg-gray-900 border-b border-orange-500/30 p-2 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Desktop View */}
          <span className="text-orange-400 font-bold whitespace-nowrap hidden md:inline">
            ICO LAUNCHPAD
          </span>
          <span className="text-orange-400 hidden md:inline whitespace-nowrap">
            EQUITY MARKETS
          </span>
          <span className="text-orange-400 hidden md:inline whitespace-nowrap">
            NYSE/NASDAQ
          </span>

          {/* Mobile Dropdown View */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center space-x-1 text-orange-400 font-bold whitespace-nowrap">
                <span>{selectedView}</span>
                <ChevronDown className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-900 border-gray-700 text-gray-400">
                <DropdownMenuItem
                  onClick={() => setSelectedView("ICO LAUNCHPAD")}
                  className="cursor-pointer hover:!bg-orange-700/10 hover:!text-gray-100"
                >
                  ICO LAUNCHPAD
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSelectedView("EQUITY MARKETS")}
                  className="cursor-pointer hover:!bg-orange-700/10 hover:!text-gray-100"
                >
                  EQUITY MARKETS
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSelectedView("NYSE/NASDAQ")}
                  className="cursor-pointer hover:!bg-orange-700/10 hover:!text-gray-100"
                >
                  NYSE/NASDAQ
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
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
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-1 p-1">
        {/* Left Column - IPO Form */}
        <div className="col-span-1 lg:col-span-8 space-y-3">
          {/* Main Form */}
          <div className="bg-gray-900 border border-gray-700 p-3">
            {view === "launch" && (
              <form onSubmit={handleSubmit}>
                {/* Information */}
                <div className="space-y-3">
                  <div className="text-orange-400 mb-3 text-sm sm:text-base">
                    STONK INFORMATION
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-gray-400 mb-1">Name</div>
                      <input
                        placeholder="e.g., TechCorp Inc"
                        value={formData.name}
                        required
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        className="w-full p-2 bg-black border border-gray-600 text-white text-xs sm:text-sm font-mono"
                      />
                    </div>
                    <div className="mb-6">
                      <div className="text-gray-400 mb-1">Ticker Symbol</div>
                      <input
                        placeholder="e.g., TECH"
                        value={formData.symbol}
                        required
                        onChange={(e) =>
                          handleInputChange("symbol", e.target.value)
                        }
                        className="w-full p-2 bg-black border border-gray-600 text-white text-xs sm:text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
                {/* Description*/}
                <div className="mb-6">
                  <div className="text-gray-400 mb-1">Company Description</div>
                  <textarea
                    required
                    placeholder="Describe your company's business model, competitive advantages, and market opportunity..."
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    className="w-full p-2 bg-black border border-gray-600 text-white text-xs sm:text-sm font-mono h-20 sm:h-24"
                  />
                </div>
                {/* Logo URL and Social Links */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  <div>
                    <div className="text-gray-400 mb-1">Logo URL</div>
                    <input
                      value={formData.twitterUrl}
                      onChange={(e) =>
                        handleInputChange("twitterUrl", e.target.value)
                      }
                      className="w-full p-2 bg-black border border-gray-600 text-white text-xs sm:text-sm font-mono"
                    />
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Website URL</div>
                    <input
                      placeholder="https://yourcompany.com"
                      value={formData.website}
                      onChange={(e) =>
                        handleInputChange("website", e.target.value)
                      }
                      className="w-full p-2 bg-black border border-gray-600 text-white text-xs sm:text-sm font-mono"
                    />
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Twitter URL</div>
                    <input
                      placeholder="https://x.com/your_company"
                      value={formData.twitterUrl}
                      onChange={(e) =>
                        handleInputChange("twitterUrl", e.target.value)
                      }
                      className="w-full p-2 bg-black border border-gray-600 text-white text-xs sm:text-sm font-mono"
                    />
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Telegram URL</div>
                    <input
                      placeholder="https://t.me/your_company"
                      value={formData.telegramUrl}
                      onChange={(e) =>
                        handleInputChange("telegramUrl", e.target.value)
                      }
                      className="w-full p-2 bg-black border border-gray-600 text-white text-xs sm:text-sm font-mono"
                    />
                  </div>
                </div>
                {/* Shares */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  <div>
                    <div className="text-gray-400 mb-1">Shares Offered</div>
                    <input
                      required
                      placeholder="e.g., 25,000,000"
                      value={formData.totalSupply}
                      type="number"
                      min="1000"
                      max="1000000000000"
                      onChange={(e) =>
                        handleInputChange("totalSupply", e.target.value)
                      }
                      className="w-full p-2 bg-black border border-gray-600 text-white text-xs sm:text-sm font-mono"
                    />
                  </div>
                </div>
                {/* Launchpad Section */}
                <div className="mb-6">
                  <div className="text-gray-400 mb-1">Launchpad</div>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        required
                        type="radio"
                        name="launchpad"
                        value="BASE"
                        onChange={(e) =>
                          handleInputChange("launchpad", e.target.value)
                        }
                        className="form-radio text-blue-500"
                      />
                      <span className="text-white text-sm">Base</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="launchpad"
                        value="SOL"
                        onChange={(e) =>
                          handleInputChange("launchpad", e.target.value)
                        }
                        className="form-radio text-blue-500"
                      />
                      <span className="text-white text-sm">Solana</span>
                    </label>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-between mt-4 gap-2">
                  <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-black text-xs sm:text-sm font-bold order-1 sm:order-2">
                    SUBMIT ICO
                  </button>
                </div>
              </form>
            )}
            {view === "confirmed" && (
              <div className="text-green-400 text-sm sm:text-base">
                <Rocket className="inline-block mr-1" />
                Your ICO has been successfully submitted!
                <div className="mt-2">
                  <div className="text-gray-400">Transaction Hash:</div>
                  <a
                    href={`https://etherscan.io/tx/${launchConfirm?.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {launchConfirm?.transactionHash}
                  </a>
                </div>
                <div className="mt-2">
                  <div className="text-gray-400">Token Address:</div>
                  <a
                    href={`https://etherscan.io/address/${launchConfirm?.tokenAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {launchConfirm?.tokenAddress}
                  </a>
                </div>
                <button
                  onClick={() => resetLaunchpad()}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold"
                >
                  LAUNCH ANOTHER
                </button>
              </div>
            )}
          </div>
          {/* Support */}
          <div className="bg-gray-900 border border-gray-700 p-2">
            <div className="text-orange-400 mb-2 flex items-center text-sm sm:text-base">
              <Users className="w-3 h-3 mr-1" />
              ICO SUPPORT
            </div>
            <div className="space-y-1 text-xs sm:text-sm">
              <div className="text-orange-400 cursor-pointer hover:underline">
                📋 SEC Filing Guide
              </div>
              <div className="text-orange-400 cursor-pointer hover:underline">
                🏦 Underwriter Network
              </div>
              <div className="text-orange-400 cursor-pointer hover:underline">
                ⚖️ Legal Partner
              </div>
              <div className="text-orange-400 cursor-pointer hover:underline">
                📞 Expert Consultation
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Market Data */}
        <div className="col-span-1 lg:col-span-4 space-y-1">
          {/* Market Stats */}
          <div className="bg-gray-900 border border-gray-700 p-2">
            <div className="text-orange-400 mb-2 text-sm sm:text-base">
              IPO MARKET STATS (YTD)
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
              <div className="bg-black border border-gray-800 p-2">
                <div className="text-gray-400">TOTAL IPOs</div>
                <div className="text-white font-mono text-sm sm:text-base">
                  {marketStats.totalIPOs}
                </div>
              </div>
              <div className="bg-black border border-gray-800 p-2">
                <div className="text-gray-400">TOTAL RAISED</div>
                <div className="text-white font-mono text-sm sm:text-base">
                  ${(marketStats.totalRaised / 1e9).toFixed(1)}B
                </div>
              </div>
              <div className="bg-black border border-gray-800 p-2">
                <div className="text-gray-400">AVG RETURN</div>
                <div className="text-green-400 font-mono text-sm sm:text-base">
                  +{marketStats.avgReturn.toFixed(1)}%
                </div>
              </div>
              <div className="bg-black border border-gray-800 p-2">
                <div className="text-gray-400">SUCCESS RATE</div>
                <div className="text-green-400 font-mono text-sm sm:text-base">
                  {marketStats.successRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Recent IPOs */}
          <div className="bg-gray-900 border border-gray-700 p-2">
            <div className="text-orange-400 mb-2 text-sm sm:text-base">
              RECENT IPO PERFORMANCE
            </div>
            <div className="space-y-1">
              {recentIPOs.map((ipo, index) => (
                <div
                  key={index}
                  className="bg-black border border-gray-800 p-2 text-xs sm:text-sm"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-orange-400 font-bold">
                        {ipo.symbol}
                      </span>
                      <span className="text-gray-400 truncate">{ipo.name}</span>
                    </div>
                    <span className="text-gray-400 text-xs">{ipo.date}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-white font-mono">
                      ${ipo.price.toFixed(2)}
                    </span>
                    <span
                      className={`font-mono ${
                        ipo.change >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {ipo.change >= 0 ? "+" : ""}
                      {ipo.change.toFixed(1)}%
                    </span>
                    <span className="text-gray-400 font-mono text-xs">
                      Vol: {(ipo.volume / 1e6).toFixed(1)}M
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming IPOs */}
          <div className="bg-gray-900 border border-gray-700 p-2">
            <div className="text-orange-400 mb-2 text-sm sm:text-base">
              UPCOMING IPOs
            </div>
            <div className="space-y-1">
              {upcomingIPOs.map((ipo, index) => (
                <div
                  key={index}
                  className="bg-black border border-gray-800 p-2 text-xs sm:text-sm"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-orange-400 font-bold">
                      {ipo.symbol}
                    </span>
                    <span className="text-gray-400 text-xs">{ipo.date}</span>
                  </div>
                  <div className="text-white truncate">{ipo.company}</div>
                  <div className="flex flex-col sm:flex-row justify-between mt-1 gap-1">
                    <span className="text-gray-400">
                      Range: {ipo.priceRange}
                    </span>
                    <span className="text-gray-400">Shares: {ipo.shares}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Launch Costs */}
          <div className="bg-gray-900 border border-gray-700 p-2">
            <div className="text-orange-400 mb-2 flex items-center text-sm sm:text-base">
              <DollarSign className="w-3 h-3 mr-1" />
              IPO COSTS
            </div>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">SEC Registration</span>
                <span className="text-white">$250K</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Legal Fees</span>
                <span className="text-white">$1.5M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Accounting/Audit</span>
                <span className="text-white">$800K</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Underwriter Fees</span>
                <span className="text-white">7.0%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Printing/Marketing</span>
                <span className="text-white">$500K</span>
              </div>
              <div className="border-t border-gray-700 pt-2">
                <div className="flex justify-between font-bold">
                  <span className="text-gray-200">Est. Total Cost</span>
                  <span className="text-orange-400">$38M+</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

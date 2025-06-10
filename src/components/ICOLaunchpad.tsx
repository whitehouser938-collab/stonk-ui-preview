import { useState, useEffect } from "react";
import { Rocket, Upload, Calendar, DollarSign, Users, Lock, Building, TrendingUp, Activity, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface IPOLaunchData {
  companyName: string;
  symbol: string;
  sharesOffered: string;
  priceRange: string;
  description: string;
  website: string;
  prospectus: string;
  launchDate: string;
  lockupPeriod: string;
  underwriters: string;
  sector: string;
  revenue: string;
  employees: string;
}

const recentIPOs = [
  { symbol: "RBLX", name: "Roblox Corp", price: 68.50, change: 15.2, volume: 45000000, date: "2024-01-15" },
  { symbol: "COIN", name: "Coinbase Global", price: 245.30, change: -3.4, volume: 12000000, date: "2024-01-12" },
  { symbol: "DASH", name: "DoorDash Inc", price: 142.75, change: 8.7, volume: 8500000, date: "2024-01-10" },
  { symbol: "SNOW", name: "Snowflake Inc", price: 198.90, change: -2.1, volume: 6700000, date: "2024-01-08" },
  { symbol: "PLTR", name: "Palantir Technologies", price: 16.45, change: 12.8, volume: 35000000, date: "2024-01-05" }
];

const upcomingIPOs = [
  { company: "TechCorp Solutions", symbol: "TCHS", priceRange: "$18-22", date: "2024-02-15", shares: "25M" },
  { company: "Green Energy Systems", symbol: "GREN", priceRange: "$12-16", date: "2024-02-20", shares: "30M" },
  { company: "FinTech Innovations", symbol: "FTIN", priceRange: "$25-30", date: "2024-02-25", shares: "20M" },
  { company: "BioMed Research Corp", symbol: "BMRC", priceRange: "$35-42", date: "2024-03-01", shares: "15M" }
];

const marketStats = {
  totalIPOs: 156,
  totalRaised: 42500000000,
  avgReturn: 23.4,
  successRate: 78.5
};

export function ICOLaunchpad() {
  const [formData, setFormData] = useState<IPOLaunchData>({
    companyName: "",
    symbol: "",
    sharesOffered: "",
    priceRange: "",
    description: "",
    website: "",
    prospectus: "",
    launchDate: "",
    lockupPeriod: "",
    underwriters: "",
    sector: "",
    revenue: "",
    employees: ""
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedView, setSelectedView] = useState("IPO LAUNCHPAD");
  const totalSteps = 3;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleInputChange = (key: keyof IPOLaunchData, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="bg-black text-gray-100 text-xs font-mono">
      {/* Top Time Bar */}
      <div className="bg-gray-900 border-b border-orange-500/30 p-2 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Desktop View */}
          <span className="text-orange-400 font-bold whitespace-nowrap hidden md:inline">IPO LAUNCHPAD</span>
          <span className="text-orange-400 hidden md:inline whitespace-nowrap">EQUITY MARKETS</span>
          <span className="text-orange-400 hidden md:inline whitespace-nowrap">NYSE/NASDAQ</span>

          {/* Mobile Dropdown View */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center space-x-1 text-orange-400 font-bold whitespace-nowrap">
                <span>{selectedView}</span>
                <ChevronDown className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-900 border-gray-700 text-gray-400">
                <DropdownMenuItem onClick={() => setSelectedView("IPO LAUNCHPAD")} className="cursor-pointer hover:!bg-orange-700/10 hover:!text-gray-100">IPO LAUNCHPAD</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedView("EQUITY MARKETS")} className="cursor-pointer hover:!bg-orange-700/10 hover:!text-gray-100">EQUITY MARKETS</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedView("NYSE/NASDAQ")} className="cursor-pointer hover:!bg-orange-700/10 hover:!text-gray-100">NYSE/NASDAQ</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <span className="text-orange-400 whitespace-nowrap">EST: {currentTime.toLocaleTimeString('en-US', { timeZone: 'America/New_York' })}</span>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400">LIVE</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-1 p-1">
        
        {/* Left Column - IPO Form */}
        <div className="col-span-1 lg:col-span-8 space-y-1">
          
          {/* Progress Steps */}
          <div className="bg-gray-900 border border-gray-700 p-2 mb-1">
            <div className="flex items-center space-x-2">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-6 h-6 rounded text-xs flex items-center justify-center font-bold border ${
                    step <= currentStep 
                      ? 'bg-orange-500 border-orange-500 text-black' 
                      : 'border-gray-600 text-gray-400'
                  }`}>
                    {step}
                  </div>
                  {step < totalSteps && (
                    <div className={`w-4 sm:w-8 h-0.5 mx-1 ${
                      step < currentStep ? 'bg-orange-500' : 'bg-gray-600'
                    }`} />
                  )}
                </div>
              ))}
              <span className="ml-2 sm:ml-4 text-orange-400 text-xs sm:text-sm">
                STEP {currentStep}: {
                  currentStep === 1 ? "COMPANY INFO" : 
                  currentStep === 2 ? "OFFERING DETAILS" : 
                  "COMPLIANCE & REVIEW"
                }
              </span>
            </div>
          </div>

          {/* Main Form */}
          <div className="bg-gray-900 border border-gray-700 p-3">
            {currentStep === 1 && (
              <div className="space-y-3">
                <div className="text-orange-400 mb-3 text-sm sm:text-base">COMPANY INFORMATION</div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-gray-400 mb-1">Company Name</div>
                    <input
                      placeholder="e.g., TechCorp Inc"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange("companyName", e.target.value)}
                      className="w-full p-2 bg-black border border-gray-600 text-white text-xs sm:text-sm font-mono"
                    />
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Ticker Symbol</div>
                    <input
                      placeholder="e.g., TECH"
                      value={formData.symbol}
                      onChange={(e) => handleInputChange("symbol", e.target.value)}
                      className="w-full p-2 bg-black border border-gray-600 text-white text-xs sm:text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="text-gray-400 mb-1">Sector</div>
                    <input
                      placeholder="e.g., Technology"
                      value={formData.sector}
                      onChange={(e) => handleInputChange("sector", e.target.value)}
                      className="w-full p-2 bg-black border border-gray-600 text-white text-xs sm:text-sm font-mono"
                    />
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Annual Revenue</div>
                    <input
                      placeholder="e.g., $250M"
                      value={formData.revenue}
                      onChange={(e) => handleInputChange("revenue", e.target.value)}
                      className="w-full p-2 bg-black border border-gray-600 text-white text-xs sm:text-sm font-mono"
                    />
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Employees</div>
                    <input
                      placeholder="e.g., 1,500"
                      value={formData.employees}
                      onChange={(e) => handleInputChange("employees", e.target.value)}
                      className="w-full p-2 bg-black border border-gray-600 text-white text-xs sm:text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="text-gray-400 mb-1">Company Description</div>
                  <textarea
                    placeholder="Describe your company's business model, competitive advantages, and market opportunity..."
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className="w-full p-2 bg-black border border-gray-600 text-white text-xs sm:text-sm font-mono h-20 sm:h-24"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-gray-400 mb-1">Website URL</div>
                    <input
                      placeholder="https://yourcompany.com"
                      value={formData.website}
                      onChange={(e) => handleInputChange("website", e.target.value)}
                      className="w-full p-2 bg-black border border-gray-600 text-white text-xs sm:text-sm font-mono"
                    />
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Prospectus URL</div>
                    <input
                      placeholder="https://yourcompany.com/prospectus.pdf"
                      value={formData.prospectus}
                      onChange={(e) => handleInputChange("prospectus", e.target.value)}
                      className="w-full p-2 bg-black border border-gray-600 text-white text-xs sm:text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-3">
                <div className="text-orange-400 mb-3 text-sm sm:text-base">OFFERING DETAILS</div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-gray-400 mb-1">Shares Offered</div>
                    <input
                      placeholder="e.g., 25,000,000"
                      value={formData.sharesOffered}
                      onChange={(e) => handleInputChange("sharesOffered", e.target.value)}
                      className="w-full p-2 bg-black border border-gray-600 text-white text-xs sm:text-sm font-mono"
                    />
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Price Range (USD)</div>
                    <input
                      placeholder="e.g., $18-22"
                      value={formData.priceRange}
                      onChange={(e) => handleInputChange("priceRange", e.target.value)}
                      className="w-full p-2 bg-black border border-gray-600 text-white text-xs sm:text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-gray-400 mb-1">Launch Date</div>
                    <input
                      type="date"
                      value={formData.launchDate}
                      onChange={(e) => handleInputChange("launchDate", e.target.value)}
                      className="w-full p-2 bg-black border border-gray-600 text-white text-xs sm:text-sm font-mono"
                    />
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Lock-up Period (days)</div>
                    <input
                      placeholder="e.g., 180"
                      value={formData.lockupPeriod}
                      onChange={(e) => handleInputChange("lockupPeriod", e.target.value)}
                      className="w-full p-2 bg-black border border-gray-600 text-white text-xs sm:text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="text-gray-400 mb-1">Lead Underwriters</div>
                  <input
                    placeholder="e.g., Goldman Sachs, Morgan Stanley"
                    value={formData.underwriters}
                    onChange={(e) => handleInputChange("underwriters", e.target.value)}
                    className="w-full p-2 bg-black border border-gray-600 text-white text-xs sm:text-sm font-mono"
                  />
                </div>

                <div className="bg-orange-900/20 border border-orange-700 p-3">
                  <div className="text-orange-400 font-bold mb-2 text-sm sm:text-base">💰 ESTIMATED PROCEEDS</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-gray-400">Gross Proceeds:</span>
                      <span className="text-white sm:ml-2">$500M - $550M</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-gray-400">Net Proceeds:</span>
                      <span className="text-white sm:ml-2">$465M - $512M</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-gray-400">Underwriter Fees:</span>
                      <span className="text-white sm:ml-2">$35M - $38M</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-gray-400">Market Cap:</span>
                      <span className="text-white sm:ml-2">$2.3B - $2.8B</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-3">
                <div className="text-orange-400 mb-3 text-sm sm:text-base">COMPLIANCE & REVIEW</div>
                
                <div className="bg-amber-900/20 border border-amber-700 p-3">
                  <div className="text-amber-400 font-bold mb-2 text-sm sm:text-base">⚠️ REGULATORY CHECKLIST</div>
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex items-start">
                      <input type="checkbox" className="mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">SEC Form S-1 Registration Statement filed</span>
                    </div>
                    <div className="flex items-start">
                      <input type="checkbox" className="mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Audited financials for last 3 years</span>
                    </div>
                    <div className="flex items-start">
                      <input type="checkbox" className="mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Management roadshow scheduled</span>
                    </div>
                    <div className="flex items-start">
                      <input type="checkbox" className="mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Underwriter agreements executed</span>
                    </div>
                    <div className="flex items-start">
                      <input type="checkbox" className="mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Lock-up agreements with insiders</span>
                    </div>
                    <div className="flex items-start">
                      <input type="checkbox" className="mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Exchange listing requirements met</span>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-900/20 border border-orange-700 p-3">
                  <div className="text-orange-400 font-bold mb-2 text-sm sm:text-base">📊 IPO SUMMARY</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-gray-400">Company:</span>
                      <span className="text-white sm:ml-2 break-words">{formData.companyName || "N/A"}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-gray-400">Symbol:</span>
                      <span className="text-white sm:ml-2">{formData.symbol || "N/A"}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-gray-400">Shares:</span>
                      <span className="text-white sm:ml-2">{formData.sharesOffered || "N/A"}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-gray-400">Price Range:</span>
                      <span className="text-white sm:ml-2">{formData.priceRange || "N/A"}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-gray-400">Sector:</span>
                      <span className="text-white sm:ml-2">{formData.sector || "N/A"}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-gray-400">Revenue:</span>
                      <span className="text-white sm:ml-2">{formData.revenue || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row justify-between mt-4 gap-2">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className="px-4 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800 disabled:opacity-50 text-xs sm:text-sm order-2 sm:order-1"
              >
                PREVIOUS
              </button>
              
              {currentStep < totalSteps ? (
                <button
                  onClick={nextStep}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-black text-xs sm:text-sm font-bold order-1 sm:order-2"
                >
                  NEXT STEP
                </button>
              ) : (
                <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-black text-xs sm:text-sm font-bold order-1 sm:order-2">
                  SUBMIT IPO
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Market Data */}
        <div className="col-span-1 lg:col-span-4 space-y-1">
          
          {/* Market Stats */}
          <div className="bg-gray-900 border border-gray-700 p-2">
            <div className="text-orange-400 mb-2 text-sm sm:text-base">IPO MARKET STATS (YTD)</div>
            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
              <div className="bg-black border border-gray-800 p-2">
                <div className="text-gray-400">TOTAL IPOs</div>
                <div className="text-white font-mono text-sm sm:text-base">{marketStats.totalIPOs}</div>
              </div>
              <div className="bg-black border border-gray-800 p-2">
                <div className="text-gray-400">TOTAL RAISED</div>
                <div className="text-white font-mono text-sm sm:text-base">${(marketStats.totalRaised / 1e9).toFixed(1)}B</div>
              </div>
              <div className="bg-black border border-gray-800 p-2">
                <div className="text-gray-400">AVG RETURN</div>
                <div className="text-green-400 font-mono text-sm sm:text-base">+{marketStats.avgReturn.toFixed(1)}%</div>
              </div>
              <div className="bg-black border border-gray-800 p-2">
                <div className="text-gray-400">SUCCESS RATE</div>
                <div className="text-green-400 font-mono text-sm sm:text-base">{marketStats.successRate.toFixed(1)}%</div>
              </div>
            </div>
          </div>

          {/* Recent IPOs */}
          <div className="bg-gray-900 border border-gray-700 p-2">
            <div className="text-orange-400 mb-2 text-sm sm:text-base">RECENT IPO PERFORMANCE</div>
            <div className="space-y-1">
              {recentIPOs.map((ipo, index) => (
                <div key={index} className="bg-black border border-gray-800 p-2 text-xs sm:text-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-orange-400 font-bold">{ipo.symbol}</span>
                      <span className="text-gray-400 truncate">{ipo.name}</span>
                    </div>
                    <span className="text-gray-400 text-xs">{ipo.date}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-white font-mono">${ipo.price.toFixed(2)}</span>
                    <span className={`font-mono ${ipo.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {ipo.change >= 0 ? '+' : ''}{ipo.change.toFixed(1)}%
                    </span>
                    <span className="text-gray-400 font-mono text-xs">Vol: {(ipo.volume / 1e6).toFixed(1)}M</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming IPOs */}
          <div className="bg-gray-900 border border-gray-700 p-2">
            <div className="text-orange-400 mb-2 text-sm sm:text-base">UPCOMING IPOs</div>
            <div className="space-y-1">
              {upcomingIPOs.map((ipo, index) => (
                <div key={index} className="bg-black border border-gray-800 p-2 text-xs sm:text-sm">
                  <div className="flex justify-between items-start">
                    <span className="text-orange-400 font-bold">{ipo.symbol}</span>
                    <span className="text-gray-400 text-xs">{ipo.date}</span>
                  </div>
                  <div className="text-white truncate">{ipo.company}</div>
                  <div className="flex flex-col sm:flex-row justify-between mt-1 gap-1">
                    <span className="text-gray-400">Range: {ipo.priceRange}</span>
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

          {/* Support */}
          <div className="bg-gray-900 border border-gray-700 p-2">
            <div className="text-orange-400 mb-2 flex items-center text-sm sm:text-base">
              <Users className="w-3 h-3 mr-1" />
              IPO SUPPORT
            </div>
            <div className="space-y-1 text-xs sm:text-sm">
              <div className="text-orange-400 cursor-pointer hover:underline">📋 SEC Filing Guide</div>
              <div className="text-orange-400 cursor-pointer hover:underline">🏦 Underwriter Network</div>
              <div className="text-orange-400 cursor-pointer hover:underline">⚖️ Legal Partner</div>
              <div className="text-orange-400 cursor-pointer hover:underline">📞 Expert Consultation</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
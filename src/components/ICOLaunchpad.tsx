import { useState } from "react";
import { Rocket, Upload, Calendar, DollarSign, Users, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface TokenLaunchData {
  name: string;
  symbol: string;
  totalSupply: string;
  initialPrice: string;
  description: string;
  website: string;
  whitepaper: string;
  launchDate: string;
  vestingPeriod: string;
  liquidityLock: string;
}

export function ICOLaunchpad() {
  const [formData, setFormData] = useState<TokenLaunchData>({
    name: "",
    symbol: "",
    totalSupply: "",
    initialPrice: "",
    description: "",
    website: "",
    whitepaper: "",
    launchDate: "",
    vestingPeriod: "",
    liquidityLock: ""
  });

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const handleInputChange = (key: keyof TokenLaunchData, value: string) => {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-cyan-400 font-mono">TOKEN LAUNCHPAD</h2>
        <div className="flex items-center space-x-2">
          <Rocket className="w-6 h-6 text-cyan-400" />
          <span className="text-gray-400">Launch Your Token</span>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center space-x-4 mb-8">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${
              step <= currentStep 
                ? 'bg-cyan-500 border-cyan-500 text-white' 
                : 'border-gray-600 text-gray-400'
            }`}>
              {step}
            </div>
            {step < totalSteps && (
              <div className={`w-16 h-0.5 mx-2 ${
                step < currentStep ? 'bg-cyan-500' : 'bg-gray-600'
              }`} />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Main Form */}
        <div className="col-span-8">
          <Card className="bg-gray-900/50 border-gray-700 p-8">
            {currentStep === 1 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white mb-6">Basic Token Information</h3>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-gray-200 mb-2 block">Token Name</Label>
                    <Input
                      placeholder="e.g., MyAwesome Token"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-200 mb-2 block">Token Symbol</Label>
                    <Input
                      placeholder="e.g., MAT"
                      value={formData.symbol}
                      onChange={(e) => handleInputChange("symbol", e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-gray-200 mb-2 block">Total Supply</Label>
                    <Input
                      placeholder="e.g., 1000000000"
                      value={formData.totalSupply}
                      onChange={(e) => handleInputChange("totalSupply", e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-200 mb-2 block">Initial Price (USD)</Label>
                    <Input
                      placeholder="e.g., 0.01"
                      value={formData.initialPrice}
                      onChange={(e) => handleInputChange("initialPrice", e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-200 mb-2 block">Description</Label>
                  <Textarea
                    placeholder="Describe your token, its utility, and value proposition..."
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white min-h-32"
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white mb-6">Project Details</h3>
                
                <div>
                  <Label className="text-gray-200 mb-2 block">Website URL</Label>
                  <Input
                    placeholder="https://yourproject.com"
                    value={formData.website}
                    onChange={(e) => handleInputChange("website", e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-200 mb-2 block">Whitepaper URL</Label>
                  <Input
                    placeholder="https://yourproject.com/whitepaper.pdf"
                    value={formData.whitepaper}
                    onChange={(e) => handleInputChange("whitepaper", e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-200 mb-2 block">Launch Date</Label>
                  <Input
                    type="datetime-local"
                    value={formData.launchDate}
                    onChange={(e) => handleInputChange("launchDate", e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Upload className="w-5 h-5 mr-2" />
                    Token Logo
                  </h4>
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-500">PNG, JPG up to 2MB</p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white mb-6">Tokenomics & Security</h3>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-gray-200 mb-2 block">Vesting Period (months)</Label>
                    <Input
                      placeholder="e.g., 12"
                      value={formData.vestingPeriod}
                      onChange={(e) => handleInputChange("vestingPeriod", e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-200 mb-2 block">Liquidity Lock (months)</Label>
                    <Input
                      placeholder="e.g., 24"
                      value={formData.liquidityLock}
                      onChange={(e) => handleInputChange("liquidityLock", e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-amber-400 mb-3">⚠️ Security Checklist</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-300">
                      <input type="checkbox" className="mr-3" />
                      Smart contract has been audited by a reputable firm
                    </div>
                    <div className="flex items-center text-gray-300">
                      <input type="checkbox" className="mr-3" />
                      Multi-signature wallet setup for team funds
                    </div>
                    <div className="flex items-center text-gray-300">
                      <input type="checkbox" className="mr-3" />
                      Liquidity will be locked for specified period
                    </div>
                    <div className="flex items-center text-gray-300">
                      <input type="checkbox" className="mr-3" />
                      Team tokens have vesting schedule
                    </div>
                  </div>
                </div>

                <div className="bg-cyan-900/20 border border-cyan-700 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-cyan-400 mb-3">Launch Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Token:</span>
                      <span className="text-white ml-2">{formData.name || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Symbol:</span>
                      <span className="text-white ml-2">{formData.symbol || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Supply:</span>
                      <span className="text-white ml-2">{formData.totalSupply || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Price:</span>
                      <span className="text-white ml-2">${formData.initialPrice || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <Button
                onClick={prevStep}
                disabled={currentStep === 1}
                variant="outline"
                className="border-gray-600 text-gray-400 hover:bg-gray-800"
              >
                Previous
              </Button>
              
              {currentStep < totalSteps ? (
                <Button
                  onClick={nextStep}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  Next Step
                </Button>
              ) : (
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  Launch Token
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="col-span-4 space-y-6">
          <Card className="bg-gray-900/50 border-gray-700 p-6">
            <h4 className="text-lg font-semibold text-gray-200 mb-4 flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Launch Costs
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Platform Fee</span>
                <span className="text-white">2 ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Smart Contract Deploy</span>
                <span className="text-white">0.5 ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Marketing Package</span>
                <span className="text-white">1 ETH</span>
              </div>
              <div className="border-t border-gray-700 pt-3">
                <div className="flex justify-between font-semibold">
                  <span className="text-gray-200">Total</span>
                  <span className="text-cyan-400">3.5 ETH</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-gray-900/50 border-gray-700 p-6">
            <h4 className="text-lg font-semibold text-gray-200 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Support
            </h4>
            <div className="space-y-3 text-sm">
              <p className="text-gray-300">Need help with your token launch?</p>
              <div className="space-y-2">
                <div className="text-cyan-400 cursor-pointer hover:underline">📄 Documentation</div>
                <div className="text-cyan-400 cursor-pointer hover:underline">💬 Discord Support</div>
                <div className="text-cyan-400 cursor-pointer hover:underline">📧 Contact Team</div>
              </div>
            </div>
          </Card>

          <Card className="bg-gray-900/50 border-gray-700 p-6">
            <h4 className="text-lg font-semibold text-gray-200 mb-4 flex items-center">
              <Lock className="w-5 h-5 mr-2" />
              Security Features
            </h4>
            <div className="space-y-2 text-sm text-gray-300">
              <div>✅ Anti-rug protection</div>
              <div>✅ Automated liquidity lock</div>
              <div>✅ Vesting contracts</div>
              <div>✅ Multi-sig wallets</div>
              <div>✅ Audit integration</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
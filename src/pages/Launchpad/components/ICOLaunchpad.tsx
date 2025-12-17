import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Toast } from "@/components/ui/toast";

import { deployTokenETH, DeployTokenResponse } from "../utils/deploy-token";
import { addTokenToDb } from "../utils/add-token-to-db";
import { useETHWalletSigner } from "@/hooks/signers/useWalletSigner";
import { useToast } from "@/hooks/use-toast";
import { useLoading } from "@/hooks/use-loading";
import LoadingScreen from "@/components/ui/loading";
import { updateTokenLogoUrl, uploadTokenLogo } from "@/api/token";
import { useAppKitAccount } from "@reown/appkit/react";
import { WalletConnectionPrompt } from "@/components/WalletConnectionPrompt";

export interface ICOLaunchData {
  name: string;
  symbol: string;
  description: string;
  website?: string;
  telegramUrl?: string;
  twitterUrl?: string;
  logoFile?: File;
  launchpad: string; // "SEPOLIA" only
  initialBuyAmount?: string; // Optional initial buy amount in ETH/WETH
  useETH?: boolean; // true for ETH, false for WETH
}

export function ICOLaunchpad() {
  const { getETHSigner } = useETHWalletSigner();
  const { toast } = useToast();
  const { isLoading, startLoading, stopLoading } = useLoading();
  const navigate = useNavigate();
  const { isConnected: isEthConnected } = useAppKitAccount({
    namespace: "eip155",
  });

  const [formData, setFormData] = useState<ICOLaunchData>({
    name: "",
    symbol: "",
    description: "",
    website: "",
    telegramUrl: "",
    twitterUrl: "",
    logoFile: undefined,
    launchpad: "SEP", // Default to Sepolia
    initialBuyAmount: "", // Default to empty (optional)
    useETH: true, // Default to ETH
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedView, setSelectedView] = useState("ICO LAUNCHPAD");
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleInputChange = (key: keyof ICOLaunchData, value: string) => {
    // Handle boolean conversion for useETH field
    const processedValue = key === "useETH" ? value === "true" : value;

    setFormData((prev) => ({ ...prev, [key]: processedValue }));

    // Validate the field and update errors
    const error = validateField(key, value);
    setValidationErrors((prev) => ({
      ...prev,
      [key]: error,
    }));
  };

  const handleFileChange = (file: File | null) => {
    setFormData((prev) => ({
      ...prev,
      logoFile: file || undefined,
    }));

    // Validate the file and update errors
    const error = validateField("logoFile", file || undefined);
    setValidationErrors((prev) => ({
      ...prev,
      logoFile: error,
    }));
  };

  const resetFormData = () => {
    setFormData({
      name: "",
      symbol: "",
      description: "",
      website: "",
      telegramUrl: "",
      twitterUrl: "",
      logoFile: undefined,
      launchpad: "SEP", // Reset to Sepolia
      initialBuyAmount: "", // Reset to empty
      useETH: true, // Reset to ETH
    });
  };

  const resetLaunchpad = () => {
    resetFormData();
    setValidationErrors({});
  };

  // URL validation function
  const isValidUrl = (url: string): boolean => {
    if (!url.trim()) return true; // Empty URLs are valid (optional fields)
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Validate individual field
  const validateField = (
    key: keyof ICOLaunchData,
    value: string | File | undefined
  ): string => {
    switch (key) {
      case "name":
        if (!value || (typeof value === "string" && !value.trim())) {
          return "Name is required";
        }
        if (typeof value === "string" && value.length < 2) {
          return "Name must be at least 2 characters";
        }
        return "";

      case "symbol":
        if (!value || (typeof value === "string" && !value.trim())) {
          return "Ticker symbol is required";
        }
        if (typeof value === "string" && value.length < 1) {
          return "Ticker symbol must be at least 1 character";
        }
        if (typeof value === "string" && value.length > 10) {
          return "Ticker symbol must be 10 characters or less";
        }
        return "";

      case "description":
        if (!value || (typeof value === "string" && !value.trim())) {
          return "Description is required";
        }
        if (typeof value === "string" && value.length < 10) {
          return "Description must be at least 10 characters";
        }
        return "";

      case "website":
        if (value && typeof value === "string" && !isValidUrl(value)) {
          return "Please enter a valid website URL";
        }
        return "";

      case "telegramUrl":
        if (value && typeof value === "string" && !isValidUrl(value)) {
          return "Please enter a valid Telegram URL";
        }
        return "";

      case "twitterUrl":
        if (value && typeof value === "string" && !isValidUrl(value)) {
          return "Please enter a valid Twitter URL";
        }
        return "";

      case "logoFile":
        if (!value) {
          return "Logo image is required";
        }
        if (value instanceof File) {
          const maxSize = 5 * 1024 * 1024; // 5MB
          if (value.size > maxSize) {
            return "Image size must be less than 5MB";
          }
          const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
          ];
          if (!allowedTypes.includes(value.type)) {
            return "Please upload a valid image file (JPEG, PNG, GIF, or WebP)";
          }
        }
        return "";

      default:
        return "";
    }
  };

  const validateFormData = (data: ICOLaunchData) => {
    const errors: Record<string, string> = {};
    let isValid = true;

    // Validate all required fields
    const requiredFields: (keyof ICOLaunchData)[] = [
      "name",
      "symbol",
      "description",
      "logoFile",
    ];
    const optionalFields: (keyof ICOLaunchData)[] = [
      "website",
      "telegramUrl",
      "twitterUrl",
    ];

    // Check required fields
    requiredFields.forEach((field) => {
      const error = validateField(field, data[field]);
      if (error) {
        errors[field] = error;
        isValid = false;
      }
    });

    // Check optional fields
    optionalFields.forEach((field) => {
      const error = validateField(field, data[field]);
      if (error) {
        errors[field] = error;
        isValid = false;
      }
    });

    setValidationErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);

    // Validate form data first
    const valid = validateFormData(formData);
    if (!valid) {
      toast({
        title: "Validation Error",
        description: "Please fix all validation errors before submitting.",
        variant: "destructive",
      });
      setIsValidating(false);
      return;
    }

    setIsValidating(false);
    startLoading();

    try {
      console.log("Form Data:", formData);

      // Step 1: Create token on blockchain first
      if (formData.launchpad === "SEP") {
        const signer = await getETHSigner();
        const deployResponse: DeployTokenResponse = await deployTokenETH(
          formData,
          signer
        );

        if (deployResponse.success === false) {
          console.error("Token deployment failed:", deployResponse);
          toast({
            title: "Error",
            description: "Token deployment failed. Please try again.",
            variant: "destructive",
          });
          stopLoading();
          return;
        }

        console.log("Token deployed successfully:", deployResponse);

        // Step 2: Add token to database (after successful blockchain transaction)
        const addTokenResponse = await addTokenToDb(
          formData,
          deployResponse.deployerAddress,
          deployResponse.tokenAddress,
          deployResponse.bondingCurveAddress,
          deployResponse.deploymentTimestamp,
          deployResponse.deploymentBlock
        );

        console.log("Token added to database:", addTokenResponse);

        // Step 3: Upload image only after successful blockchain transaction and database entry
        if (formData.logoFile) {
          try {
            console.log(
              "Uploading logo after successful blockchain transaction..."
            );
            const logoUrl = await uploadTokenLogo(
              addTokenResponse.tokenAddress,
              formData.logoFile,
              addTokenResponse.name,
              addTokenResponse.symbol
            );
            console.log("Logo uploaded successfully:", logoUrl);

            // Step 4: Update token with logo URL
            await updateTokenLogoUrl(addTokenResponse.id, logoUrl);
            console.log("Logo URL updated successfully");
          } catch (uploadError) {
            console.error("Failed to upload logo:", uploadError);
            toast({
              title: "Warning",
              description:
                "Token created successfully but logo upload failed. You can update the logo later.",
              variant: "destructive",
            });
          }
        }

        const abbreviateHash = (tx: string) => {
          try {
            if (!tx || tx.length <= 16) return tx || "";
            const prefix = tx.slice(0, 10);
            const suffix = tx.slice(-6);
            return `${prefix}…${suffix}`;
          } catch {
            return tx || "";
          }
        };

        const explorerUrl = `https://sepolia.etherscan.io/tx/${deployResponse.transactionHash}`;
        toast({
          title: `${
            formData.symbol ? `$${formData.symbol}` : "Token"
          } Deployed`,
          description: (
            <div>
              <div>Transaction Hash:</div>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                {abbreviateHash(deployResponse.transactionHash)}
              </a>
            </div>
          ),
          variant: "info",
        });

        // Navigate to the newly created token page
        // Sepolia chain ID is 11155111
        navigate(`/token/SEP/${deployResponse.tokenAddress}`);
      }

      stopLoading();
      resetFormData();
    } catch (error) {
      console.error("Error during form submission:", error);
      toast({
        title: "Error",
        description: "An error occurred during submission. Please try again.",
        variant: "destructive",
      });
      stopLoading();
    }
  };

  // Show wallet connection prompt if not connected
  if (!isEthConnected) {
    return (
      <div className="bg-black text-gray-100 text-xs font-mono">
        <div className="p-1">
          <WalletConnectionPrompt
            title="Connect Wallet to Launch"
            description="Connect your wallet to launch your ICO and create tokens"
            actionText="Connect Wallet"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black text-gray-100 text-xs font-mono">
      {isLoading && <LoadingScreen />}{" "}
      {/* Render LoadingScreen when isLoading is true */}
      <div className="p-1">
        {/* IPO Form */}
        <div className="space-y-3">
          {/* Main Form */}
          <div className="bg-gray-900 border border-gray-700 p-3">
            <form onSubmit={handleSubmit}>
              {/* Information */}
              <div className="space-y-3">
                <div className="text-orange-400 mb-3 text-sm sm:text-base">
                  STONK INFORMATION
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-gray-400 mb-1">Name *</div>
                    <input
                      placeholder="e.g., TechCorp Inc"
                      value={formData.name}
                      required
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      className={`w-full p-2 bg-black border text-white text-xs sm:text-sm font-mono ${
                        validationErrors.name
                          ? "border-red-500"
                          : "border-gray-600"
                      }`}
                    />
                    {validationErrors.name && (
                      <div className="text-red-400 text-xs mt-1">
                        {validationErrors.name}
                      </div>
                    )}
                  </div>
                  <div className="mb-6">
                    <div className="text-gray-400 mb-1">Ticker Symbol *</div>
                    <input
                      placeholder="e.g., TECH"
                      value={formData.symbol}
                      required
                      onChange={(e) =>
                        handleInputChange("symbol", e.target.value)
                      }
                      className={`w-full p-2 bg-black border text-white text-xs sm:text-sm font-mono ${
                        validationErrors.symbol
                          ? "border-red-500"
                          : "border-gray-600"
                      }`}
                    />
                    {validationErrors.symbol && (
                      <div className="text-red-400 text-xs mt-1">
                        {validationErrors.symbol}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Description*/}
              <div className="mb-6">
                <div className="text-gray-400 mb-1">Company Description *</div>
                <textarea
                  required
                  placeholder="Describe your company's business model, competitive advantages, and market opportunity..."
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  className={`w-full p-2 bg-black border text-white text-xs sm:text-sm font-mono h-20 sm:h-24 ${
                    validationErrors.description
                      ? "border-red-500"
                      : "border-gray-600"
                  }`}
                />
                {validationErrors.description && (
                  <div className="text-red-400 text-xs mt-1">
                    {validationErrors.description}
                  </div>
                )}
              </div>
              {/* Logo Upload and Social Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <div>
                  <div className="text-gray-400 mb-1">
                    Logo Upload (Image/GIF) *
                  </div>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*,.gif"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        handleFileChange(file || null);
                      }}
                      className={`w-full p-2 bg-black border text-white text-xs sm:text-sm font-mono file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-orange-600 file:text-white hover:file:bg-orange-700 ${
                        validationErrors.logoFile
                          ? "border-red-500"
                          : "border-gray-600"
                      }`}
                    />
                    {validationErrors.logoFile && (
                      <div className="text-red-400 text-xs mt-1">
                        {validationErrors.logoFile}
                      </div>
                    )}
                    {formData.logoFile && (
                      <div className="relative">
                        <img
                          src={
                            logoPreviewUrl ||
                            URL.createObjectURL(formData.logoFile)
                          }
                          alt="Logo preview"
                          className="w-16 h-16 object-cover border border-gray-600 rounded"
                        />
                        <button
                          type="button"
                          onClick={() => handleFileChange(null)}
                          className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 mb-1">Website URL</div>
                  <input
                    placeholder="https://yourcompany.com"
                    value={formData.website}
                    onChange={(e) =>
                      handleInputChange("website", e.target.value)
                    }
                    className={`w-full p-2 bg-black border text-white text-xs sm:text-sm font-mono ${
                      validationErrors.website
                        ? "border-red-500"
                        : "border-gray-600"
                    }`}
                  />
                  {validationErrors.website && (
                    <div className="text-red-400 text-xs mt-1">
                      {validationErrors.website}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-gray-400 mb-1">Twitter URL</div>
                  <input
                    placeholder="https://x.com/your_company"
                    value={formData.twitterUrl}
                    onChange={(e) =>
                      handleInputChange("twitterUrl", e.target.value)
                    }
                    className={`w-full p-2 bg-black border text-white text-xs sm:text-sm font-mono ${
                      validationErrors.twitterUrl
                        ? "border-red-500"
                        : "border-gray-600"
                    }`}
                  />
                  {validationErrors.twitterUrl && (
                    <div className="text-red-400 text-xs mt-1">
                      {validationErrors.twitterUrl}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-gray-400 mb-1">Telegram URL</div>
                  <input
                    placeholder="https://t.me/your_company"
                    value={formData.telegramUrl}
                    onChange={(e) =>
                      handleInputChange("telegramUrl", e.target.value)
                    }
                    className={`w-full p-2 bg-black border text-white text-xs sm:text-sm font-mono ${
                      validationErrors.telegramUrl
                        ? "border-red-500"
                        : "border-gray-600"
                    }`}
                  />
                  {validationErrors.telegramUrl && (
                    <div className="text-red-400 text-xs mt-1">
                      {validationErrors.telegramUrl}
                    </div>
                  )}
                </div>
              </div>
              {/* Shares */}
              {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
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
                </div> */}
              {/* Initial Buy Amount */}
              <div className="mb-6">
                <div className="text-gray-400 mb-1">
                  Initial Buy Amount (Optional)
                  <span className="text-xs ml-2 text-gray-500">
                    Buy tokens immediately after deployment
                  </span>
                </div>
                <div className="space-y-3">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder={`e.g., 0.01 ${formData.useETH ? 'ETH' : 'WETH'}`}
                    value={formData.initialBuyAmount}
                    onChange={(e) =>
                      handleInputChange("initialBuyAmount", e.target.value)
                    }
                    className="w-full p-2 bg-black border border-gray-600 text-white text-xs sm:text-sm font-mono"
                  />
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={formData.useETH === true}
                        onChange={() => handleInputChange("useETH", "true")}
                        className="form-radio text-orange-500"
                      />
                      <span className="text-white text-sm">Use ETH</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={formData.useETH === false}
                        onChange={() => handleInputChange("useETH", "false")}
                        className="form-radio text-orange-500"
                      />
                      <span className="text-white text-sm">Use WETH</span>
                    </label>
                  </div>
                  <div className="text-xs text-gray-500">
                    Amount of {formData.useETH ? 'ETH' : 'WETH'} to use for initial token purchase (leave empty to skip)
                  </div>
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
                      value="SEP"
                      checked={formData.launchpad === "SEP"}
                      onChange={(e) =>
                        handleInputChange("launchpad", e.target.value)
                      }
                      className="form-radio text-blue-500"
                    />
                    <span className="text-white text-sm">Sepolia Testnet</span>
                  </label>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-between mt-4 gap-2">
                <button
                  type="submit"
                  disabled={isValidating || isLoading}
                  className={`px-4 py-2 text-black text-xs sm:text-sm font-bold order-1 sm:order-2 ${
                    isValidating || isLoading
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {isValidating
                    ? "VALIDATING..."
                    : isLoading
                    ? "PROCESSING..."
                    : "SUBMIT ICO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

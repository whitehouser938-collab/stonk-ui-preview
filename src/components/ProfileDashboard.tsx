import { useState, useEffect } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Edit3,
  Save,
  X,
  ExternalLink,
  Twitter,
  MessageCircle,
  Send,
  TrendingUp,
  Coins,
  Calendar,
  Wallet,
} from "lucide-react";
import {
  getUserByWalletAddress,
  getUserTokens,
  updateUser,
  uploadUserProfileImage,
  createUser,
  User as UserType,
} from "@/api/user";
import { useToast } from "@/hooks/use-toast";
import { WalletConnectionPrompt } from "@/components/WalletConnectionPrompt";
import { Link } from "react-router-dom";

const ProfileDashboard = () => {
  const { address, isConnected } = useAppKitAccount({ namespace: "eip155" });
  const { toast } = useToast();

  const [user, setUser] = useState<UserType | null>(null);
  const [userTokens, setUserTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [walletLoading, setWalletLoading] = useState(true);
  const [editForm, setEditForm] = useState({
    username: "",
    profileImage: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null
  );
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    // Set wallet loading to false after a short delay to allow wallet state to initialize
    const timer = setTimeout(() => {
      setWalletLoading(false);
    }, 1000);

    if (isConnected && address) {
      loadUserData();
    }

    return () => clearTimeout(timer);
  }, [isConnected, address]);

  const loadUserData = async () => {
    if (!address) return;

    setLoading(true);
    try {
      let userData;
      try {
        // Try to get existing user
        userData = await getUserByWalletAddress(address);
      } catch (error) {
        // If user doesn't exist, create one
        console.log("User not found, creating new user...");
        userData = await createUser(address);
        toast({
          title: "Welcome!",
          description: "Your profile has been created successfully",
          variant: "default",
        });
      }

      const tokensData = await getUserTokens(address);

      setUser(userData);
      setUserTokens(tokensData);

      // Initialize edit form with current user data
      setEditForm({
        username: userData.username || "",
        profileImage: userData.profileImage || "",
      });
    } catch (error) {
      console.error("Error loading user data:", error);
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameChange = (username: string) => {
    setEditForm((prev) => ({ ...prev, username }));
    // Defer availability check to Save action
    setUsernameAvailable(null);
  };

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
    setFileError(null);
    if (file) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (file.size > maxSize) {
        setFileError("Image size must be less than 5MB");
        return;
      }
      if (!allowedTypes.includes(file.type)) {
        setFileError(
          "Please upload a valid image file (JPEG, PNG, GIF, or WebP)"
        );
        return;
      }
    }
  };

  const handleSave = async () => {
    if (!address) return;

    setCheckingUsername(true);
    try {
      let profileImageUrl = editForm.profileImage;
      if (selectedFile && !fileError) {
        const url = await uploadUserProfileImage(address, selectedFile);
        profileImageUrl = url;
      }

      const updatedUser = await updateUser(address, {
        username: editForm.username,
        profileImage: profileImageUrl,
      });
      setUser(updatedUser);
      setEditForm((prev) => ({
        ...prev,
        profileImage: updatedUser.profileImage || profileImageUrl,
      }));
      setEditing(false);
      setUsernameAvailable(null);
      setSelectedFile(null);
      setFileError(null);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error updating user:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update profile";

      if (errorMessage === "Username already taken") {
        setUsernameAvailable(false);
        toast({
          title: "Username Unavailable",
          description:
            "This username is already taken. Please choose a different one.",
          variant: "destructive",
        });
      } else if (errorMessage === "User not found") {
        toast({
          title: "User Not Found",
          description: "Your profile could not be found. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      username: user?.username || "",
      profileImage: user?.profileImage || "",
    });
    setSelectedFile(null);
    setFileError(null);
    setEditing(false);
    setUsernameAvailable(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Show wallet connection prompt if not connected (and wallet state has loaded)
  if (!isConnected && !walletLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-orange-400">Profile</h1>
        </div>
        <WalletConnectionPrompt
          title="Connect Your Wallet"
          description="Connect your wallet to view and manage your profile. We'll automatically create your account when you connect."
          actionText="Connect Wallet"
        />
      </div>
    );
  }

  // Show minimal loading while wallet state is initializing
  if (walletLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-orange-400">Profile</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  // Show loading state only when wallet is connected and we're loading user data
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-orange-400">Profile</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-orange-400">Profile</h1>
        {!editing && (
          <Button
            onClick={() => setEditing(true)}
            variant="outline"
            size="sm"
            className="text-orange-400"
          >
            <Edit3 className="w-4 h-4 mr-2 text-orange-400" />
            Edit Profile
          </Button>
        )}
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Profile Information</span>
            </CardTitle>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {editing ? (
              <div className="space-y-6">
                <div className="flex items-center space-x-6">
                  <Avatar className="w-24 h-24">
                    <AvatarImage
                      src={
                        selectedFile
                          ? URL.createObjectURL(selectedFile)
                          : editForm.profileImage ||
                            user?.profileImage ||
                            "/default-pfp.jpeg"
                      }
                      alt="Profile"
                    />
                    <AvatarFallback>
                      <User className="w-12 h-12" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-4">
                    <div>
                      <Label
                        htmlFor="username"
                        className="text-base font-medium"
                      >
                        Username
                      </Label>
                      <div className="flex space-x-2 mt-2">
                        <Input
                          id="username"
                          value={editForm.username}
                          onChange={(e) => handleUsernameChange(e.target.value)}
                          placeholder="Enter username"
                          className="flex-1"
                        />
                        {checkingUsername && (
                          <div className="flex items-center text-sm text-gray-400 px-3">
                            Checking...
                          </div>
                        )}
                        {usernameAvailable !== null && !checkingUsername && (
                          <Badge
                            variant={
                              usernameAvailable ? "default" : "destructive"
                            }
                          >
                            {usernameAvailable ? "Available" : "Taken"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-base font-medium">
                        Profile Image Upload
                      </Label>
                      <div className="mt-2 space-y-2">
                        <input
                          type="file"
                          accept="image/*,.gif"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            handleFileChange(file);
                          }}
                          className="w-full p-2 bg-black border text-white text-xs font-mono file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-orange-600 file:text-white hover:file:bg-orange-700 border-gray-600"
                        />
                        {fileError && (
                          <div className="text-red-400 text-xs">
                            {fileError}
                          </div>
                        )}
                        {selectedFile && (
                          <button
                            type="button"
                            onClick={() => handleFileChange(null)}
                            className="inline-flex items-center px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs"
                          >
                            Remove selected image
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={usernameAvailable === false}
                    size="lg"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button onClick={handleCancel} variant="outline" size="lg">
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage
                      src={
                        user?.profileImage && user.profileImage.length > 0
                          ? user.profileImage
                          : "/default-pfp.jpeg"
                      }
                      alt="Profile"
                    />
                    <AvatarFallback>
                      <User className="w-8 h-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-200">
                      {user?.username || "Anonymous User"}
                    </h3>
                    <p className="text-gray-400 flex items-center space-x-2">
                      <Wallet className="w-4 h-4" />
                      <span className="font-mono">
                        {formatAddress(address || "")}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigator.clipboard.writeText(address || "")
                        }
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {formatDate(user?.createdAt || "")}</span>
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Tokens */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Coins className="w-5 h-5" />
              <span>My Tokens</span>
            </CardTitle>
            <CardDescription>Tokens you have deployed</CardDescription>
          </CardHeader>
          <CardContent>
            {userTokens.length > 0 ? (
              <div className="space-y-4">
                {userTokens.map((token, index) => (
                  <Link
                    to={`/token/${token.chain || token.chainId}/${
                      token.tokenAddress
                    }`}
                    key={index}
                    className="flex items-center justify-between p-4 border border-gray-700 rounded-lg hover:border-orange-500 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-orange-500/20 flex items-center justify-center overflow-hidden">
                        {token.logoUrl ? (
                          <img
                            src={token.logoUrl}
                            alt={`${token.symbol} logo`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <Coins className="w-6 h-6 text-orange-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-300">
                          {token.name}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm text-gray-500">
                            {token.symbol}
                          </p>
                          {token.graduated ? (
                            <span className="bg-green-600 text-white px-1 py-0.5 rounded text-[10px] leading-none">
                              GRAD
                            </span>
                          ) : (
                            <span className="bg-purple-600 text-white px-1 py-0.5 rounded text-[10px] leading-none">
                              BOND
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Market Cap</p>
                      <p className="font-medium text-gray-200">
                        $
                        {token.marketCap
                          ? token.marketCap.toLocaleString()
                          : "N/A"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Coins className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-400">No tokens deployed yet</p>
                <p className="text-sm text-gray-500">
                  Visit the Launchpad to create your first token
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileDashboard;

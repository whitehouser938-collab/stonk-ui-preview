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
  LogOut,
  Heart,
  Copy,
} from "lucide-react";
import {
  getUserByWalletAddress,
  getUserTokens,
  updateUser,
  uploadUserProfileImage,
  createUser,
  getUserOverview,
  getUserHoldings,
  User as UserType,
  GetUserOverviewResponse,
  Holding,
} from "@/api/user";
import { useToast } from "@/hooks/use-toast";
import { WalletConnectionPrompt } from "@/components/WalletConnectionPrompt";
import { Link } from "react-router-dom";
import { useDisconnect } from "wagmi";
import { MessageSquareHeart, BarChart3 } from "lucide-react";
import { getReplies } from "@/api/comment";

interface ProfileDashboardProps {
  walletAddress?: string;
}

const ProfileDashboard = ({ walletAddress }: ProfileDashboardProps) => {
  const { address, isConnected } = useAppKitAccount({ namespace: "eip155" });
  const { disconnect } = useDisconnect();

  // Use the provided walletAddress or fall back to connected address
  const targetAddress = walletAddress || address;
  const isOwnProfile = !walletAddress || walletAddress === address;
  const { toast } = useToast();

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnect();
      toast({
        title: "Wallet Disconnected",
        description:
          "Your wallet has been successfully disconnected from the site.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect wallet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const [user, setUser] = useState<UserType | null>(null);
  const [userTokens, setUserTokens] = useState<any[]>([]);
  const [userHoldings, setUserHoldings] = useState<Holding[]>([]);
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
  const [disconnecting, setDisconnecting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const openEditModal = () => {
    setEditForm({
      username: user?.username || "",
      profileImage: user?.profileImage || "",
    });
    setSelectedFile(null);
    setFileError(null);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
  };

  const handleModalFileChange = (file: File | null) => {
    setSelectedFile(file);
    if (file && file.size > 5 * 1024 * 1024) {
      setFileError("File too large (max 5MB)");
    } else {
      setFileError(null);
    }
  };

  const saveProfileEdits = async () => {
    if (!targetAddress) return;
    try {
      setLoading(true);
      if (editForm.username && editForm.username !== (user?.username || "")) {
        await updateUser(targetAddress, { username: editForm.username });
      }
      if (selectedFile) {
        await uploadUserProfileImage(targetAddress, selectedFile);
      }
      // Refresh
      if (typeof loadOverview === "function") {
        // @ts-ignore
        await loadOverview();
      } else {
        const refreshed = await getUserByWalletAddress(targetAddress);
        setUser(refreshed || null);
      }
      setShowEditModal(false);
      toast({ title: "Profile updated" });
    } catch (e) {
      console.error("Failed to save profile edits", e);
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Dummy types and data for profile comments and stats
  type ProfileReply = {
    id: string;
    userId: string;
    user: {
      walletAddress: string;
      username?: string;
      profileImage?: string;
    };
    content: string;
    createdAt: string;
    updatedAt: string;
    isLiked?: boolean;
    _count?: { likes?: number };
  };

  type ProfileComment = {
    id: string;
    userId: string;
    user: {
      walletAddress: string;
      username?: string;
      profileImage?: string;
    };
    token: {
      chainId: string | number;
      address: string;
      symbol: string;
      name?: string;
      logoUrl?: string;
    };
    content: string;
    createdAt: string;
    updatedAt: string;
    isLiked?: boolean;
    _count?: { likes?: number };
    replyCount?: number;
    replies: ProfileReply[];
  };

  const [profileComments, setProfileComments] = useState<ProfileComment[]>([]);

  const [profileStats, setProfileStats] = useState({
    deployer: {
      tokensDeployed: 0,
      graduatedTokens: 0,
    },
    social: {
      likesSent: 0,
      likesReceived: 0,
      commentsMade: 0,
      repliesMade: 0,
      repliesReceived: 0,
    },
  });

  const [expandedComments, setExpandedComments] = useState<Set<string>>(
    new Set()
  );

  const toggleExpandReplies = (commentId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      const willExpand = !next.has(commentId);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      // If expanding and we don't have replies loaded yet but we know there are replies, fetch them
      if (willExpand) {
        const target = profileComments.find((c) => c.id === commentId);
        if (
          target &&
          (target.replyCount || 0) > 0 &&
          target.replies.length === 0
        ) {
          void (async () => {
            try {
              const res = await getReplies({
                commentId,
                limit: 50,
                sortBy: "createdAt",
                sortOrder: "asc",
              });
              const items = res?.data?.items || [];
              setProfileComments((prevComments) =>
                prevComments.map((c) =>
                  c.id === commentId
                    ? {
                        ...c,
                        replies: items.map((r) => ({
                          id: r.id,
                          userId: r.userId,
                          user: {
                            walletAddress: r.user.walletAddress,
                            username: r.user.username,
                            profileImage: r.user.pfp || undefined,
                          },
                          content: r.content,
                          createdAt: r.createdAt,
                          updatedAt: r.updatedAt,
                          isLiked: r.isLiked,
                          _count: { likes: r._count?.likes || 0 },
                        })),
                      }
                    : c
                )
              );
            } catch (e) {
              console.error("Failed to load replies for comment", commentId, e);
            }
          })();
        }
      }
      return next;
    });
  };

  // Dummy data for replies authored by the user (separate from comments)
  type ProfileUserReply = {
    id: string;
    parentCommentId: string;
    parentCommentUser: { walletAddress: string; username?: string };
    parentCommentUserPfp?: string | null;
    parentCommentCreatedAt?: string;
    token: {
      chainId: string | number;
      address: string;
      symbol: string;
      logoUrl?: string;
    };
    content: string;
    createdAt: string;
    isLiked?: boolean;
    _count?: { likes?: number };
    parentCommentContent?: string;
    parentCommentReplyCount?: number;
  };

  const [profileReplies, setProfileReplies] = useState<ProfileUserReply[]>([]);

  const toggleUserReplyLike = (replyId: string) => {
    setProfileReplies((prev) =>
      prev.map((r) =>
        r.id === replyId
          ? {
              ...r,
              isLiked: !r.isLiked,
              _count: {
                likes: Math.max(
                  0,
                  (r._count?.likes || 0) + (r.isLiked ? -1 : 1)
                ),
              },
            }
          : r
      )
    );
  };

  useEffect(() => {
    // Set wallet loading to false after a short delay to allow wallet state to initialize
    const timer = setTimeout(() => {
      setWalletLoading(false);
    }, 1000);

    if (targetAddress) {
      loadUserData();
      loadOverview();
    }

    return () => clearTimeout(timer);
  }, [targetAddress]);

  const loadUserData = async () => {
    if (!targetAddress) return;

    setLoading(true);
    try {
      let userData;
      try {
        // Try to get existing user
        userData = await getUserByWalletAddress(targetAddress);
      } catch (error) {
        // If user doesn't exist and it's the user's own profile, create one
        if (isOwnProfile) {
          console.log("User not found, creating new user...");
          userData = await createUser(targetAddress);
          toast({
            title: "Welcome!",
            description: "Your profile has been created successfully",
            variant: "default",
          });
        } else {
          // If viewing someone else's profile and they don't exist, show error
          throw new Error("Profile not found");
        }
      }

      const tokensData = await getUserTokens(targetAddress);
      const holdingsData = await getUserHoldings(targetAddress);

      setUser(userData);
      setUserTokens(tokensData);
      setUserHoldings(holdingsData.holdings);

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

  const loadOverview = async () => {
    if (!targetAddress) return;
    try {
      const overview = await getUserOverview(targetAddress);
      // Map comments into ProfileComment shape
      const mappedComments: ProfileComment[] = (
        overview.activity.comments || []
      ).map((c) => ({
        id: c.id,
        userId: overview.user.walletAddress,
        user: {
          walletAddress: overview.user.walletAddress,
          username: overview.user.username,
          profileImage: overview.user.profileImage,
        },
        token: {
          chainId: c.token.chainId || "",
          address: (c.token.tokenAddress || c.token.address || "") as string,
          symbol: c.token.symbol,
          name: undefined,
          logoUrl: c.token.logoUrl,
        },
        content: c.content,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        isLiked: false,
        _count: { likes: c.likeCount || 0 },
        replyCount: c.replyCount || 0,
        replies: (c.replies || []).map((r) => ({
          id: r.id,
          userId: r.author.walletAddress,
          user: {
            walletAddress: r.author.walletAddress,
            username: r.author.username || undefined,
            profileImage: r.author.pfp || undefined,
          },
          content: r.content,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          isLiked: false,
          _count: { likes: r.likeCount || 0 },
        })),
      }));
      setProfileComments(mappedComments);

      // Map replies into ProfileUserReply shape
      const mappedReplies: ProfileUserReply[] = (
        overview.activity.replies || []
      ).map((r) => ({
        id: r.id,
        parentCommentId: r.commentId,
        parentCommentUser: {
          walletAddress: r.parentComment?.user.walletAddress || "",
          username: r.parentComment?.user.username || undefined,
        },
        parentCommentUserPfp: r.parentComment?.user.pfp || null,
        token: {
          chainId: r.token.chainId || "",
          address: (r.token.tokenAddress || r.token.address || "") as string,
          symbol: r.token.symbol,
          logoUrl: r.token.logoUrl,
        },
        content: r.content,
        createdAt: r.createdAt,
        isLiked: false,
        _count: { likes: r.likeCount || 0 },
        parentCommentContent: r.parentComment?.content,
      }));
      setProfileReplies(mappedReplies);

      setProfileStats({
        deployer: {
          tokensDeployed: overview.stats.tokensDeployed || 0,
          graduatedTokens: overview.stats.graduatedTokens || 0,
        },
        social: {
          likesSent: overview.stats.likesSent || 0,
          likesReceived: overview.stats.likesReceived || 0,
          commentsMade: overview.stats.commentsMade || 0,
          repliesMade: overview.stats.repliesMade || 0,
          repliesReceived: overview.stats.repliesReceived || 0,
        },
      });
    } catch (e) {
      console.error("Failed to load user overview", e);
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
    if (!targetAddress) return;

    setCheckingUsername(true);
    try {
      let profileImageUrl = editForm.profileImage;
      if (selectedFile && !fileError) {
        const url = await uploadUserProfileImage(targetAddress, selectedFile);
        profileImageUrl = url;
      }

      const updatedUser = await updateUser(targetAddress, {
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

  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp) return "";
    const now = Date.now();
    const t = new Date(timestamp).getTime();
    const diff = Math.max(0, now - t);
    const m = Math.floor(diff / (1000 * 60));
    const h = Math.floor(diff / (1000 * 60 * 60));
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${d}d ago`;
  };

  const formatTokenAmount = (amount: string, decimals: string) => {
    const amountNum = parseFloat(amount);
    const decimalsNum = parseInt(decimals);
    const divisor = Math.pow(10, decimalsNum);
    const cleanAmount = amountNum / divisor;

    // Format with K/M notation
    if (cleanAmount >= 1000000) {
      return (cleanAmount / 1000000).toFixed(2) + "M";
    } else if (cleanAmount >= 1000) {
      return (cleanAmount / 1000).toFixed(2) + "K";
    } else {
      return cleanAmount.toFixed(2);
    }
  };

  const getTokenAmount = (amount: string, decimals: string) => {
    const amountNum = parseFloat(amount);
    const decimalsNum = parseInt(decimals);
    const divisor = Math.pow(10, decimalsNum);
    return amountNum / divisor;
  };

  const toggleCommentLike = (commentId: string) => {
    setProfileComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              isLiked: !c.isLiked,
              _count: {
                likes: Math.max(
                  0,
                  (c._count?.likes || 0) + (c.isLiked ? -1 : 1)
                ),
              },
            }
          : c
      )
    );
  };

  const toggleReplyLike = (commentId: string, replyId: string) => {
    setProfileComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              replies: c.replies.map((r) =>
                r.id === replyId
                  ? {
                      ...r,
                      isLiked: !r.isLiked,
                      _count: {
                        likes: Math.max(
                          0,
                          (r._count?.likes || 0) + (r.isLiked ? -1 : 1)
                        ),
                      },
                    }
                  : r
              ),
            }
          : c
      )
    );
  };

  // Show wallet connection prompt if not connected and viewing own profile (and wallet state has loaded)
  if (!isConnected && !walletLoading && isOwnProfile) {
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
        <h1 className="text-3xl font-bold text-orange-400">
          {isOwnProfile
            ? ""
            : `${
                user?.username || formatAddress(targetAddress || "")
              }'s Profile`}
        </h1>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={closeEditModal}
          />
          <div className="relative z-10 w-full max-w-md bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-gray-200">
                <Edit3 className="w-4 h-4" />
                <span>Edit Profile</span>
              </div>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="modal-username" className="text-sm">
                  Username
                </Label>
                <Input
                  id="modal-username"
                  value={editForm.username}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, username: e.target.value }))
                  }
                  placeholder="Enter username"
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-sm">Profile Image</Label>
                <div className="mt-2 space-y-2">
                  <input
                    type="file"
                    accept="image/*,.gif"
                    onChange={(e) =>
                      handleModalFileChange(e.target.files?.[0] || null)
                    }
                    className="w-full p-2 bg-black border text-white text-xs font-mono file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-orange-600 file:text-white hover:file:bg-orange-700 border-gray-600"
                  />
                  {fileError && (
                    <div className="text-red-400 text-xs">{fileError}</div>
                  )}
                  {/* Image Preview */}
                  {(selectedFile || user?.profileImage) && (
                    <div className="mt-3">
                      <div className="text-xs text-gray-400 mb-2">Preview:</div>
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-600">
                        <img
                          src={
                            selectedFile
                              ? URL.createObjectURL(selectedFile)
                              : user?.profileImage || "/default-pfp.jpeg"
                          }
                          alt="Profile preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {selectedFile && (
                        <button
                          type="button"
                          onClick={() => handleModalFileChange(null)}
                          className="mt-2 text-xs text-red-400 hover:text-red-300"
                        >
                          Remove selected image
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <Button variant="outline" onClick={closeEditModal}>
                Cancel
              </Button>
              <Button onClick={saveProfileEdits} disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top section: Combined user info and stats */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* User Info */}
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16">
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
                      {formatAddress(targetAddress || "")}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            targetAddress || ""
                          );
                          toast({
                            title: "Address Copied",
                            description: "Wallet address copied to clipboard",
                            variant: "default",
                          });
                        } catch (error) {
                          console.error("Failed to copy address:", error);
                          toast({
                            title: "Copy Failed",
                            description: "Failed to copy address to clipboard",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="hover:text-orange-400 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </p>
                  <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Joined {formatDate(user?.createdAt || "")}</span>
                    </span>
                  </div>
                </div>
                {/* Desktop Actions */}
                {isOwnProfile && (
                  <div className="hidden md:flex items-center gap-2">
                    <Button
                      onClick={openEditModal}
                      variant="outline"
                      size="sm"
                      className="text-orange-400"
                    >
                      <Edit3 className="w-4 h-4 mr-2 text-orange-400" />
                      Edit Profile
                    </Button>
                    <Button
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      variant="outline"
                      size="sm"
                      className="text-red-400 border-red-500/30 hover:bg-red-900/20 hover:border-red-400/50 disabled:opacity-50"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {disconnecting ? "Disconnecting..." : "Disconnect"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Stats (desktop) */}
              <div className="hidden md:flex space-x-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">
                    {profileStats.deployer.tokensDeployed}
                  </div>
                  <div className="text-sm text-gray-400">Tokens Deployed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">
                    {profileStats.deployer.graduatedTokens}
                  </div>
                  <div className="text-sm text-gray-400">Graduated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">
                    {profileStats.social.likesReceived}
                  </div>
                  <div className="text-sm text-gray-400">Likes Received</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">
                    {profileStats.social.commentsMade}
                  </div>
                  <div className="text-sm text-gray-400">Comments</div>
                </div>
              </div>
            </div>

            {/* Stats (mobile) */}
            <div className="mt-4 grid grid-cols-2 gap-4 md:hidden">
              <div className="text-center">
                <div className="text-xl font-bold text-orange-400">
                  {profileStats.deployer.tokensDeployed}
                </div>
                <div className="text-xs text-gray-400">Tokens</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-orange-400">
                  {profileStats.deployer.graduatedTokens}
                </div>
                <div className="text-xs text-gray-400">Graduated</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-orange-400">
                  {profileStats.social.likesReceived}
                </div>
                <div className="text-xs text-gray-400">Likes</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-orange-400">
                  {profileStats.social.commentsMade}
                </div>
                <div className="text-xs text-gray-400">Comments</div>
              </div>
            </div>

            {/* Actions (mobile only) */}
            {isOwnProfile && (
              <div className="mt-4 flex md:hidden gap-2">
                <Button
                  onClick={openEditModal}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-orange-400"
                >
                  <Edit3 className="w-4 h-4 mr-2" /> Edit
                </Button>
                <Button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-red-400 border-red-500/30 hover:bg-red-900/20 hover:border-red-400/50 disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />{" "}
                  {disconnecting ? "..." : "Disconnect"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom section: Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Deployed Tokens and Holdings */}
          <Card>
            <CardContent className="p-0">
              {/* Deployed Tokens Section */}
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center space-x-2 mb-4">
                  <Coins className="w-5 h-5" />
                  <span className="text-lg font-semibold">Deployed Tokens</span>
                </div>
                {userTokens.length > 0 ? (
                  <div className="space-y-4">
                    {userTokens.map((token, index) => (
                      <Link
                        to={`/token/SEP/${token.tokenAddress}`}
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
              </div>

              {/* Holdings Section */}
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-lg font-semibold">Holdings</span>
                </div>
                {userHoldings.filter(
                  (holding) =>
                    getTokenAmount(holding.amount, holding.decimals) >= 1
                ).length > 0 ? (
                  <div className="space-y-4">
                    {userHoldings
                      .filter(
                        (holding) =>
                          getTokenAmount(holding.amount, holding.decimals) >= 1
                      )
                      .map((holding, index) => (
                        <Link
                          to={`/token/SEP/${holding.address}`}
                          key={index}
                          className="flex items-center justify-between p-4 border border-gray-700 rounded-lg hover:border-orange-500 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-orange-500/20 flex items-center justify-center overflow-hidden">
                              {holding.logo ? (
                                <img
                                  src={holding.logo}
                                  alt={`${holding.symbol} logo`}
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
                                {holding.name}
                              </h4>
                              <div className="flex items-center space-x-2">
                                <p className="text-sm text-gray-500">
                                  {holding.symbol}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-400">Amount</p>
                            <p className="font-medium text-gray-500">
                              {formatTokenAmount(
                                holding.amount,
                                holding.decimals
                              )}
                            </p>
                          </div>
                        </Link>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-400">No holdings yet</p>
                    <p className="text-sm text-gray-500">
                      Start trading to build your portfolio
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right column: Comments, Replies, Likes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Comments by User */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquareHeart className="w-5 h-5" />
                  <span>Comments</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profileComments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                    <p className="text-sm">
                      You haven't posted any comments yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {profileComments.map((c) => (
                      <div
                        key={c.id}
                        className="bg-gray-800 border border-gray-700 rounded p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-400">On</span>
                            <Link
                              to={`/token/SEP/${c.token.address}`}
                              className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-600/10 flex items-center gap-1"
                            >
                              {c.token.logoUrl ? (
                                <img
                                  src={c.token.logoUrl}
                                  alt={`${c.token.symbol} logo`}
                                  className="w-4 h-4 rounded-sm"
                                />
                              ) : (
                                <Coins className="w-3.5 h-3.5 text-orange-400" />
                              )}
                              <span>{c.token.symbol}</span>
                            </Link>
                            <span className="text-gray-500">
                              {formatTimeAgo(c.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3 text-xs text-gray-400">
                            <button
                              onClick={() => toggleCommentLike(c.id)}
                              className={`flex items-center space-x-1 transition-colors ${
                                c.isLiked
                                  ? "text-red-400"
                                  : "hover:text-red-400"
                              }`}
                            >
                              <Heart
                                className={`w-4 h-4 ${
                                  c.isLiked ? "fill-current" : ""
                                }`}
                              />
                              <span>{c._count?.likes || 0}</span>
                            </button>
                            {(c.replyCount || 0) > 0 && (
                              <div className="flex items-center space-x-1">
                                <MessageCircle className="w-4 h-4" />
                                <span>{c.replyCount}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-gray-200 text-sm mb-3">
                          {c.content}
                        </div>

                        {/* Replies (collapsed by default, open via toggle) */}
                        {(c.replyCount || 0) > 0 && (
                          <div className="mt-2">
                            {(expandedComments.has(c.id) ? c.replies : []).map(
                              (r) => (
                                <div
                                  key={r.id}
                                  className="ml-4 pl-4 border-l border-gray-700 py-2"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <Link
                                      to={`/profile/${r.user.walletAddress}`}
                                      className="text-xs text-orange-400 hover:text-white font-mono"
                                    >
                                      {r.user.username ||
                                        formatAddress(r.user.walletAddress)}
                                    </Link>
                                    <div className="flex items-center gap-3 text-xs text-gray-400">
                                      <span>{formatTimeAgo(r.createdAt)}</span>
                                      <button
                                        onClick={() =>
                                          toggleReplyLike(c.id, r.id)
                                        }
                                        className={`flex items-center space-x-1 transition-colors ${
                                          r.isLiked
                                            ? "text-red-400"
                                            : "hover:text-red-400"
                                        }`}
                                      >
                                        <Heart
                                          className={`w-3.5 h-3.5 ${
                                            r.isLiked ? "fill-current" : ""
                                          }`}
                                        />
                                        <span>{r._count?.likes || 0}</span>
                                      </button>
                                    </div>
                                  </div>
                                  <div className="text-gray-300 text-sm">
                                    {r.content}
                                  </div>
                                </div>
                              )
                            )}

                            {!expandedComments.has(c.id) && (
                              <button
                                onClick={() => toggleExpandReplies(c.id)}
                                className="text-xs text-orange-400 hover:text-orange-300 transition-colors ml-4 mt-1"
                              >
                                Show {c.replyCount}
                                {c.replyCount === 1 ? " reply" : " replies"}
                              </button>
                            )}
                            {expandedComments.has(c.id) && (
                              <button
                                onClick={() => toggleExpandReplies(c.id)}
                                className="text-xs text-gray-400 hover:text-gray-300 transition-colors ml-4 mt-1"
                              >
                                Show less
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Replies by User */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="w-5 h-5" />
                  <span>Replies</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profileReplies.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                    <p className="text-sm">No replies yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {profileReplies.map((r) => (
                      <div
                        key={r.id}
                        className="bg-gray-900 border border-gray-700 rounded p-0 overflow-hidden"
                      >
                        {/* Original comment with token indicator at top-left */}
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-gray-400 text-xs">On</span>
                            <Link
                              to={`/token/SEP/${r.token.address}`}
                              className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-600/10 flex items-center gap-1 text-xs"
                            >
                              {r.token.logoUrl ? (
                                <img
                                  src={r.token.logoUrl}
                                  alt={`${r.token.symbol} logo`}
                                  className="w-4 h-4 rounded-sm"
                                />
                              ) : (
                                <Coins className="w-3.5 h-3.5 text-orange-400" />
                              )}
                              <span>{r.token.symbol}</span>
                            </Link>
                          </div>
                          <div className="flex items-start gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage
                                src={r.parentCommentUserPfp || undefined}
                              />
                              <AvatarFallback>
                                <User className="w-4 h-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <Link
                                  to={`/profile/${r.parentCommentUser.walletAddress}`}
                                  className="text-orange-400 hover:text-white font-mono"
                                >
                                  {r.parentCommentUser.username ||
                                    formatAddress(
                                      r.parentCommentUser.walletAddress
                                    )}
                                </Link>
                                {r.parentCommentCreatedAt && (
                                  <span>
                                    • {formatTimeAgo(r.parentCommentCreatedAt)}
                                  </span>
                                )}
                              </div>
                              {r.parentCommentContent && (
                                <div className="text-gray-300 text-sm mt-1">
                                  {r.parentCommentContent}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* My reply (highlighted) */}
                        <div className="bg-gradient-to-r from-orange-500/15 to-transparent border-t border-orange-500/40 p-4 ml-6 pl-4 border-l-2 border-orange-500">
                          <div className="flex items-start gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage
                                src={user?.profileImage || undefined}
                              />
                              <AvatarFallback>
                                <User className="w-4 h-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-xs text-gray-400">
                                <div className="flex items-center gap-2">
                                  <span className="text-orange-400 font-mono">
                                    {user?.username ||
                                      formatAddress(targetAddress || "")}
                                  </span>
                                  <span>• {formatTimeAgo(r.createdAt)}</span>
                                </div>
                                <button
                                  onClick={() => toggleUserReplyLike(r.id)}
                                  className={`flex items-center space-x-1 transition-colors ${
                                    r.isLiked
                                      ? "text-red-400"
                                      : "text-gray-400 hover:text-red-400"
                                  }`}
                                >
                                  <Heart
                                    className={`w-3.5 h-3.5 ${
                                      r.isLiked ? "fill-current" : ""
                                    }`}
                                  />
                                  <span>{r._count?.likes || 0}</span>
                                </button>
                              </div>
                              <div className="text-gray-200 text-sm mt-1">
                                {r.content}
                              </div>

                              {/* No token chip on the reply per design */}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDashboard;

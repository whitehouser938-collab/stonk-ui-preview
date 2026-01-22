import * as React from "react";
import { cn } from "@/lib/utils";

// UI Library compatible Avatar components
const Avatar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
));
Avatar.displayName = "Avatar";

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ className, ...props }, ref) => (
  <img
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
));
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-gray-600 text-gray-200",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = "AvatarFallback";

// Custom UserAvatar component for comments/replies
interface UserAvatarProps {
  user: {
    walletAddress: string;
    username?: string;
    pfp?: string | null;
  };
  size?: "sm" | "md" | "lg";
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = "md",
  className = "",
}) => {
  const profilePicture = user.pfp;
  const fallback = user.walletAddress?.slice(0, 2).toUpperCase() || "?";
  const alt = user.username || user.walletAddress || "User";

  const sizeClasses = {
    sm: "w-5 h-5 text-xs",
    md: "w-6 h-6 text-xs",
    lg: "w-8 h-8 text-sm",
  };

  // Use default PFP if no profile picture is available
  const defaultPfp = "/default-pfp.jpeg";
  const imageSrc = profilePicture || defaultPfp;

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={cn(
        className,
        sizeClasses[size],
        "rounded-full object-cover font-bold text-white"
      )}
      onError={(e) => {
        // If default PFP also fails, show fallback with initials
        const target = e.target as HTMLImageElement;
        // Only show fallback if we tried the default and it failed
        if (target.src.includes(defaultPfp) || !profilePicture) {
          const fallbackDiv = document.createElement("div");
          fallbackDiv.className = cn(
            className,
            sizeClasses[size],
            "rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br from-orange-400 to-orange-500"
          );
          fallbackDiv.textContent = fallback;
          target.parentNode?.replaceChild(fallbackDiv, target);
        } else {
          // If user's PFP fails, try default
          target.src = defaultPfp;
        }
      }}
    />
  );
};

export { Avatar, AvatarImage, AvatarFallback, UserAvatar };

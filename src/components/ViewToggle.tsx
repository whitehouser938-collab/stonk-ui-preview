import { LayoutGrid, List } from "lucide-react";

interface ViewToggleProps {
  viewMode: "card" | "list";
  onViewModeChange: (mode: "card" | "list") => void;
  className?: string;
}

export function ViewToggle({
  viewMode,
  onViewModeChange,
  className = "",
}: ViewToggleProps) {
  return (
    <div className={`flex gap-2 items-center ${className}`}>
      <button
        onClick={() => onViewModeChange("card")}
        className={`flex-shrink-0 p-2 rounded transition-colors ${
          viewMode === "card"
            ? "bg-orange-500 text-black"
            : "text-gray-400 hover:text-gray-300"
        }`}
        aria-label="Card view"
        title="Card view"
      >
        <LayoutGrid className="w-5 h-5" />
      </button>
      <button
        onClick={() => onViewModeChange("list")}
        className={`flex-shrink-0 p-2 rounded transition-colors ${
          viewMode === "list"
            ? "bg-orange-500 text-black"
            : "text-gray-400 hover:text-gray-300"
        }`}
        aria-label="List view"
        title="List view"
      >
        <List className="w-5 h-5" />
      </button>
    </div>
  );
}

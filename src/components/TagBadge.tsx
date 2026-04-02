"use client";

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export function TagBadge({
  tag,
  onRemove,
  onClick,
  selected,
}: {
  tag: Tag;
  onRemove?: () => void;
  onClick?: () => void;
  selected?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
        onClick ? "cursor-pointer" : ""
      } ${selected ? "ring-2 ring-offset-1 ring-stone-500" : ""}`}
      style={{
        backgroundColor: tag.color + "20",
        color: tag.color,
        borderColor: tag.color + "40",
        borderWidth: "1px",
      }}
      onClick={onClick}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:opacity-70"
        >
          ×
        </button>
      )}
    </span>
  );
}

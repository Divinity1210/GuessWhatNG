interface AvatarProps {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg" | "xl";
  rank?: number;
  className?: string;
}

const sizeMap = {
  sm: "size-8 text-xs",
  md: "size-10 text-xs",
  lg: "size-12 text-sm",
  xl: "size-16 text-lg",
};

function getInitials(name: string) {
  return name
    .split(/[\s_]+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ name, src, size = "md", rank, className = "" }: AvatarProps) {
  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizeMap[size]} rounded-lg object-cover border border-[#2E3442]`}
        />
      ) : (
        <div
          className={`${sizeMap[size]} grid place-items-center rounded-lg border border-[#2E3442] bg-[#171A21] font-mono font-semibold text-[#F4F5F8]`}
        >
          {getInitials(name)}
        </div>
      )}
      {rank !== undefined && rank <= 3 && (
        <span
          className={`absolute -bottom-1 -right-1 grid size-4.5 place-items-center rounded border border-[#090A0D] font-mono text-[9px] font-bold ${
            rank === 1
              ? "bg-[#F7911B] text-[#090A0D]"
              : rank === 2
              ? "bg-[#C8CDD8] text-[#090A0D]"
              : "bg-[#2E3442] text-[#F4F5F8]"
          }`}
        >
          {rank}
        </span>
      )}
    </div>
  );
}

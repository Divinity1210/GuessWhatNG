interface AvatarProps {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  rank?: number;
  className?: string;
}

const sizeMap = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
};

const colors = [
  "from-accent-3 to-accent",
  "from-accent-purple to-info",
  "from-success to-info",
  "from-warning to-accent",
  "from-danger to-accent-2",
];

function getInitials(name: string) {
  return name
    .split(/[\s_]+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ name, src, size = "md", rank, className = "" }: AvatarProps) {
  const colorIndex = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizeMap[size]} rounded-full object-cover ring-2 ring-rule`}
        />
      ) : (
        <div
          className={`${sizeMap[size]} grid place-items-center rounded-full bg-gradient-to-br ${colors[colorIndex]} font-display font-bold text-white`}
        >
          {getInitials(name)}
        </div>
      )}
      {rank !== undefined && rank <= 3 && (
        <span
          className={`absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full text-[10px] font-black font-display text-white border border-paper shadow-sm ${
            rank === 1
              ? "bg-amber-500"
              : rank === 2
              ? "bg-slate-400"
              : "bg-amber-700"
          }`}
        >
          #{rank}
        </span>
      )}
    </div>
  );
}

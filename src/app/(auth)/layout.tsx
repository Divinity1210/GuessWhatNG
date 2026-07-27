export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-16">
      {/* Background glow */}
      <div className="absolute inset-0 gradient-glow opacity-60" />
      <div className="absolute left-1/4 top-1/4 size-[500px] rounded-full bg-accent/5 blur-[100px]" />
      <div className="absolute right-1/4 bottom-1/4 size-[400px] rounded-full bg-accent-purple/5 blur-[100px]" />

      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4 py-8 sm:py-12 overflow-x-hidden">
      <div className="absolute inset-0 gradient-glow opacity-50 pointer-events-none" />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}

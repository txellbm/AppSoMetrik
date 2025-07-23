
// This file can be used to create a shared layout for the (main) route group.
// For now, we just pass children through.

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

export default function FullScreenPdfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-screen h-screen overflow-hidden">
      {children}
    </div>
  );
}

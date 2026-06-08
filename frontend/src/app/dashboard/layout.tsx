import NavBar from "@/components/NavBar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { EvalProvider } from "@/context/EvalContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <EvalProvider>
        <div className="bg-background text-on-background min-h-screen flex font-body-md relative overflow-x-hidden">
          <div className="fixed inset-0 dot-pattern pointer-events-none z-0"></div>
          <NavBar />
          <main className="flex-1 md:ml-[240px] p-lg md:p-xl z-10 relative animate-slide-up">
            {children}
          </main>
        </div>
      </EvalProvider>
    </ProtectedRoute>
  );
}

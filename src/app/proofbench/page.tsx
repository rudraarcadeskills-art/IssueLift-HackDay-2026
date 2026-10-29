import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProofBenchViewer } from '@/components/ProofBenchViewer';

export const metadata = {
  title: 'ProofBench Suite — IssueLift v1.3',
  description: 'Deterministic guardrail evaluation suite with seven labelled edge-case fixtures.',
};

export default function ProofBenchPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-midnight-950 text-slate-900 dark:text-slate-100 selection:bg-violet-500 selection:text-white transition-colors">
      <Header activeView="proofbench" />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <ProofBenchViewer />
      </main>
      <Footer />
    </div>
  );
}

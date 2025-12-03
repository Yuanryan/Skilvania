"use client";

import { Navbar } from '@/components/ui/Navbar';
import { ArrowLeft, CheckCircle, XCircle, Download, FileText } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const SUBMISSIONS = [
  { id: 1, student: "PixelArtist", node: "Capstone Crown", date: "2 hours ago", status: "Pending", file: "project.zip" },
  { id: 2, student: "NetRunner", node: "React Bloom", date: "1 day ago", status: "Pending", file: "app.js" },
  { id: 3, student: "DataMiner", node: "Database Fruit", date: "3 days ago", status: "Graded", file: "schema.sql" },
];

export default function SubmissionsPage() {
  const params = useParams();

  return (
    <div className="min-h-screen bg-deep-forest flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-5xl mx-auto w-full p-6 py-10">
        
        <div className="flex items-center gap-4 mb-8">
            <Link href="/creator" className="text-slate-400 hover:text-white">
                <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold text-white">Submission Review</h1>
        </div>

        <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 bg-slate-950/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <div className="col-span-3">Student</div>
                <div className="col-span-3">Quest Node</div>
                <div className="col-span-2">Submitted</div>
                <div className="col-span-2">Attachment</div>
                <div className="col-span-2 text-right">Action</div>
            </div>

            {SUBMISSIONS.map(sub => (
                <div key={sub.id} className="grid grid-cols-12 gap-4 p-4 items-center border-b border-white/5 hover:bg-white/5 transition-colors">
                    <div className="col-span-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold">
                            {sub.student[0]}
                        </div>
                        <span className="font-bold text-white">{sub.student}</span>
                    </div>
                    
                    <div className="col-span-3 text-slate-300 text-sm">
                        {sub.node}
                    </div>
                    
                    <div className="col-span-2 text-slate-500 text-xs">
                        {sub.date}
                    </div>
                    
                    <div className="col-span-2">
                        <button className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-xs font-bold transition-colors">
                            <FileText size={14} /> {sub.file}
                        </button>
                    </div>
                    
                    <div className="col-span-2 flex justify-end gap-2">
                        {sub.status === 'Pending' ? (
                            <>
                                <button className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg border border-emerald-500/20 transition-colors" title="Approve">
                                    <CheckCircle size={18} />
                                </button>
                                <button className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg border border-red-500/20 transition-colors" title="Reject">
                                    <XCircle size={18} />
                                </button>
                            </>
                        ) : (
                            <span className="text-xs font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded">
                                {sub.status}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>

      </main>
    </div>
  );
}




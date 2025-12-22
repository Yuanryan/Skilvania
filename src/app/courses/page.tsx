"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect to the main explore page on landing page
export default function CoursesRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/#explore');
  }, [router]);

  return (
    <div className="min-h-screen bg-deep-forest flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <p>Redirecting to explore page...</p>
            </div>
    </div>
  );
}

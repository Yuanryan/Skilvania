"use client";

import Link from 'next/link';
import { Sparkles, Users, Search, Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import { Navbar } from '@/components/ui/Navbar';
import { StartButton } from '@/components/landing/StartButton';
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useSession } from 'next-auth/react';

// Import from courses page
import { Globe, Code, Cpu, Database } from 'lucide-react';

const iconMap: Record<string, any> = {
  'web': Globe,
  'full stack': Globe,
  'machine learning': Cpu,
  'ai': Cpu,
  'devops': Database,
  'react': Code,
  'javascript': Code,
};

const colorMap: Record<string, string> = {
  'web': 'emerald',
  'full stack': 'emerald',
  'machine learning': 'purple',
  'ai': 'purple',
  'devops': 'blue',
  'react': 'cyan',
  'javascript': 'cyan',
};

const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  'emerald': {
    bg: 'bg-emerald-900/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  'purple': {
    bg: 'bg-purple-900/20',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
  },
  'blue': {
    bg: 'bg-blue-900/20',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
  },
  'cyan': {
    bg: 'bg-cyan-900/20',
    text: 'text-cyan-400',
    border: 'border-cyan-500/20',
  },
  'orange': {
    bg: 'bg-orange-900/20',
    text: 'text-orange-400',
    border: 'border-orange-500/20',
  },
  'pink': {
    bg: 'bg-pink-900/20',
    text: 'text-pink-400',
    border: 'border-pink-500/20',
  },
};

const getLevel = (nodes: number): string => {
  if (nodes <= 15) return 'Beginner';
  if (nodes <= 30) return 'Intermediate';
  return 'Advanced';
};

const getIconAndColor = (title: string) => {
  const lowerTitle = title.toLowerCase();
  for (const [key, icon] of Object.entries(iconMap)) {
    if (lowerTitle.includes(key)) {
      return { icon, color: colorMap[key] || 'emerald' };
    }
  }
  return { icon: Globe, color: 'emerald' };
};

interface Course {
  id: string;
  title: string;
  description: string;
  author: string;
  nodes: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

interface MatchedUser {
  userID: number;
  username: string;
  level: number;
  xp: number;
  bio: string | null;
  interests: string[];
  sharedCourses: { courseId: number; courseTitle: string }[];
  compatibilityScore: number;
}

interface StudyGroup {
  groupId: number;
  name: string;
  description: string | null;
  type: 'public' | 'private';
  tagId: number | null;
  tagName: string | null;
  creatorId: number;
  memberCount: number;
  isMember: boolean;
  userRole: 'admin' | 'member' | null;
  createdAt: string;
  updatedAt: string;
}

interface CoursesByTag {
  [tag: string]: Course[];
}

// Branching Animation Component
const BranchingLines = () => {
  // Sync with seed animation:
  // Seed fades out 1200-1400px.
  // Tree should start growing just as seed plants (approx 1350px) and finish by 1700px.
  const { scrollY } = useScroll();

  const pathLength = useTransform(scrollY, [1350, 1700], [0, 1]);
  // Branches fade in, then fade out right after appearing
  const opacity = useTransform(scrollY, [1350, 1400, 1600, 1700], [0, 1, 1, 0]);
  
  // Import useTransform for the circle animation
  const circleOpacity = useTransform(scrollY, [1300, 1400], [0, 1]);
  const circleScale = useTransform(scrollY, [1300, 1400], [0, 1]);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <svg className="w-full h-full" preserveAspectRatio="xMidYMin meet" viewBox="0 0 100 100">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Main Trunk - positioned slightly left */}
        <motion.path
          d="M43 3 L43 20"
          stroke="#34d399"
          strokeWidth="0.5"
          strokeLinecap="round"
          filter="url(#glow)"
          fill="none"
          style={{ pathLength, opacity }}
        />
        {/* Branch Left */}
        <motion.path
          d="M43 20 C43 35 13 35 13 50"
          stroke="#34d399"
          strokeWidth="0.4"
          strokeLinecap="round"
          filter="url(#glow)"
          fill="none"
          style={{ pathLength, opacity }}
        />
        {/* Branch Center */}
        <motion.path
          d="M43 20 L43 50"
          stroke="#34d399"
          strokeWidth="0.4"
          strokeLinecap="round"
          filter="url(#glow)"
          fill="none"
          style={{ pathLength, opacity }}
        />
        {/* Branch Right */}
        <motion.path
          d="M43 20 C43 35 73 35 73 50"
          stroke="#34d399"
          strokeWidth="0.4"
          strokeLinecap="round"
          filter="url(#glow)"
          fill="none"
          style={{ pathLength, opacity }}
        />
      </svg>
    </div>
  );
};

export default function LandingPage() {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useSession();
  const exploreRef = useRef<HTMLElement>(null);
  const [hasEnteredExplore, setHasEnteredExplore] = useState(false);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [trendingCourses, setTrendingCourses] = useState<Course[]>([]);
  const [coursesByTag, setCoursesByTag] = useState<CoursesByTag>({});
  const [recommendedUsers, setRecommendedUsers] = useState<MatchedUser[]>([]);
  const [recommendedGroups, setRecommendedGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [shouldScrollToExplore, setShouldScrollToExplore] = useState(false);
  const [joiningGroupId, setJoiningGroupId] = useState<number | null>(null);
  const fetchedRef = useRef(false);
  const recommendedUsersFetchedRef = useRef(false);
  const groupsFetchedRef = useRef(false);

  // Custom smooth scroll function with slower speed
  const smoothScrollTo = (element: HTMLElement | null, duration: number = 1500) => {
    if (!element) return;
    
    const targetPosition = element.getBoundingClientRect().top + window.pageYOffset;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime: number | null = null;

    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animation = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const ease = easeInOutCubic(progress);

      window.scrollTo(0, startPosition + distance * ease);

      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      }
    };

    requestAnimationFrame(animation);
  };

  const handleStartClick = () => {
    smoothScrollTo(exploreRef.current, 1500);
  };

  // Use Intersection Observer to detect when explore section is visible/hidden
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setHasEnteredExplore(true);
          } else {
            // Hide sidebar when explore section is not visible (user scrolled back up)
            setHasEnteredExplore(false);
          }
        });
      },
      { threshold: 0.1 } // Trigger when 10% of the section is visible
    );

    if (exploreRef.current) {
      observer.observe(exploreRef.current);
    }

    return () => {
      if (exploreRef.current) {
        observer.unobserve(exploreRef.current);
      }
    };
  }, []);

  // Also check scroll position to hide sidebar when at top of page (backup to Intersection Observer)
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      
      // If user is at the very top of the page (landing section), hide sidebar
      // This is a backup in case Intersection Observer doesn't catch it
      if (scrollY < 100) {
        setHasEnteredExplore(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Fetch courses function - with smart caching
  const fetchCourses = useCallback(async (forceRefresh = false) => {
    // Skip if already fetched and not forcing refresh
    if (fetchedRef.current && !forceRefresh) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/courses?status=published', {
        // Only add no-cache headers when forcing refresh
        ...(forceRefresh && {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch courses');
      }

      const data = await response.json();
      const courses = data.courses || [];
      setAllCourses(courses);

      const trending = [...courses]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 3);
      setTrendingCourses(trending);

      const grouped: CoursesByTag = {};
      for (const course of courses) {
        if (course.tags && course.tags.length > 0) {
          for (const tag of course.tags) {
            if (!grouped[tag]) {
              grouped[tag] = [];
            }
            if (grouped[tag].length < 6) {
              grouped[tag].push(course);
            }
          }
        }
      }
      setCoursesByTag(grouped);

      fetchedRef.current = true;
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch recommended users function - with smart caching
  const fetchRecommendedUsers = useCallback(async (forceRefresh = false) => {
    // 未登入時不抓取推薦用戶
    if (status !== 'authenticated') {
      setRecommendedUsers([]);
      setUsersLoading(false);
      return;
    }

    // Skip if already fetched and not forcing refresh
    if (recommendedUsersFetchedRef.current && !forceRefresh) {
      return;
    }

    try {
      setUsersLoading(true);
      const response = await fetch('/api/community/match', {
        // Only add no-cache headers when forcing refresh
        ...(forceRefresh && {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
      });
      if (response.ok) {
        const data = await response.json();
        setRecommendedUsers(data.matches?.slice(0, 4) || []);
        recommendedUsersFetchedRef.current = true;
      }
    } catch (err) {
      console.error('Failed to fetch recommended users:', err);
    } finally {
      setUsersLoading(false);
    }
  }, [status]);

  // Fetch recommended study groups function - with smart caching
  const fetchRecommendedGroups = useCallback(async (forceRefresh = false) => {
    // 未登入時不抓取推薦社群
    if (status !== 'authenticated') {
      setRecommendedGroups([]);
      setGroupsLoading(false);
      return;
    }

    // Skip if already fetched and not forcing refresh
    if (groupsFetchedRef.current && !forceRefresh) {
      return;
    }

    try {
      setGroupsLoading(true);
      const response = await fetch('/api/community/groups/recommended', {
        // Only add no-cache headers when forcing refresh
        ...(forceRefresh && {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Recommended groups data:', data);
        const groups = data.recommendedGroups || [];
        console.log('Setting recommended groups:', groups.length);
        setRecommendedGroups(groups);
        groupsFetchedRef.current = true;
      } else {
        console.error('Failed to fetch recommended groups:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error details:', errorData);
        setRecommendedGroups([]); // Set empty array on error
      }
    } catch (err) {
      console.error('Failed to fetch recommended groups:', err);
    } finally {
      setGroupsLoading(false);
    }
  }, [status]);

  // Handle joining a study group
  const handleJoinGroup = useCallback(async (groupId: number) => {
    try {
      setJoiningGroupId(groupId);
      const response = await fetch(`/api/community/groups/${groupId}/join`, {
        method: 'POST'
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to join group');
        return;
      }

      // Refresh recommended groups to update membership status
      await fetchRecommendedGroups(true);
      
      // Navigate to the group in messages
      router.push(`/community/messages?groupId=${groupId}`);
    } catch (error) {
      console.error('Error joining group:', error);
      alert('Failed to join group');
    } finally {
      setJoiningGroupId(null);
    }
  }, [fetchRecommendedGroups, router]);

  // Function to scroll to explore section - simplified
  const scrollToExplore = useCallback(() => {
    if (!exploreRef.current) return;
    
    const elementPosition = exploreRef.current.getBoundingClientRect().top + window.pageYOffset;
    const navbarHeight = 64;
    const extraOffset = 80; // Additional offset to scroll a bit lower
    const targetPosition = elementPosition - navbarHeight + extraOffset;
    
    window.scrollTo({
      top: targetPosition,
      behavior: 'instant'
    });
  }, []);

  // Initial data fetch on mount
  useEffect(() => {
    if (pathname === '/') {
      fetchCourses();
      fetchRecommendedUsers();
      fetchRecommendedGroups();
    }
  }, [pathname, fetchCourses, fetchRecommendedUsers, fetchRecommendedGroups]);

  // Handle scroll position and hash changes - simplified
  useEffect(() => {
    const performScrollIfNeeded = () => {
      const hash = window.location.hash;
      
      if (hash === '#explore') {
        setHasEnteredExplore(true);
        
        // If data is already loaded, scroll immediately
        if (!loading && !usersLoading && !groupsLoading && exploreRef.current) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              scrollToExplore();
            });
          });
        } else {
          // Otherwise, wait for data to load
          setShouldScrollToExplore(true);
        }
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
        setHasEnteredExplore(false);
        setShouldScrollToExplore(false);
      }
    };

    // Handle hash changes
    window.addEventListener('hashchange', performScrollIfNeeded);
    
    // Initial check (for direct navigation or page reload)
    performScrollIfNeeded();
    
    return () => {
      window.removeEventListener('hashchange', performScrollIfNeeded);
    };
  }, [loading, usersLoading, scrollToExplore]);

  // Scroll to explore section after data is loaded
  useEffect(() => {
    if (shouldScrollToExplore && !loading && !usersLoading && !groupsLoading && exploreRef.current) {
      // Wait for DOM to settle
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToExplore();
          setShouldScrollToExplore(false);
        });
      });
    }
  }, [shouldScrollToExplore, loading, usersLoading, groupsLoading, scrollToExplore]);

  const filteredCourses = searchQuery.trim() 
    ? allCourses.filter(course => 
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setIsSearching(query.trim().length > 0);
  };

  // Skeleton placeholder for course card
  const CourseCardSkeleton = () => (
    <div className="bg-slate-900/50 backdrop-blur border border-white/5 rounded-2xl p-6 h-full flex flex-col animate-pulse">
      <div className="h-6 bg-slate-700/50 rounded mb-3 w-3/4"></div>
      <div className="h-4 bg-slate-700/30 rounded mb-2 w-full"></div>
      <div className="h-4 bg-slate-700/30 rounded mb-4 w-5/6"></div>
      <div className="h-3 bg-slate-700/30 rounded mb-4 w-1/3"></div>
      <div className="flex gap-2 mb-4">
        <div className="h-5 bg-slate-700/30 rounded w-16"></div>
        <div className="h-5 bg-slate-700/30 rounded w-20"></div>
        <div className="h-5 bg-slate-700/30 rounded w-14"></div>
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
        <div className="h-4 bg-slate-700/30 rounded w-20"></div>
        <div className="h-4 bg-slate-700/30 rounded w-24"></div>
      </div>
    </div>
  );

  // Skeleton placeholder for category section
  const CategorySectionSkeleton = () => (
    <div className="space-y-12">
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-slate-700/50 rounded w-32"></div>
            <div className="h-4 bg-slate-700/30 rounded w-20"></div>
          </div>
          <div className="relative">
            <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
              <div className="flex gap-6 min-w-max">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="flex-shrink-0 w-80">
                    <CourseCardSkeleton />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const CourseCard = ({ course }: { course: Course }) => {
    const { icon: CourseIcon, color } = getIconAndColor(course.title);
    const level = getLevel(course.nodes);
    const colorClass = colorClasses[color] || colorClasses['emerald'];
    
    return (
      <div className="h-full">
        <Link 
          href={`/courses/${course.id}`} 
          className="group bg-slate-900/50 backdrop-blur border border-white/5 hover:border-emerald-500/30 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-xl h-full flex flex-col block"
        >
          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors line-clamp-1">
            {course.title}
          </h3>
          <p className="text-slate-400 text-sm mb-3 line-clamp-2">{course.description}</p>
          <p className="text-xs text-slate-500 mb-4">by {course.author}</p>
          
          {course.tags && course.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {course.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-slate-500 font-medium uppercase tracking-wider mt-auto">
            <span>{course.nodes} Nodes</span>
            <span className={colorClass.text}>{level}</span>
          </div>
        </Link>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-deep-forest">
      {/* Only show navbar when in explore section */}
      {hasEnteredExplore && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <Navbar />
        </div>
      )}
      
      {/* Hero Section - Sticky Wrapper */}
      {/* 
          The wrapper provides scroll space (100vh + 850px).
          Phase 1 (0-700px): Button transforms to round seed, page stays fixed
          Phase 2 (700-850px): Seed moves down, page still stays fixed
          After 850px: Page scrolls naturally (earlier transition)
      */}
      <div className="relative h-[calc(100vh+700px)] z-30">
        <section className="sticky top-0 h-screen flex flex-col items-center justify-center text-center px-6 pt-20 pb-32">
          
          {/* Background Effects */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-900/20 rounded-full blur-3xl"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900/50 via-transparent to-transparent"></div>
          </div>

          <div className="relative z-10 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-800/50 text-emerald-400 text-sm font-medium mb-6 animate-fade-in">
              <Sparkles size={14} />
              <span>Reimagine Learning</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-8 leading-tight">
              Grow Your Skills like a <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Living Tree</span>
            </h1>
            
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Forget linear lists. Skilvania visualizes your knowledge as an organic, evolving forest. Unlock nodes, branch out, and cultivate your expertise in a gamified RPG world.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <StartButton onStartClick={handleStartClick} />
              <Link 
                href="/creator" 
                className="px-8 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg transition-all border border-slate-700 hover:border-slate-600"
              >
                Create a Course
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Explore Section */}
      <section 
        id="explore" 
        ref={exploreRef} 
        className="relative border-t border-white/5 pt-32 pb-20"
      >
        <BranchingLines />
        
        <div className="max-w-7xl mx-auto w-full px-6 pr-0 lg:pr-[calc(20rem+2rem)] xl:pr-[calc(24rem+2rem)] relative z-10">
          <div className="mb-12">
            <h1 className="text-5xl font-bold text-white">
              Explore <span className="text-emerald-400">Learning Paths</span>
            </h1>
          </div>

          {error ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4 text-white bg-slate-900/50 p-8 rounded-2xl border border-red-500/20">
                <AlertCircle size={48} className="text-red-500" />
                <p className="text-lg font-bold">Failed to load</p>
                <p className="text-slate-400">{error}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-16">
              {/* Trending Courses Section */}
              {loading ? (
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-900/20 rounded-lg border border-orange-500/20">
                        <TrendingUp className="text-orange-400" size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">Trending Now</h2>
                        <p className="text-slate-400 text-sm">Loading...</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <CourseCardSkeleton key={i} />
                    ))}
                  </div>
                </section>
              ) : !isSearching && trendingCourses.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-900/20 rounded-lg border border-orange-500/20">
                        <TrendingUp className="text-orange-400" size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">Trending Now</h2>
                        <p className="text-slate-400 text-sm">Popular courses updated recently ({trendingCourses.length})</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trendingCourses.map(course => (
                      <CourseCard key={course.id} course={course} />
                    ))}
                  </div>
                </section>
              )}
              
              {/* Debug: Show if no trending courses */}
              {!isSearching && trendingCourses.length === 0 && !loading && (
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 text-yellow-300 text-sm">
                  Debug: No trending courses found. Total courses: {allCourses.length}
                </div>
              )}

              {/* Search Bar Section */}
              <section>
                <div className="relative">
                  <Search className="absolute left-4 top-4 text-slate-500" size={24} />
                  <input 
                    type="text" 
                    placeholder="Search for courses, skills, or topics..." 
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 pl-14 pr-6 text-white text-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </section>

              {/* Search Results */}
              {isSearching && (
                <section>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Search Results
                    </h2>
                    <p className="text-slate-400">
                      {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} found for "{searchQuery}"
                    </p>
                  </div>
                  {filteredCourses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredCourses.map(course => (
                        <CourseCard key={course.id} course={course} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-slate-700">
                      <p className="text-slate-400 text-lg">No courses found matching your search.</p>
                    </div>
                  )}
                </section>
              )}

              {/* Courses by Tags */}
              {loading ? (
                <section data-section="categories">
                  <CategorySectionSkeleton />
                </section>
              ) : !isSearching && Object.keys(coursesByTag).length > 0 && (
                <section data-section="categories">
                  <div className="space-y-12">
                    {Object.entries(coursesByTag)
                      .sort(([, coursesA], [, coursesB]) => coursesB.length - coursesA.length)
                      .slice(0, 5)
                      .map(([tag, courses]) => (
                        <div key={tag}>
                          <div className="mb-4">
                            <h3 className="text-xl font-bold text-white capitalize">
                              {tag}
                              <span className="ml-2 text-sm font-normal text-slate-400">
                                ({courses.length} {courses.length === 1 ? 'course' : 'courses'})
                              </span>
                            </h3>
                          </div>
                          <div className="relative">
                            <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
                              <div className="flex gap-6 min-w-max">
                                {courses.map(course => (
                                  <div key={course.id} className="flex-shrink-0 w-80">
                                    <CourseCard course={course} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </section>
              )}

              {/* Empty State */}
              {!loading && !isSearching && trendingCourses.length === 0 && Object.keys(coursesByTag).length === 0 && (
                <div className="text-center py-20">
                  <div className="text-white">
                    <p className="text-xl font-bold mb-2">No courses available yet</p>
                    <p className="text-slate-400">Check back later for new learning paths!</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar - Connect with Learners */}
        <AnimatePresence>
          {hasEnteredExplore && !isSearching && (recommendedUsers.length > 0 || recommendedGroups.length > 0 || groupsLoading || usersLoading) && (
            <motion.aside 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50, transition: { duration: 0.3 } }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="hidden lg:block fixed right-0 top-0 h-screen w-80 xl:w-96 pt-24 pb-6 pr-6 z-40"
            >
            <div className="h-full overflow-y-auto pr-2 no-scrollbar">
              <div className="bg-slate-900/50 backdrop-blur border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-900/20 rounded-lg border border-blue-500/20">
                      <Users className="text-blue-400" size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Connect</h2>
                      <p className="text-slate-400 text-xs">Study buddies & groups</p>
                    </div>
                  </div>

                </div>
                
                <div className="max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar space-y-6">
                  {/* Users Section - Study Buddies on top */}
                  {usersLoading && recommendedUsers.length === 0 && (
                    <div className="py-4 text-center">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">Loading study buddies...</p>
                    </div>
                  )}
                  {recommendedUsers.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Study Buddies</h3>
                      {recommendedUsers.slice(0, 3).map((user, index) => (
                        <div key={user.userID}>
                          <div className="py-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                  {user.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-white text-sm truncate">{user.username}</h3>
                                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                    <span>Level {user.level}</span>
                                    <span>•</span>
                                    <span>{user.xp.toLocaleString()} XP</span>
                                  </div>
                                </div>
                              </div>
                              <div className={`px-2 py-1 rounded text-xs font-semibold ${
                                user.compatibilityScore >= 80 ? 'text-emerald-400 bg-emerald-900/30' :
                                user.compatibilityScore >= 60 ? 'text-blue-400 bg-blue-900/30' :
                                user.compatibilityScore >= 40 ? 'text-yellow-400 bg-yellow-900/30' :
                                'text-slate-400 bg-slate-800'
                              }`}>
                                {user.compatibilityScore}%
                              </div>
                            </div>
                            
                            {user.bio && (
                              <p className="text-xs text-slate-400 mb-2 line-clamp-2">{user.bio}</p>
                            )}
                            
                            {user.interests.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {user.interests.slice(0, 3).map((interest, idx) => (
                                  <span key={idx} className="text-xs bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded">
                                    {interest}
                                  </span>
                                ))}
                                {user.interests.length > 3 && (
                                  <span className="text-xs text-slate-500">+{user.interests.length - 3}</span>
                                )}
                              </div>
                            )}
                            
                            <div className="text-xs text-slate-500 mb-2">
                              {user.sharedCourses.length} shared {user.sharedCourses.length === 1 ? 'course' : 'courses'}
                            </div>
                            
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  router.push(`/community/messages?userId=${user.userID}`);
                                }}
                                className="flex-1 bg-blue-600 text-white py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-blue-500 transition-colors text-center cursor-pointer relative z-10"
                                type="button"
                              >
                                Message
                              </button>
                              <Link
                                href={`/profile/${user.username}`}
                                className="flex-1 bg-slate-700 text-white py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-slate-600 transition-colors text-center"
                              >
                                View
                              </Link>
                            </div>
                          </div>
                          {index < Math.min(recommendedUsers.length, 3) - 1 && (
                            <div className="border-t border-white/10"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Study Groups Section - Below Study Buddies */}
                  {groupsLoading && recommendedGroups.length === 0 && (
                    <div className="py-4 text-center">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">Loading study groups...</p>
                    </div>
                  )}
                  {recommendedGroups.length > 0 && (
                    <div>
                      {recommendedUsers.length > 0 && (
                        <div className="border-t border-white/10 mb-4 mt-4"></div>
                      )}
                      <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Study Groups</h3>
                      {recommendedGroups.slice(0, 2).map((group, index) => (
                        <div key={group.groupId}>
                          <div className="py-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-white text-sm truncate mb-1">{group.name}</h4>
                                {group.description && (
                                  <p className="text-xs text-slate-400 mb-2 line-clamp-2">{group.description}</p>
                                )}
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                  <Users size={12} />
                                  <span>{group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}</span>
                                  {group.tagName && (
                                    <>
                                      <span>•</span>
                                      <span className="text-emerald-400">{group.tagName}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleJoinGroup(group.groupId);
                              }}
                              disabled={joiningGroupId === group.groupId}
                              className="mt-3 block w-full bg-emerald-600 text-white py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-center cursor-pointer relative z-10 flex items-center justify-center gap-2"
                              type="button"
                            >
                              {joiningGroupId === group.groupId ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Joining...</span>
                                </>
                              ) : (
                                <span>Join Group</span>
                              )}
                            </button>
                          </div>
                          {index < Math.min(recommendedGroups.length, 2) - 1 && (
                            <div className="border-t border-white/10"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.aside>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}

'use client';

export function PostCardSkeleton() {
  return (
    <div className="flex flex-col h-[400px] rounded-xl overflow-hidden border border-[#2F2A26] bg-[#110F0E] animate-pulse">
      <div className="h-48 bg-[#191614] shrink-0" />
      <div className="p-6 flex flex-col flex-1">
        <div className="h-3 w-20 bg-[#191614] rounded-full mb-4" />
        <div className="h-6 w-3/4 bg-[#191614] rounded mb-3" />
        <div className="h-4 w-full bg-[#191614] rounded mb-2" />
        <div className="h-4 w-2/3 bg-[#191614] rounded mb-4" />
        <div className="mt-auto pt-4 border-t border-[#2F2A26]/40 flex justify-between items-center">
          <div className="h-3 w-16 bg-[#191614] rounded" />
          <div className="h-4 w-4 bg-[#191614] rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function PostGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PageHeroSkeleton() {
  return (
    <div className="pt-28 md:pt-36 pb-12 md:pb-20 px-4 md:px-8 animate-pulse">
      <div className="max-w-4xl mx-auto text-center">
        <div className="h-4 w-32 bg-[#191614] rounded-full mx-auto mb-6" />
        <div className="h-12 w-3/4 bg-[#191614] rounded mx-auto mb-4" />
        <div className="h-12 w-1/2 bg-[#191614] rounded mx-auto mb-8" />
        <div className="h-6 w-2/3 bg-[#191614] rounded mx-auto mb-10" />
        <div className="h-12 w-40 bg-[#191614] rounded-full mx-auto" />
      </div>
    </div>
  );
}

export function SinglePostSkeleton() {
  return (
    <div className="min-h-screen bg-[#0F0E0D] animate-pulse">
      <div className="h-[40vh] md:h-[50vh] bg-[#191614]" />
      <div className="max-w-3xl mx-auto px-4 md:px-6 -mt-20 md:-mt-32 relative z-10">
        <div className="h-4 w-24 bg-[#191614]/60 rounded mb-6" />
        <div className="h-8 w-20 bg-[#191614] rounded-full mb-4" />
        <div className="h-10 w-full bg-[#191614] rounded mb-3" />
        <div className="h-10 w-3/4 bg-[#191614] rounded mb-4" />
        <div className="h-5 w-2/3 bg-[#191614] rounded mb-6" />
        <div className="flex gap-4 mb-10">
          <div className="h-3 w-24 bg-[#191614] rounded" />
          <div className="h-3 w-20 bg-[#191614] rounded" />
        </div>
        <div className="space-y-3 pb-24">
          <div className="h-4 w-full bg-[#191614] rounded" />
          <div className="h-4 w-full bg-[#191614] rounded" />
          <div className="h-4 w-5/6 bg-[#191614] rounded" />
          <div className="h-4 w-full bg-[#191614] rounded" />
          <div className="h-4 w-3/4 bg-[#191614] rounded" />
          <div className="h-4 w-full bg-[#191614] rounded" />
          <div className="h-4 w-2/3 bg-[#191614] rounded" />
        </div>
      </div>
    </div>
  );
}

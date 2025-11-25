import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PhotoCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <Skeleton className="aspect-[4/3] rounded-lg mb-3" />
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );
}

export function PhotoGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[...Array(count)].map((_, i) => (
        <PhotoCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function MenuCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

export function MenuGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(count)].map((_, i) => (
        <MenuCardSkeleton key={i} />
      ))}
    </div>
  );
}

import { useState, useEffect } from "react";
import { SearchBox } from "@/components/SearchBox";
import { JourneyCard } from "@/components/JourneyCard";
import { Map } from "@/components/Map";
import { usePlanRoute, getPlanRouteQueryKey } from "@workspace/api-client-react";
import type { Place, Journey } from "@workspace/api-client-react/src/generated/api.schemas";
import { Bike, Compass } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Home() {
  const [fromPlace, setFromPlace] = useState<Place | null>(null);
  const [toPlace, setToPlace] = useState<Place | null>(null);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);

  const shouldPlanRoute = !!fromPlace && !!toPlace;

  const { data: routeData, isLoading: isRouting } = usePlanRoute(
    {
      fromLat: fromPlace?.lat || 0,
      fromLon: fromPlace?.lon || 0,
      toLat: toPlace?.lat || 0,
      toLon: toPlace?.lon || 0,
      fromName: fromPlace?.name,
      toName: toPlace?.name,
    },
    {
      query: {
        enabled: shouldPlanRoute,
        queryKey: getPlanRouteQueryKey({
          fromLat: fromPlace?.lat || 0,
          fromLon: fromPlace?.lon || 0,
          toLat: toPlace?.lat || 0,
          toLon: toPlace?.lon || 0,
          fromName: fromPlace?.name,
          toName: toPlace?.name,
        }),
      },
    }
  );

  useEffect(() => {
    if (routeData?.journeys?.length) {
      setSelectedJourneyId(routeData.journeys[0].id);
    } else {
      setSelectedJourneyId(null);
    }
  }, [routeData]);

  const selectedJourney =
    routeData?.journeys?.find((j) => j.id === selectedJourneyId) || null;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background font-sans">
      {/* Sidebar Panel */}
      <div className="w-full md:w-[420px] shrink-0 border-r border-border bg-card flex flex-col z-20 shadow-2xl">
        <div className="p-6 pb-4 border-b border-border bg-background">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Bike Transit</h1>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">London Edition</p>
            </div>
          </div>

          <div className="space-y-3 relative">
            <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-border -z-10" />
            <SearchBox
              placeholder="Where from?"
              value={fromPlace}
              onSelect={setFromPlace}
            />
            <SearchBox
              placeholder="Where to?"
              value={toPlace}
              onSelect={setToPlace}
            />
          </div>
        </div>

        <ScrollArea className="flex-1 bg-muted/30">
          <div className="p-6">
            {!shouldPlanRoute && (
              <div className="flex flex-col items-center justify-center text-center p-8 text-muted-foreground mt-12">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Compass className="w-8 h-8 opacity-50" />
                </div>
                <p className="font-medium text-lg text-foreground">Where to next?</p>
                <p className="text-sm mt-1">Enter your start and end points to see your fastest cycling routes.</p>
              </div>
            )}

            {isRouting && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex flex-col gap-4 p-4 rounded-xl border border-border bg-card">
                    <div className="h-8 bg-muted rounded w-1/4"></div>
                    <div className="h-10 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            )}

            {routeData?.journeys && !isRouting && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Suggested Routes
                </h2>
                {routeData.journeys.map((journey) => (
                  <JourneyCard
                    key={journey.id}
                    journey={journey}
                    isSelected={selectedJourneyId === journey.id}
                    onClick={() => setSelectedJourneyId(journey.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative z-10 h-[100dvh]">
        <Map
          fromPlace={fromPlace}
          toPlace={toPlace}
          selectedJourney={selectedJourney}
        />
      </div>
    </div>
  );
}

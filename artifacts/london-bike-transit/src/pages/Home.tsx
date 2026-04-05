import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchBox } from "@/components/SearchBox";
import { JourneyCard } from "@/components/JourneyCard";
import { Map } from "@/components/Map";
import { BikeRulesPanel } from "@/components/BikeRulesPanel";
import { planRoute, type Place, type Journey } from "@/lib/transit";
import { getPeakStatus } from "@/lib/bikeRules";
import { Bike, Compass, Clock, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Home() {
  const [fromPlace, setFromPlace] = useState<Place | null>(null);
  const [toPlace, setToPlace] = useState<Place | null>(null);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [peakStatus, setPeakStatus] = useState(() => getPeakStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setPeakStatus(getPeakStatus());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const shouldPlanRoute = !!fromPlace && !!toPlace;

  const { data: routeData, isLoading: isRouting } = useQuery({
    queryKey: ["plan-route", fromPlace?.lat, fromPlace?.lon, toPlace?.lat, toPlace?.lon],
    queryFn: () =>
      planRoute(
        fromPlace!.lat,
        fromPlace!.lon,
        toPlace!.lat,
        toPlace!.lon,
        fromPlace!.name,
        toPlace!.name
      ),
    enabled: shouldPlanRoute,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (routeData?.journeys?.length) {
      setSelectedJourneyId(routeData.journeys[0].id);
    } else {
      setSelectedJourneyId(null);
    }
  }, [routeData]);

  const selectedJourney: Journey | null =
    routeData?.journeys?.find((j) => j.id === selectedJourneyId) ?? null;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background font-sans">
      {/* Sidebar Panel */}
      <div className="w-full md:w-[420px] shrink-0 border-r border-border bg-card flex flex-col z-20 shadow-2xl">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border bg-background">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Bike Transit</h1>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">London Edition</p>
            </div>
          </div>

          {/* Peak/Off-peak indicator */}
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-xs font-medium ${
              peakStatus.isPeak
                ? "bg-amber-50 text-amber-800 border border-amber-200"
                : "bg-green-50 text-green-800 border border-green-200"
            }`}
            data-testid="status-peak-indicator"
          >
            {peakStatus.isPeak ? (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Clock className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>
              {peakStatus.label}
              {peakStatus.isPeak && (
                <span className="font-normal ml-1 opacity-80">
                  · restrictions lift at {peakStatus.nextChange}
                </span>
              )}
            </span>
          </div>

          {/* Search inputs */}
          <div className="space-y-2.5">
            <SearchBox
              placeholder="Where from?"
              value={fromPlace}
              onSelect={(place) => {
                setFromPlace(place);
                setSelectedJourneyId(null);
              }}
            />
            <SearchBox
              placeholder="Where to?"
              value={toPlace}
              onSelect={(place) => {
                setToPlace(place);
                setSelectedJourneyId(null);
              }}
            />
          </div>
        </div>

        <ScrollArea className="flex-1 bg-muted/30">
          <div className="p-5 space-y-4">
            {/* Bike rules reference — always visible */}
            <BikeRulesPanel />

            {/* Empty state */}
            {!shouldPlanRoute && (
              <div className="flex flex-col items-center justify-center text-center p-6 text-muted-foreground mt-4">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Compass className="w-7 h-7 opacity-50" />
                </div>
                <p className="font-medium text-base text-foreground">Where to next?</p>
                <p className="text-sm mt-1">Enter your start and end points to see routes with cycling instead of walking.</p>
              </div>
            )}

            {/* Loading skeleton */}
            {isRouting && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex flex-col gap-3 p-4 rounded-xl border border-border bg-card">
                    <div className="h-7 bg-muted rounded w-1/4"></div>
                    <div className="h-9 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Route results */}
            {routeData?.journeys && !isRouting && (
              <div className="space-y-3">
                {routeData.journeys.length === 0 ? (
                  <div className="text-center text-muted-foreground py-6 border border-border rounded-xl bg-card px-4">
                    <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                    <p className="font-medium text-foreground">
                      {routeData.filteredCount > 0
                        ? "No viable bike routes right now"
                        : "No routes found"}
                    </p>
                    <p className="text-sm mt-1">
                      {routeData.filteredCount > 0
                        ? peakStatus.isPeak
                          ? `All ${routeData.filteredCount} routes have bike restrictions during peak hours. Try again after ${peakStatus.nextChange}.`
                          : "The available routes use modes that don't allow bikes. Try different locations."
                        : "Try different locations in London."}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Viable routes
                      </h2>
                      <span className="text-xs text-muted-foreground">
                        {routeData.journeys.length} option{routeData.journeys.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {routeData.filteredCount > 0 && (
                      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>
                          {routeData.filteredCount} route{routeData.filteredCount !== 1 ? "s were" : " was"} hidden — {peakStatus.isPeak ? "bike restrictions apply during peak hours" : "they include modes where bikes aren't allowed"}.
                        </span>
                      </div>
                    )}
                    {routeData.journeys.map((journey) => (
                      <JourneyCard
                        key={journey.id}
                        journey={journey}
                        isSelected={selectedJourneyId === journey.id}
                        onClick={() => setSelectedJourneyId(journey.id)}
                      />
                    ))}
                  </>
                )}
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

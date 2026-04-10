import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchBox } from "@/components/SearchBox";
import { JourneyCard } from "@/components/JourneyCard";
import { Map } from "@/components/Map";
import { BikeRulesPanel } from "@/components/BikeRulesPanel";
import { planRoute, type Place, type Journey, type PlanningTime } from "@/lib/transit";
import { getPeakStatus } from "@/lib/bikeRules";
import { Bike, Compass, Clock, AlertTriangle, Navigation, ChevronLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function nowTimeStr() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 15);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function Home() {
  const [fromPlace, setFromPlace] = useState<Place | null>(null);
  const [toPlace, setToPlace] = useState<Place | null>(null);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"routes" | "map">("routes");

  // Planning time state
  const [timeMode, setTimeMode] = useState<"now" | "depart" | "arrive">("now");
  const [planDate, setPlanDate] = useState(todayStr);
  const [planTime, setPlanTime] = useState(nowTimeStr);

  // Live peak status (updates every minute)
  const [livePeakStatus, setLivePeakStatus] = useState(() => getPeakStatus());
  useEffect(() => {
    const interval = setInterval(() => setLivePeakStatus(getPeakStatus()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Build the PlanningTime object for the query
  const planningTime = useMemo<PlanningTime>(() => ({
    mode: timeMode,
    date: planDate.replace(/-/g, ""),       // YYYYMMDD
    time: planTime.replace(":", ""),         // HHMM
  }), [timeMode, planDate, planTime]);

  // Peak status at the planned time (or live if "now")
  const displayPeakStatus = useMemo(() => {
    if (timeMode === "now") return livePeakStatus;
    const [y, m, d] = planDate.split("-").map(Number);
    const [h, min] = planTime.split(":").map(Number);
    return getPeakStatus(new Date(y, m - 1, d, h, min));
  }, [timeMode, planDate, planTime, livePeakStatus]);

  const shouldPlanRoute = !!fromPlace && !!toPlace;

  const { data: routeData, isLoading: isRouting } = useQuery({
    queryKey: [
      "plan-route",
      fromPlace?.lat, fromPlace?.lon,
      toPlace?.lat, toPlace?.lon,
      timeMode, planDate, planTime,
    ],
    queryFn: () =>
      planRoute(
        fromPlace!.lat,
        fromPlace!.lon,
        toPlace!.lat,
        toPlace!.lon,
        fromPlace!.name,
        toPlace!.name,
        planningTime
      ),
    enabled: shouldPlanRoute,
    staleTime: timeMode === "now" ? 2 * 60 * 1000 : 10 * 60 * 1000,
  });

  useEffect(() => {
    if (routeData?.journeys?.length) {
      setSelectedJourneyId(routeData.journeys[0].id);
      setMobileTab("routes"); // return to route list when new results arrive
    } else {
      setSelectedJourneyId(null);
    }
  }, [routeData]);

  const selectedJourney: Journey | null =
    routeData?.journeys?.find((j) => j.id === selectedJourneyId) ?? null;

  // Baseline for the "X min vs cycling" badge — returned directly from planRoute
  // so it's always available even if the cycle-only card falls outside the top 5.
  const cycleOnlyMinutes: number | undefined = routeData?.cycleOnlyMinutes;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background font-sans md:flex">
      {/* ── Map — always absolutely fills the screen on mobile so Leaflet can
           measure a real container; on desktop becomes a flex-1 sidebar partner */}
      <div className="absolute inset-0 md:static md:flex-1 md:order-last">
        <Map
          fromPlace={fromPlace}
          toPlace={toPlace}
          selectedJourney={selectedJourney}
        />

        {/* Mobile-only: "Routes" back button overlaid on the map */}
        <button
          onClick={() => setMobileTab("routes")}
          className={`md:hidden absolute top-4 left-4 z-[1000] bg-white text-foreground shadow-lg rounded-full pl-3 pr-4 py-2 text-sm font-semibold flex items-center gap-1 border border-border/30 active:opacity-70 transition-opacity ${
            mobileTab === "map" ? "flex" : "hidden"
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          Routes
        </button>
      </div>

      {/* ── Routes panel — slides over the map on mobile; fixed sidebar on desktop.
           Uses translate instead of display:none so the map stays mounted & sized. */}
      <div
        className={`absolute inset-0 z-20 flex flex-col w-full
          md:static md:z-auto md:w-[420px] md:min-w-[420px] md:h-[100dvh] md:shrink-0
          border-r border-border bg-card shadow-2xl
          transition-transform duration-300 ease-in-out
          ${mobileTab === "map" ? "translate-x-full md:translate-x-0" : "translate-x-0"}`}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border bg-background">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Navelo</h1>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">London Edition</p>
            </div>
          </div>

          {/* Peak/Off-peak indicator — reflects planned time when set */}
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-xs font-medium ${
              displayPeakStatus.isPeak
                ? "bg-amber-50 text-amber-800 border border-amber-200"
                : "bg-green-50 text-green-800 border border-green-200"
            }`}
            data-testid="status-peak-indicator"
          >
            {displayPeakStatus.isPeak ? (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Clock className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>
              {displayPeakStatus.label}
              {displayPeakStatus.isPeak && (
                <span className="font-normal ml-1 opacity-80">
                  · restrictions lift at {displayPeakStatus.nextChange}
                </span>
              )}
              {timeMode !== "now" && (
                <span className="font-normal ml-1 opacity-70">· at planned time</span>
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

          {/* Departure / arrival time picker */}
          <div className="mt-3">
            <div className="flex bg-muted rounded-lg p-0.5 gap-0.5 text-xs">
              {(["now", "depart", "arrive"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setTimeMode(m)}
                  className={`flex-1 py-1.5 rounded-md font-medium transition-all ${
                    timeMode === m
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "now" ? "Leave now" : m === "depart" ? "Leave at" : "Arrive by"}
                </button>
              ))}
            </div>
            {timeMode !== "now" && (
              <div className="flex gap-2 mt-2">
                <input
                  type="date"
                  value={planDate}
                  min={todayStr()}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="flex-1 text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="time"
                  value={planTime}
                  onChange={(e) => setPlanTime(e.target.value)}
                  className="w-24 text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
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
                        ? displayPeakStatus.isPeak
                          ? `All ${routeData.filteredCount} routes have bike restrictions during peak hours. Try again after ${displayPeakStatus.nextChange}.`
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
                    {routeData.journeys.map((journey) => (
                      <JourneyCard
                        key={journey.id}
                        journey={journey}
                        isSelected={selectedJourneyId === journey.id}
                        cycleOnlyMinutes={cycleOnlyMinutes}
                        onClick={() => setSelectedJourneyId(journey.id)}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Mobile-only: "View on map" sticky button — shown when a journey is selected */}
        {selectedJourney && (
          <div className="md:hidden border-t border-border bg-background p-3 shrink-0">
            <button
              onClick={() => setMobileTab("map")}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 text-sm font-bold shadow-sm active:opacity-80 transition-opacity"
            >
              <Navigation className="w-4 h-4" />
              View on map
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

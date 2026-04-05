import { Router } from "express";
import type { Request, Response } from "express";
import { SearchPlacesQueryParams } from "@workspace/api-zod";

const router = Router();

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  category: string;
}

router.get("/places/search", async (req: Request, res: Response) => {
  const parse = SearchPlacesQueryParams.safeParse(req.query);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }

  const { query } = parse.data;

  try {
    const params = new URLSearchParams({
      q: `${query}, London, UK`,
      format: "json",
      limit: "8",
      addressdetails: "1",
      bounded: "1",
      viewbox: "-0.5103,51.2868,0.3340,51.6919",
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          "User-Agent": "LondonBikeTransit/1.0 (contact@example.com)",
          "Accept-Language": "en",
        },
      }
    );

    if (!response.ok) {
      req.log.error({ status: response.status }, "Nominatim API error");
      res.status(500).json({ error: "Place search failed" });
      return;
    }

    const data: NominatimResult[] = await response.json();

    const places = data.map((item) => ({
      id: String(item.place_id),
      name: item.display_name.split(",")[0].trim(),
      address: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      type: item.category || item.type || "place",
    }));

    res.json(places);
  } catch (err) {
    req.log.error({ err }, "Place search error");
    res.status(500).json({ error: "Place search failed" });
  }
});

export default router;

export interface POISubCategory {
  name: string;
  tagQuery: string;
}

export const POI_TAXONOMY: Record<string, POISubCategory[]> = {
  "COMMERCIAL & OFFICES": [
    { name: "Corporate Office", tagQuery: '"building"~"office|commercial",i' },
    { name: "IT/Tech Center", tagQuery: '"office"~"it|telecommunication",i' },
    { name: "Business Center", tagQuery: '"building"="commercial"' },
    { name: "Bank", tagQuery: '"amenity"="bank"' },
    { name: "ATM", tagQuery: '"amenity"="atm"' },
    { name: "Office", tagQuery: '"office"="yes"' },
  ],
  RETAIL: [
    { name: "Mall/Department Store", tagQuery: '"shop"~"mall|department_store",i' },
    { name: "Supermarket", tagQuery: '"shop"~"market|grocery",i' },
    { name: "Convenience Store", tagQuery: '"shop"="convenience"' },
    { name: "Pharmacy", tagQuery: '"amenity"="pharmacy"' },
    { name: "Hardware", tagQuery: '"shop"~"hardware|doityourself",i' },
    { name: "General Shops", tagQuery: '"shop"~"boutique|clothes|shoes",i' },
    { name: "Marketplace", tagQuery: '"amenity"="marketplace"' },
  ],
  "FOOD, BEVERAGE & HOSPITALITY": [
    { name: "Restaurant", tagQuery: '"amenity"="restaurant"' },
    { name: "Cafe/Coffee Shop", tagQuery: '"amenity"~"cafe|coffee",i' },
    { name: "Fast Food", tagQuery: '"amenity"="fast_food"' },
    { name: "Bar/Pub/Nightclub", tagQuery: '"amenity"~"bar|pub|nightclub",i' },
    { name: "Bakery/Pastry", tagQuery: '"shop"="bakery"' },
    { name: "Food court", tagQuery: '"amenity"="food_court"' },
    { name: "Hotel", tagQuery: '"tourism"="hotel"' },
    { name: "Hostel", tagQuery: '"tourism"="hostel"' },
  ],
  RESIDENTIAL: [
    { name: "Apartments", tagQuery: '"building"="apartments"' },
    { name: "House", tagQuery: '"building"="house"' },
    { name: "Residential Area", tagQuery: '"landuse"="residential"' },
    { name: "Condominium", tagQuery: '"building"="residential"' },
  ],
  "INDUSTRIAL & LOGISTICS": [
    { name: "Expressway Exits", tagQuery: '"highway"~"motorway_junction|toll_gantry",i' },
    { name: "Ports & Terminals", tagQuery: '"industrial"="port"' },
    { name: "Manufacturing Plants", tagQuery: '"industrial"~"factory|manufacturing|processing",i' },
    { name: "Warehouses & Depots", tagQuery: '"building"~"warehouse|depot",i' },
    { name: "Industrial Parks", tagQuery: '"landuse"~"industrial|industrial_estate",i' },
  ],
  "HEALTH & EMERGENCY SERVICES": [
    { name: "Hospital", tagQuery: '"amenity"~"hospital|clinic",i' },
    { name: "Clinic", tagQuery: '"amenity"="clinic"' },
    { name: "Pharmacy", tagQuery: '"amenity"="pharmacy"' },
    { name: "Police Station", tagQuery: '"amenity"="police"' },
    { name: "Fire Station", tagQuery: '"amenity"="fire_station"' },
  ],
  "GOVERNMENT, EDUCATION & INFRASTRUCTURE": [
    { name: "City Hall", tagQuery: '"amenity"="townhall"' },
    { name: "Airport Terminal", tagQuery: '"aeroway"~"terminal|aerodrome",i' },
    { name: "University/College", tagQuery: '"amenity"~"university|college",i' },
    { name: "K-12 School", tagQuery: '"amenity"="school"' },
    { name: "Post Office", tagQuery: '"amenity"="post_office"' },
  ],
  "LEISURE, SPORTS & PUBLIC SPACES": [
    { name: "Church", tagQuery: '"religion"="christian"' },
    { name: "Mosque", tagQuery: '"religion"="muslim"' },
    { name: "Cinema", tagQuery: '"amenity"="cinema"' },
    { name: "Fuel", tagQuery: '"amenity"="fuel"' },
    { name: "Parking", tagQuery: '"amenity"="parking"' },
    { name: "Sports centre", tagQuery: '"leisure"="sports_centre"' },
    { name: "Bus stop", tagQuery: '"highway"="bus_stop"' },
  ],
};

export const POI_COLORS: Record<string, string> = {
  "COMMERCIAL & OFFICES": "#3b82f6",
  RETAIL: "#f59e0b",
  "FOOD, BEVERAGE & HOSPITALITY": "#ef4444",
  RESIDENTIAL: "#10b981",
  "INDUSTRIAL & LOGISTICS": "#8b5cf6",
  "HEALTH & EMERGENCY SERVICES": "#ec4899",
  "GOVERNMENT, EDUCATION & INFRASTRUCTURE": "#06b6d4",
  "LEISURE, SPORTS & PUBLIC SPACES": "#14b8a6",
};

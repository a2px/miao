// Everything about the cafe that changes lives here.
window.MIAO = {
  name: "Miao",
  tagline: "All-you-can-drink boba until 2 AM",
  address: {
    street: "2700 Old Denton Rd, Ste 103",
    short: "Old Denton Rd Ste 103",
    city: "Carrollton",
    region: "TX",
    postal: "75007",
  },
  // From OpenStreetMap's lookup of the street address.
  coords: { lat: 32.98857, lng: -96.90748 },
  timeZone: "America/Chicago",
  instagram: "https://www.instagram.com/miao_carrollton/",
  tiktok: "https://www.tiktok.com/@miao.carrollton",
  // 24h "HH:MM". A close earlier than open means it closes after midnight.
  // Index 0 = Sunday.
  hours: [
    { open: "13:00", close: "02:00" },
    { open: "13:00", close: "02:00" },
    { open: "13:00", close: "02:00" },
    { open: "13:00", close: "02:00" },
    { open: "13:00", close: "02:00" },
    { open: "13:00", close: "02:00" },
    { open: "13:00", close: "02:00" },
  ],
};

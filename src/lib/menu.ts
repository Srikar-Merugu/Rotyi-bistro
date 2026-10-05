import type { Locale } from "./routes";

// Shaped like the starter's Supabase tables (menu_categories, menu_items) so
// this file can be replaced by a query without touching the components.

type L = Record<Locale, string>;

export type DietTag = "vegan" | "vegetarian" | "gluten-free" | "spicy";

export type MenuItem = {
  id: string;
  categoryId: string;
  name: L;
  description: L;
  price: number; // HUF
  tags: DietTag[];
  image?: string;
  /** CRAV-style "quick details" shown on the card flip. */
  quick: { time: string; side: L; protein: string; spice: 0 | 1 | 2 | 3; kcal: number };
  signature?: boolean;
};

export type MenuCategory = { id: string; name: L; sort: number };

const u = (id: string) => `https://images.unsplash.com/${id}`;

export const photos = {
  goulashPot: u("photo-1748309280994-bb23a2f600cc"),
  burger: u("photo-1534790566855-4cb788d389ec"),
  burgerDark: u("photo-1674938556574-78abfb2d9fb2"),
  schnitzel: u("photo-1599921841143-819065a55cc6"),
  schnitzelBeer: u("photo-1640346060848-ad6921833885"),
  cabbage: u("photo-1622220734058-23ce1f89d84d"),
  paprikash: u("photo-1537516803400-bf9d09ae3d2f"),
  crepeChoc: u("photo-1565087170449-fa23854a6100"),
  crepeBerry: u("photo-1587314168485-3236d6710814"),
  friendsGroup: u("photo-1765582870011-ff3cfdb06700"),
  friendsLaugh: u("photo-1681641092941-b1acee507ee0"),
  interior: u("photo-1633944241961-e511ab23455f"),
  interiorDiners: u("photo-1771813156445-1d70dc259856"),
  waiter: u("photo-1566670735914-b2038696981d"),
  beer: u("photo-1618183479302-1e0aa382c36b"),
  bowl: u("photo-1547496502-affa22d38842"),
  chickenBites: u("photo-1562967916-eb82221dfb92"),
} as const;

export const categories: MenuCategory[] = [
  { id: "soups", name: { hu: "Levesek", en: "Soups" }, sort: 1 },
  { id: "mains", name: { hu: "Főételek", en: "Mains" }, sort: 2 },
  { id: "street", name: { hu: "Bisztró klasszikusok", en: "Bistro classics" }, sort: 3 },
  { id: "desserts", name: { hu: "Desszertek", en: "Desserts" }, sort: 4 },
  { id: "drinks", name: { hu: "Italok", en: "Drinks" }, sort: 5 },
];

const side = (hu: string, en: string): L => ({ hu, en });

export const menuItems: MenuItem[] = [
  {
    id: "gulyas",
    categoryId: "soups",
    name: { hu: "Bográcsgulyás", en: "Kettle goulash" },
    description: {
      hu: "Marhalábszár, sok paprika, csipetke. Reggel óta rotyog.",
      en: "Beef shin, plenty of paprika, pinched noodles. Bubbling since morning.",
    },
    price: 2890,
    tags: ["spicy"],
    image: photos.goulashPot,
    quick: { time: "5 min", side: side("Házi kenyér", "House bread"), protein: "28 g", spice: 2, kcal: 540 },
    signature: true,
  },
  {
    id: "ujhazi",
    categoryId: "soups",
    name: { hu: "Újházi tyúkhúsleves", en: "Újházi chicken soup" },
    description: {
      hu: "Tiszta húsleves cérnametélttel, zöldséggel, főtt hússal.",
      en: "Clear chicken broth with fine noodles, root veg and tender meat.",
    },
    price: 2290,
    tags: [],
    quick: { time: "5 min", side: side("Cérnametélt", "Fine noodles"), protein: "24 g", spice: 0, kcal: 380 },
  },
  {
    id: "paprikas",
    categoryId: "mains",
    name: { hu: "Csirkepaprikás nokedlivel", en: "Chicken paprikash" },
    description: {
      hu: "Tejfölös paprikás szósz, házi nokedli, uborkasaláta.",
      en: "Sour-cream paprika sauce, house nokedli dumplings, cucumber salad.",
    },
    price: 4690,
    tags: ["spicy"],
    image: photos.paprikash,
    quick: { time: "12 min", side: side("Nokedli", "Nokedli"), protein: "38 g", spice: 1, kcal: 820 },
    signature: true,
  },
  {
    id: "toltott",
    categoryId: "mains",
    name: { hu: "Töltött káposzta", en: "Stuffed cabbage" },
    description: {
      hu: "Savanyú káposztában főtt töltelék, füstölt oldalas, tejföl.",
      en: "Pork-and-rice rolls slow-cooked in sauerkraut, smoked ribs, sour cream.",
    },
    price: 4490,
    tags: ["gluten-free"],
    image: photos.cabbage,
    quick: { time: "10 min", side: side("Friss kenyér", "Fresh bread"), protein: "34 g", spice: 1, kcal: 760 },
    signature: true,
  },
  {
    id: "rantott",
    categoryId: "mains",
    name: { hu: "Rántott szelet", en: "Breaded pork schnitzel" },
    description: {
      hu: "Ropogós bundában, petrezselymes újburgonyával és áfonyával.",
      en: "Crisp crumb, parsley new potatoes and cranberry on the side.",
    },
    price: 4990,
    tags: [],
    image: photos.schnitzel,
    quick: { time: "14 min", side: side("Petrezselymes burgonya", "Parsley potatoes"), protein: "42 g", spice: 0, kcal: 940 },
    signature: true,
  },
  {
    id: "lecso-bowl",
    categoryId: "mains",
    name: { hu: "Lecsós zöldségtál", en: "Lecsó veggie bowl" },
    description: {
      hu: "Paprikás lecsó, sült csicseriborsó, friss saláta, pirított mag.",
      en: "Pepper-and-tomato lecsó, roast chickpeas, fresh greens, toasted seeds.",
    },
    price: 3790,
    tags: ["vegan", "gluten-free"],
    image: photos.bowl,
    quick: { time: "8 min", side: side("Saláta", "Greens"), protein: "18 g", spice: 1, kcal: 560 },
    signature: true,
  },
  {
    id: "rotyi-burger",
    categoryId: "street",
    name: { hu: "Rotyi burger", en: "Rotyi burger" },
    description: {
      hu: "Mangalica-marha húspogácsa, füstölt sajt, paprikás majonéz.",
      en: "Mangalica-beef patty, smoked cheese, paprika mayo, brioche bun.",
    },
    price: 5290,
    tags: [],
    image: photos.burger,
    quick: { time: "12 min", side: side("Hasábburgonya", "Fries"), protein: "40 g", spice: 1, kcal: 980 },
    signature: true,
  },
  {
    id: "csirkefalatok",
    categoryId: "street",
    name: { hu: "Rántott csirkefalatok", en: "Crispy chicken bites" },
    description: {
      hu: "Kukoricapelyhes bunda, fokhagymás-tejfölös mártogatós.",
      en: "Cornflake crumb, garlic sour-cream dip.",
    },
    price: 3990,
    tags: [],
    image: photos.chickenBites,
    quick: { time: "10 min", side: side("Mártogatós", "Dip"), protein: "32 g", spice: 0, kcal: 690 },
  },
  {
    id: "langos",
    categoryId: "street",
    name: { hu: "Lángos sajttal, tejföllel", en: "Lángos, cheese & sour cream" },
    description: {
      hu: "Frissen sütött, fokhagymás. Pont mint a Balatonon.",
      en: "Fried to order, garlic-brushed. Just like at Lake Balaton.",
    },
    price: 1990,
    tags: ["vegetarian"],
    quick: { time: "6 min", side: side("Fokhagyma", "Garlic"), protein: "16 g", spice: 0, kcal: 720 },
  },
  {
    id: "gundel",
    categoryId: "desserts",
    name: { hu: "Gundel-palacsinta", en: "Gundel pancake" },
    description: {
      hu: "Diós töltelék, rumos csokoládéöntet.",
      en: "Walnut filling, rum-chocolate sauce.",
    },
    price: 2490,
    tags: ["vegetarian"],
    image: photos.crepeChoc,
    quick: { time: "6 min", side: side("Csokiöntet", "Choc sauce"), protein: "9 g", spice: 0, kcal: 520 },
  },
  {
    id: "turos",
    categoryId: "desserts",
    name: { hu: "Túrós palacsinta eperrel", en: "Túró pancake with strawberries" },
    description: {
      hu: "Vaníliás túró, friss eper, tejszínhab.",
      en: "Vanilla curd cheese, fresh strawberries, whipped cream.",
    },
    price: 1990,
    tags: ["vegetarian"],
    image: photos.crepeBerry,
    quick: { time: "6 min", side: side("Tejszínhab", "Whipped cream"), protein: "14 g", spice: 0, kcal: 470 },
  },
  {
    id: "somloi",
    categoryId: "desserts",
    name: { hu: "Somlói galuska", en: "Somlói sponge trifle" },
    description: {
      hu: "Piskóta, vaníliakrém, dió, csoki, tejszín. Nagyi receptje.",
      en: "Sponge, vanilla custard, walnut, chocolate, cream. Grandma's recipe.",
    },
    price: 2290,
    tags: ["vegetarian"],
    quick: { time: "3 min", side: side("Csokiszósz", "Choc sauce"), protein: "8 g", spice: 0, kcal: 560 },
  },
  {
    id: "sor",
    categoryId: "drinks",
    name: { hu: "Kézműves világos sör 0,5 l", en: "Craft lager 0.5 l" },
    description: {
      hu: "Budapesti kisüzemi főzde, csapról.",
      en: "Small-batch Budapest brewery, on tap.",
    },
    price: 1690,
    tags: ["vegan"],
    image: photos.beer,
    quick: { time: "1 min", side: side("Csapról", "On tap"), protein: "—", spice: 0, kcal: 215 },
  },
  {
    id: "limonade",
    categoryId: "drinks",
    name: { hu: "Házi limonádé 0,5 l", en: "House lemonade 0.5 l" },
    description: {
      hu: "Bodza, citrom vagy málna-menta.",
      en: "Elderflower, lemon or raspberry-mint.",
    },
    price: 1290,
    tags: ["vegan", "gluten-free"],
    quick: { time: "2 min", side: side("Jég", "Ice"), protein: "—", spice: 0, kcal: 140 },
  },
  {
    id: "froccs",
    categoryId: "drinks",
    name: { hu: "Fröccs (2+1)", en: "Spritzer (2+1)" },
    description: {
      hu: "Száraz fehérbor szódával, ahogy illik.",
      en: "Dry Hungarian white wine with soda, the local way.",
    },
    price: 990,
    tags: ["vegan", "gluten-free"],
    quick: { time: "1 min", side: side("Szóda", "Soda"), protein: "—", spice: 0, kcal: 110 },
  },
];

export const signatureItems = menuItems.filter((i) => i.signature);

// Napi menü: soup + main, Monday to Friday. Owners will edit this in /admin
// once the starter's Supabase tables are wired in.
export const lunchPrice = { two: 3490, three: 3990 };

export const dailyLunch: { soup: L; main: L; dessert: L }[] = [
  {
    soup: { hu: "Zöldborsóleves", en: "Green pea soup" },
    main: { hu: "Paprikás krumpli virslivel", en: "Paprika potatoes with sausage" },
    dessert: { hu: "Mákos guba", en: "Poppy-seed bread pudding" },
  },
  {
    soup: { hu: "Gombakrémleves", en: "Cream of mushroom" },
    main: { hu: "Sertéspörkölt tarhonyával", en: "Pork pörkölt with tarhonya" },
    dessert: { hu: "Almás rétes", en: "Apple strudel" },
  },
  {
    soup: { hu: "Jókai bableves", en: "Jókai bean soup" },
    main: { hu: "Rakott krumpli", en: "Layered potato bake" },
    dessert: { hu: "Túrógombóc", en: "Túró dumplings" },
  },
  {
    soup: { hu: "Palócleves", en: "Palóc lamb soup" },
    main: { hu: "Csirkepaprikás nokedlivel", en: "Chicken paprikash with nokedli" },
    dessert: { hu: "Kakaós csiga", en: "Cocoa swirl" },
  },
  {
    soup: { hu: "Halászlé (kicsi)", en: "Fisherman's soup (small)" },
    main: { hu: "Rántott sajt rizzsel, tartárral", en: "Fried cheese, rice, tartar" },
    dessert: { hu: "Somlói galuska", en: "Somlói sponge trifle" },
  },
];

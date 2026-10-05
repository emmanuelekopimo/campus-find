import { sql } from "drizzle-orm";
import type { DB } from "./index";
import { claims, items, users, type Category } from "./schema";
import { addDays, campusDay } from "@/lib/today";
import { hashPassword } from "@/lib/auth";

export const DEMO = { email: "student@uniuyo.edu.ng", password: "student123", name: "Ini Ekpo" };

const PEOPLE: [string, string, string][] = [
  ["Ini Ekpo", "Computer Science", "08031234501"],
  ["Ekemini Bassey", "Microbiology", "08062234502"],
  ["Aniekan Etim", "Electrical Engineering", "08133234503"],
  ["Uduak Akpan", "Law", "07034234504"],
  ["Ifiok Essien", "Economics", "08095234505"],
  ["Mfon Okon", "Mass Communication", "09016234506"],
  ["Nsikak Inyang", "Architecture", "08027234507"],
  ["Idara Umoh", "Pharmacy", "08168234508"],
  ["Emem Ekanem", "Accounting", "08149234509"],
  ["Ubong Edet", "Civil Engineering", "07060234510"],
  ["Eno Archibong", "Theatre Arts", "08051234511"],
  ["Chiamaka Okafor", "Biochemistry", "08032234512"],
  ["Tunde Adeyemi", "Computer Science", "08183234513"],
  ["Fatima Bello", "Political Science", "08064234514"],
  ["Emeka Nwosu", "Mechanical Engineering", "08035234515"],
  ["Zainab Yusuf", "Medicine and Surgery", "09066234516"],
  ["Chinedu Eze", "Physics", "08077234517"],
  ["Ngozi Obi", "English", "08108234518"],
  ["Seun Ogunleye", "Geography", "08039234519"],
  ["Halima Abubakar", "Nursing", "07030234520"],
  ["Tobi Adebayo", "Statistics", "08121234521"],
  ["Amaka Nnaji", "Fine Arts", "08052234522"],
  ["Ibrahim Musa", "Agriculture", "08033234523"],
  ["Blessing Ogbu", "Education", "08164234524"],
  ["Kelechi Uche", "Chemistry", "08095234525"],
  ["Godswill Udoh", "Computer Science", "08036234526"],
  ["Precious Etuk", "Sociology", "09017234527"],
  ["Samuel Akpanudo", "Petroleum Engineering", "08138234528"],
  ["Grace Offiong", "Linguistics", "08069234529"],
  ["Daniel Ebong", "Banking and Finance", "08030234530"],
  ["Joy Nkanta", "Marketing", "08151234531"],
  ["Victor Ukpong", "Mathematics", "08072234532"],
  ["Mercy Ekwere", "Botany", "08043234533"],
  ["Emmanuel Asuquo", "History", "08114234534"],
  ["Esther Udofia", "Psychology", "08065234535"],
  ["Patrick Obot", "Philosophy", "08036234536"],
  ["Comfort Ikpe", "Zoology", "08097234537"],
  ["Michael Ekpenyong", "Agricultural Engineering", "08158234538"],
  ["Favour Udo", "Public Administration", "08019234539"],
  ["Joshua Akpan", "Electrical Engineering", "08070234540"],
];

type SeedItem = {
  type: "lost" | "found";
  title: string;
  category: Category;
  location: string;
  daysAgo: number;
  image: string | null;
  by: number;
  status?: "open" | "claimed" | "resolved";
  description: string;
};

export const SEED_ITEMS: SeedItem[] = [
  // Demo story 1: the demo student lost earbuds; someone found a matching case.
  { type: "lost", title: "Black Oraimo earbuds in a charging case", category: "Electronics", location: "University Library", daysAgo: 3, image: "earbuds-black", by: 0, description: "Lost my black Oraimo earbuds with the small black charging case. I was in the ground floor reading room until about 4pm. The left bud has a tiny scratch." },
  { type: "found", title: "Earbuds charging case found in library reading room", category: "Electronics", location: "University Library", daysAgo: 2, image: "earbuds-case", by: 7, description: "Found a black earbuds charging case with both earbuds inside on a table in the ground floor reading room. Describe any marks to claim it." },
  // Demo story 2: the demo student found a wallet and has two claims to review.
  { type: "found", title: "Brown leather wallet with ATM card", category: "Wallets", location: "Cafeteria, Main Campus", daysAgo: 2, image: "wallet-brown", by: 0, description: "Brown leather wallet found under a table at the cafeteria around lunch time. It has an ATM card and some cash inside. Tell me the bank on the card and roughly how much cash to claim it." },
  // Demo story 3: lost calculators that will match a found calculator posted live.
  { type: "lost", title: "Casio fx-991ES calculator", category: "Electronics", location: "Faculty of Science", daysAgo: 2, image: null, by: 16, description: "Black Casio fx-991ES scientific calculator left in Lecture Theatre 2 after the PHY 211 test. My name is scratched on the back cover." },
  { type: "lost", title: "HP scientific calculator", category: "Electronics", location: "Faculty of Engineering", daysAgo: 6, image: "calculator-hp", by: 14, description: "Black HP calculator with a grey cover. Lost during the MEE 301 lab session. Needed urgently for exams." },

  { type: "lost", title: "iPhone 12 in a clear case", category: "Phones", location: "Shuttle Bus Park", daysAgo: 1, image: "phone-iphone-white", by: 11, description: "White iPhone 12 in a clear case with a small cartoon sticker. Dropped it while boarding the shuttle to Town Campus. The lock screen shows a picture of a beach." },
  { type: "found", title: "Phone found on shuttle bus seat", category: "Phones", location: "Shuttle Bus Park", daysAgo: 1, image: "phone-hand", by: 22, description: "Found a white iPhone in a clear case on the back seat of the Town Campus shuttle. It is switched off. I have handed a note to the driver as well." },
  { type: "lost", title: "Samsung Galaxy A14, blue", category: "Phones", location: "Female Hostel Block C", daysAgo: 9, image: null, by: 19, description: "Blue Samsung phone with a cracked screen protector. Last seen on the common room charging table." },
  { type: "found", title: "Tecno phone near the sports complex", category: "Phones", location: "Sports Complex", daysAgo: 4, image: "phone-on-laptop", by: 9, description: "Black Tecno phone found on the bleachers after the inter-faculty match. Battery is low. Call me to describe the wallpaper." },

  { type: "lost", title: "Pink backpack with lecture notes", category: "Bags", location: "Faculty of Arts", daysAgo: 5, image: "backpack-pink", by: 27, description: "Pink backpack with three notebooks, a blue pencil case and my departmental handout for LIN 205. Left it on a bench outside Lecture Room 4." },
  { type: "found", title: "Black laptop backpack in the ICT Centre", category: "Bags", location: "ICT Centre", daysAgo: 3, image: "backpack-black", by: 25, description: "Black laptop backpack left under a desk in Lab 2. No laptop inside, just a charger and a water bottle. Kept at the ICT Centre front desk." },
  { type: "lost", title: "Grey laptop sleeve", category: "Bags", location: "University Library", daysAgo: 12, image: "laptop-sleeve", by: 3, description: "Grey padded laptop sleeve with a zip pocket. It had my lecture notes and a 64GB flash drive in the pocket." },
  { type: "found", title: "Beaded clutch purse after the gala", category: "Bags", location: "Banquet Hall, Town Campus", daysAgo: 14, image: "clutch-beaded", by: 30, status: "resolved", description: "Colourful beaded clutch found on a chair after the awards gala. Returned to the owner." },
  { type: "found", title: "Floral purse at the chapel", category: "Bags", location: "Chapel of Redemption", daysAgo: 7, image: "purse-floral", by: 33, description: "Small black purse with flower embroidery found after Sunday service. It has lip balm and a hostel key inside." },

  { type: "lost", title: "Yellow leather wallet", category: "Wallets", location: "Main Auditorium", daysAgo: 8, image: "wallet-yellow", by: 21, description: "Yellow wallet with a star logo. Has my student ID card and about N3,000. Lost during the career fair." },
  { type: "lost", title: "Brown wallet, Access Bank card inside", category: "Wallets", location: "Cafeteria, Main Campus", daysAgo: 2, image: null, by: 4, description: "Brown leather wallet with an Access Bank debit card in my name and about N4,500 in cash. I think it fell out at the cafeteria during lunch." },
  { type: "found", title: "Wallet with some coins", category: "Wallets", location: "Students' Union Building", daysAgo: 20, image: "wallet-coins", by: 12, status: "resolved", description: "Small brown wallet with coins and a gym card. Owner has collected it." },

  { type: "found", title: "Student ID card, Faculty of Law", category: "IDs and Cards", location: "Faculty of Law", daysAgo: 1, image: null, by: 17, description: "Found a University of Uyo student ID card near the moot court. The name starts with U. Bring another ID to collect it." },
  { type: "lost", title: "Student ID card and hostel tag", category: "IDs and Cards", location: "Faculty of Law", daysAgo: 2, image: null, by: 3, description: "Lost my student ID card together with my hostel access tag on a blue lanyard. Probably around the Faculty of Law." },
  { type: "found", title: "ATM card, First Bank", category: "IDs and Cards", location: "Main Gate", daysAgo: 35, image: null, by: 34, description: "First Bank card found at the main gate. Still unclaimed. I will hand it to Security soon." },

  { type: "found", title: "Bunch of keys on a ring", category: "Keys", location: "Hostel A (Male)", daysAgo: 3, image: "keys-ring", by: 35, description: "Five keys on a silver ring, one with a red tag. Found at the hostel entrance near the porters' lodge." },
  { type: "lost", title: "Room keys with a red tag", category: "Keys", location: "Hostel A (Male)", daysAgo: 4, image: null, by: 23, description: "My room keys with a red plastic tag and a small padlock key. Lost somewhere between the hostel and the chapel." },
  { type: "found", title: "Car key with a leather fob", category: "Keys", location: "Senate Building", daysAgo: 6, image: "car-key", by: 37, status: "claimed", description: "Toyota car key with a brown leather fob found in the Senate Building car park." },
  { type: "lost", title: "Keychain with a yellow tag", category: "Keys", location: "Faculty of Science", daysAgo: 40, image: "keychain-tag", by: 36, description: "Keys on a keychain with a yellow tag that says Pubsubs. Lost a while ago, still hoping." },

  { type: "lost", title: "Organic Chemistry textbook", category: "Books", location: "Faculty of Science", daysAgo: 10, image: "textbook-stack", by: 24, description: "Organic Chemistry by Morrison and Boyd, 7th edition. My name is written on the first page in green ink." },
  { type: "found", title: "Stack of textbooks in LT1", category: "Books", location: "Faculty of Science", daysAgo: 9, image: "textbooks", by: 15, description: "Three textbooks left in Lecture Theatre 1 including a chemistry book. Kept at the faculty office." },
  { type: "found", title: "Black notebook and pen", category: "Books", location: "University Library", daysAgo: 5, image: "notebook-pen", by: 26, description: "Black hardcover notebook with a silver pen clipped to it. Contains maths notes for MTH 202." },
  { type: "found", title: "Bible with a leather cover", category: "Books", location: "Chapel of Redemption", daysAgo: 11, image: "bibles", by: 28, description: "Brown leather Bible with highlighted pages, found on a pew. The inside cover has initials E.U." },

  { type: "found", title: "White hoodie in the gym", category: "Clothing", location: "Sports Complex", daysAgo: 4, image: "hoodie-white", by: 29, description: "White hoodie with grey print, size L. Left on the bench in the gym changing room." },
  { type: "lost", title: "Denim shirt, short sleeves", category: "Clothing", location: "Faculty of Engineering", daysAgo: 13, image: "denim-shirt", by: 38, description: "Blue short sleeve denim shirt, size M. Took it off in the drawing studio and forgot it." },
  { type: "lost", title: "Blue running shoes", category: "Clothing", location: "Sports Complex", daysAgo: 2, image: "sneakers-blue", by: 6, description: "Blue and grey running shoes, size 43. Left near the track after evening training." },
  { type: "found", title: "Black baseball cap", category: "Clothing", location: "Cafeteria, Main Campus", daysAgo: 6, image: "cap-black", by: 13, description: "Black cap with a small white logo found on a chair at the cafeteria." },

  { type: "found", title: "Round glasses in a lecture hall", category: "Accessories", location: "Faculty of Arts", daysAgo: 1, image: "glasses-round", by: 10, description: "Black round prescription glasses found on a desk in Lecture Room 4. Kept safely in a case." },
  { type: "lost", title: "Prescription glasses, black frame", category: "Accessories", location: "Faculty of Arts", daysAgo: 2, image: "glasses-black", by: 18, description: "I lost my black framed prescription glasses after the 10am ENG 201 lecture. I cannot read the board without them." },
  { type: "found", title: "Gold wristwatch", category: "Accessories", location: "Main Auditorium", daysAgo: 8, image: "watch-gold", by: 31, description: "Gold coloured wristwatch with a white face found near the stage after the career fair." },
  { type: "lost", title: "Gold ring with a small stone", category: "Accessories", location: "Female Hostel Block C", daysAgo: 16, image: "ring-gold", by: 32, description: "Gold ring with one small white stone. It has sentimental value. Lost in the washroom area." },
  { type: "found", title: "Black umbrella", category: "Accessories", location: "Shuttle Bus Park", daysAgo: 3, image: "umbrella-black", by: 39, description: "Folding black umbrella left at the shuttle bus shelter during the rain on Thursday." },
  { type: "lost", title: "Chronograph wristwatch", category: "Accessories", location: "Sports Complex", daysAgo: 25, image: "watch-chrono", by: 2, status: "resolved", description: "Black chronograph watch with a red second hand. Found and returned, thank you." },

  { type: "lost", title: "MacBook Air in a grey sleeve", category: "Electronics", location: "University Library", daysAgo: 12, image: "laptop-macbook", by: 1, description: "Silver MacBook Air. It was inside a grey laptop sleeve. Very important, all my project files are on it. Reward offered." },
  { type: "found", title: "Silver power bank", category: "Electronics", location: "ICT Centre", daysAgo: 2, image: "powerbank-white", by: 20, description: "White power bank with a digital display found plugged into the wall in Lab 1." },
  { type: "lost", title: "Red USB-C charging cable", category: "Electronics", location: "ICT Centre", daysAgo: 3, image: "cable-red", by: 8, description: "Braided red USB-C cable, about 1 metre long. Left it charging in Lab 1." },
  { type: "found", title: "Two flash drives", category: "Electronics", location: "Faculty of Engineering", daysAgo: 5, image: "flash-drives", by: 5, description: "Two flash drives found by the printer in the engineering library. One silver, one black." },
  { type: "lost", title: "White over-ear headphones", category: "Electronics", location: "Students' Union Building", daysAgo: 7, image: "headphones-white", by: 26, description: "White over-ear headphones with a mint inner band. Left at the lounge after the open mic night." },
  { type: "found", title: "Black headphones on a laptop", category: "Electronics", location: "University Library", daysAgo: 30, image: "headphones-black", by: 11, status: "resolved", description: "Black headphones found in the reading room. Returned to the owner." },
  { type: "lost", title: "iPad with a smart cover", category: "Electronics", location: "Faculty of Pharmacy", daysAgo: 4, image: "tablet-ipad", by: 15, description: "Silver iPad with a dark blue smart cover. Lost in the pharmacology lab." },
  { type: "found", title: "Green water bottle", category: "Other", location: "Sports Complex", daysAgo: 1, image: "bottle-green", by: 4, description: "Green plastic water bottle with a white logo, left at the football pitch." },
  { type: "found", title: "Box of coloured pencils", category: "Other", location: "Faculty of Arts", daysAgo: 9, image: "pencils", by: 21, description: "A set of coloured pencils in a box, found in the fine arts studio." },
];

type SeedClaim = { item: string; by: number; daysAgo: number; status?: "pending" | "accepted" | "declined"; message: string; contact?: string };

const SEED_CLAIMS: SeedClaim[] = [
  { item: "Brown leather wallet with ATM card", by: 4, daysAgo: 1, message: "This is mine. The card is an Access Bank debit card in the name Ifiok Essien and there was about N4,500 in cash, mostly N1,000 notes.", contact: "08095234505" },
  { item: "Brown leather wallet with ATM card", by: 26, daysAgo: 1, message: "I lost a brown wallet last week, I think this could be mine.", contact: "09017234527" },
  { item: "Phone found on shuttle bus seat", by: 11, daysAgo: 0, message: "That is my iPhone 12. The case has a small cartoon sticker on the back and the lock screen is a beach photo.", contact: "08032234512" },
  { item: "Bunch of keys on a ring", by: 23, daysAgo: 2, message: "Those are my room keys. The red tag has room B14 written on it in marker.", contact: "08033234523" },
  { item: "Round glasses in a lecture hall", by: 18, daysAgo: 0, message: "I think these are my glasses. I sat in the second row of Lecture Room 4 at 10am. The left arm is slightly loose." },
  { item: "Car key with a leather fob", by: 35, daysAgo: 4, status: "accepted", message: "My Toyota key. The fob has my initials P.O. stamped inside.", contact: "08036234536" },
  { item: "Car key with a leather fob", by: 9, daysAgo: 5, status: "declined", message: "I lost a car key too, is it a Honda key?" },
  { item: "Stack of textbooks in LT1", by: 24, daysAgo: 8, message: "One of them should be my Morrison and Boyd organic chemistry book with my name in green ink on the first page.", contact: "08095234525" },
  { item: "Beaded clutch purse after the gala", by: 21, daysAgo: 13, status: "accepted", message: "The clutch is mine, it has my lipstick and a gold earring inside." },
  { item: "Wallet with some coins", by: 31, daysAgo: 19, status: "accepted", message: "My wallet, the gym card has my name Joy Nkanta." },
  { item: "Black headphones on a laptop", by: 12, daysAgo: 28, status: "accepted", message: "My Sony headphones, there is a scratch on the right ear cup." },
  { item: "Gold wristwatch", by: 14, daysAgo: 6, status: "declined", message: "Is it a men's watch? Mine is gold with a brown strap." },
  { item: "White hoodie in the gym", by: 2, daysAgo: 3, message: "That is my hoodie, size L, there is a small ink stain on the left sleeve." },
  { item: "Two flash drives", by: 3, daysAgo: 4, message: "The silver one is mine. It has a folder called LAW 301 project.", contact: "07034234504" },
  { item: "Floral purse at the chapel", by: 32, daysAgo: 6, message: "I left my purse in church on Sunday, it has a hostel key on a pink ring." },
  { item: "Silver power bank", by: 8, daysAgo: 1, message: "That is my Romoss power bank. I plugged it in next to the red cable I also lost." },
  { item: "Earbuds charging case found in library reading room", by: 25, daysAgo: 1, status: "declined", message: "Are these white earbuds? I lost white ones." },
];

export async function isEmpty(database: DB) {
  const r = await database.execute(sql`select count(*)::int as n from users`);
  return Number((r.rows[0] as { n: number }).n) === 0;
}

export async function resetDb(database: DB) {
  await database.execute(sql`truncate table claims, uploads, items, users restart identity cascade`);
}

export async function seed(database: DB, now: Date) {
  const today = campusDay(now);
  const hash = await hashPassword(DEMO.password);
  const userRows = await database
    .insert(users)
    .values(
      PEOPLE.map(([name, department, phone], i) => ({
        name,
        department,
        phone,
        passwordHash: hash,
        email: i === 0 ? DEMO.email : `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@student.uniuyo.edu.ng`,
      })),
    )
    .returning({ id: users.id });
  const uid = (i: number) => userRows[i].id;

  const itemIds = new Map<string, number>();
  for (const [i, it] of SEED_ITEMS.entries()) {
    const happenedOn = addDays(today, -it.daysAgo);
    const createdAt = new Date(now.getTime() - it.daysAgo * 86_400_000 + ((i * 37) % 300) * 60_000 - 6 * 3_600_000);
    const [row] = await database
      .insert(items)
      .values({
        type: it.type,
        title: it.title,
        description: it.description,
        category: it.category,
        location: it.location,
        happenedOn,
        imageUrl: it.image ? `/images/items/${it.image}.jpg` : null,
        status: it.status ?? "open",
        postedBy: uid(it.by),
        createdAt: createdAt > now ? new Date(now.getTime() - 3_600_000) : createdAt,
        resolvedAt: it.status === "resolved" ? new Date(now.getTime() - Math.max(1, it.daysAgo - 2) * 86_400_000) : null,
      })
      .returning({ id: items.id });
    itemIds.set(it.title, row.id);
  }

  for (const c of SEED_CLAIMS) {
    const id = itemIds.get(c.item);
    if (!id) throw new Error(`Unknown seed item ${c.item}`);
    await database.insert(claims).values({
      itemId: id,
      claimantId: uid(c.by),
      message: c.message,
      contact: c.contact ?? null,
      status: c.status ?? "pending",
      createdAt: new Date(now.getTime() - c.daysAgo * 86_400_000 - 2 * 3_600_000),
    });
  }
  return { users: userRows.length, items: SEED_ITEMS.length, claims: SEED_CLAIMS.length };
}

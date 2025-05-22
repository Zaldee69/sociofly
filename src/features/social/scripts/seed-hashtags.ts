import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categories = [
    "travel",
    "food",
    "lifestyle",
    "business",
    "technology",
    "fashion",
    "health",
    "art",
    "education",
    "entertainment",
    "general",
    "promotion",
    "beauty",
    "fitness",
    "seasonal_ramadhan",
    "seasonal_event",
    "seasonal",
    "seasonal_christmas",
    "seasonal_newyear",
    "seasonal_valentine",
    "seasonal_summer",
  ];

  const hashtagsByCategory: Record<
    string,
    { name: string; frequency: number }[]
  > = {
    travel: [
      { name: "travel", frequency: 150 },
      { name: "wanderlust", frequency: 120 },
      { name: "adventure", frequency: 100 },
      { name: "vacation", frequency: 90 },
      { name: "travelgram", frequency: 85 },
      { name: "explore", frequency: 80 },
      { name: "instatravel", frequency: 75 },
      { name: "travelphotography", frequency: 70 },
      { name: "traveltheworld", frequency: 65 },
      { name: "tourist", frequency: 60 },
    ],
    food: [
      { name: "food", frequency: 200 },
      { name: "foodie", frequency: 180 },
      { name: "foodporn", frequency: 160 },
      { name: "instafood", frequency: 150 },
      { name: "foodphotography", frequency: 130 },
      { name: "delicious", frequency: 120 },
      { name: "healthy", frequency: 110 },
      { name: "homemade", frequency: 100 },
      { name: "yummy", frequency: 90 },
      { name: "foodlover", frequency: 80 },
      { name: "makananenak", frequency: 874 },
      { name: "kulinerjakarta", frequency: 518 },
      { name: "cemilanviral", frequency: 682 },
      { name: "kulinerindonesia", frequency: 416 },
      { name: "jajananpasar", frequency: 529 },
      { name: "cemilankekinian", frequency: 524 },
      { name: "kopinusantara", frequency: 771 },
      { name: "kulinerbogor", frequency: 609 },
      { name: "kulinerbandung", frequency: 409 },
      { name: "resepmasakan", frequency: 570 },
    ],
    lifestyle: [
      { name: "lifestyle", frequency: 180 },
      { name: "inspiration", frequency: 160 },
      { name: "motivation", frequency: 150 },
      { name: "mindfulness", frequency: 130 },
      { name: "wellness", frequency: 120 },
      { name: "positivevibes", frequency: 110 },
      { name: "selflove", frequency: 100 },
      { name: "selfcare", frequency: 90 },
      { name: "personalgrowth", frequency: 80 },
      { name: "happiness", frequency: 70 },
      { name: "motivasihidup", frequency: 509 },
      { name: "selflove", frequency: 508 },
      { name: "motivasipagi", frequency: 206 },
      { name: "katabijak", frequency: 524 },
      { name: "lifequotes", frequency: 496 },
      { name: "productivityhacks", frequency: 494 },
      { name: "mentalhealthawareness", frequency: 592 },
      { name: "jakartahits", frequency: 669 },
    ],
    business: [
      { name: "business", frequency: 170 },
      { name: "entrepreneur", frequency: 160 },
      { name: "marketing", frequency: 150 },
      { name: "success", frequency: 140 },
      { name: "startup", frequency: 130 },
      { name: "entrepreneurlife", frequency: 120 },
      { name: "smallbusiness", frequency: 110 },
      { name: "leadership", frequency: 100 },
      { name: "motivation", frequency: 90 },
      { name: "hustle", frequency: 80 },
      { name: "tokoonline", frequency: 509 },
      { name: "investasimudah", frequency: 817 },
      { name: "bisnisonline", frequency: 409 },
      { name: "cuanharian", frequency: 316 },
      { name: "investasireksadana", frequency: 317 },
      { name: "usaharumahan", frequency: 201 },
      { name: "jualanonline", frequency: 398 },
      { name: "passiveincome", frequency: 384 },
    ],
    technology: [
      { name: "technology", frequency: 190 },
      { name: "tech", frequency: 180 },
      { name: "innovation", frequency: 170 },
      { name: "programming", frequency: 160 },
      { name: "developer", frequency: 150 },
      { name: "coding", frequency: 140 },
      { name: "ai", frequency: 130 },
      { name: "machinelearning", frequency: 120 },
      { name: "software", frequency: 110 },
      { name: "datascience", frequency: 100 },
      { name: "gadgetmurah", frequency: 650 },
    ],
    fashion: [
      { name: "fashion", frequency: 200 },
      { name: "style", frequency: 190 },
      { name: "ootd", frequency: 180 },
      { name: "fashionista", frequency: 170 },
      { name: "trendy", frequency: 160 },
      { name: "streetstyle", frequency: 150 },
      { name: "fashionblogger", frequency: 140 },
      { name: "outfit", frequency: 130 },
      { name: "stylish", frequency: 120 },
      { name: "accessories", frequency: 110 },
      { name: "ootdindonesia", frequency: 590 },
      { name: "fashionmurah", frequency: 892 },
      { name: "fashionindonesia", frequency: 385 },
      { name: "ootdcewek", frequency: 319 },
      { name: "ootdcowok", frequency: 769 },
      { name: "bajumuslim", frequency: 637 },
      { name: "hijabstyle", frequency: 724 },
      { name: "sneakerhead", frequency: 322 },
      { name: "bajukondangan", frequency: 790 },
      { name: "shopeehaul", frequency: 893 },
    ],
    general: [
      { name: "love", frequency: 250 },
      { name: "instagood", frequency: 240 },
      { name: "photooftheday", frequency: 230 },
      { name: "beautiful", frequency: 220 },
      { name: "happy", frequency: 210 },
      { name: "follow", frequency: 200 },
      { name: "instadaily", frequency: 190 },
      { name: "nature", frequency: 180 },
      { name: "picoftheday", frequency: 170 },
      { name: "viral", frequency: 160 },
      { name: "viralindonesia", frequency: 947 },
      { name: "tiktokviral", frequency: 697 },
    ],
    promotion: [
      { name: "diskon", frequency: 962 },
      { name: "promo", frequency: 867 },
      { name: "promo1111", frequency: 740 },
      { name: "diskontahunbaru", frequency: 346 },
      { name: "flashsale", frequency: 979 },
      { name: "diskonbesar", frequency: 459 },
      { name: "promoakhirtahun", frequency: 620 },
    ],
    beauty: [
      { name: "beauty", frequency: 200 },
      { name: "skincare", frequency: 190 },
      { name: "makeup", frequency: 180 },
      { name: "beautyofday", frequency: 170 },
      { name: "beautyhacksid", frequency: 849 },
      { name: "makeuptutorialid", frequency: 827 },
      { name: "skincareroutine", frequency: 662 },
      { name: "makeupnatural", frequency: 563 },
      { name: "beautytipsid", frequency: 451 },
      { name: "maskerwajah", frequency: 579 },
      { name: "perawatankulit", frequency: 638 },
      { name: "lipcreamfavorit", frequency: 262 },
    ],
    fitness: [
      { name: "fitness", frequency: 200 },
      { name: "fitnessmotivation", frequency: 190 },
      { name: "fitnessgram", frequency: 180 },
      { name: "fitnessgoals", frequency: 170 },
      { name: "workoutdirumah", frequency: 439 },
      { name: "dietsehat", frequency: 399 },
      { name: "olahragaindonesia", frequency: 224 },
      { name: "yogainspiration", frequency: 486 },
      { name: "bodygoalsid", frequency: 136 },
    ],
    seasonal_ramadhan: [
      { name: "ramadhan2025", frequency: 757 },
      { name: "mudik2025", frequency: 535 },
      { name: "ramadhanberkah", frequency: 667 },
      { name: "lebaranfitri", frequency: 945 },
    ],
    seasonal_event: [{ name: "harbolnas2025", frequency: 992 }],
    seasonal: [
      { name: "bukber2025", frequency: 981 },
      { name: "blackfridayid", frequency: 846 },
      { name: "liburpanjang", frequency: 735 },
      { name: "eventjakarta", frequency: 955 },
      { name: "festivalmusik", frequency: 819 },
      { name: "endyearsale", frequency: 379 },
    ],
    seasonal_christmas: [{ name: "natalceria", frequency: 816 }],
    seasonal_newyear: [{ name: "tahunbaru2025", frequency: 777 }],
    seasonal_valentine: [{ name: "valentinegift", frequency: 494 }],
    seasonal_summer: [{ name: "summerholiday", frequency: 578 }],
    seasonal_halloween: [{ name: "halloweenevent", frequency: 691 }],
  };

  console.log("Starting to seed hashtags...");

  // Clear existing hashtags if needed
  // await prisma.hashtag.deleteMany();

  let totalCreated = 0;

  // Process hashtags for each category
  for (const category of categories) {
    const hashtags = hashtagsByCategory[category] || [];

    for (const hashtagData of hashtags) {
      const { name, frequency } = hashtagData;

      try {
        // Normalisasi nama hashtag (lowercase, hapus spasi, hapus karakter khusus)
        const normalizedName = name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]/g, "");

        await prisma.hashtag.upsert({
          where: { name: normalizedName },
          update: {
            frequency,
            category,
          },
          create: {
            name: normalizedName,
            frequency,
            category,
          },
        });

        totalCreated++;
      } catch (error) {
        console.error(`Error upserting hashtag ${name}:`, error);
      }
    }
  }

  console.log(`Seeding completed! Created/updated ${totalCreated} hashtags.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

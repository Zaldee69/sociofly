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
    ],
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
        await prisma.hashtag.upsert({
          where: { name },
          update: {
            frequency,
            category,
          },
          create: {
            name,
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

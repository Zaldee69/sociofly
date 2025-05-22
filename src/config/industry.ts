export const industryConfig = {
  fashion: {
    sampleHashtags: ['#OOTD', '#FashionIndo', '#GayaHarian', '#FashionInspo', '#StyleGuide'],
    commonEmojis: ['👗', '👠', '🛍️', '✨', '💃', '👔', '👜', '👒'],
    tone: 'trendy and aspirational',
    keywords: ['style', 'fashion', 'outfit', 'trend', 'look']
  },
  food: {
    sampleHashtags: ['#KulinerIndo', '#MakananViral', '#FoodPhotography', '#Foodie', '#Culinary'],
    commonEmojis: ['🍔', '🍜', '🥗', '😋', '🤤', '🍕', '🍣', '🍰'],
    tone: 'appetizing and inviting',
    keywords: ['delicious', 'tasty', 'food', 'recipe', 'cuisine']
  },
  tech: {
    sampleHashtags: ['#TechUpdate', '#StartupLife', '#DigitalTransformation', '#Innovation', '#TechNews'],
    commonEmojis: ['💻', '🚀', '📱', '⚡', '🔧', '💡', '🌐', '🔮'],
    tone: 'innovative and forward-thinking',
    keywords: ['technology', 'innovation', 'digital', 'future', 'tech']
  },
  beauty: {
    sampleHashtags: ['#BeautyTips', '#Skincare', '#Makeup', '#BeautyRoutine', '#BeautyCommunity'],
    commonEmojis: ['💄', '✨', '💅', '🌸', '💋', '🧴', '🪞', '💆‍♀️'],
    tone: 'glamorous and empowering',
    keywords: ['beauty', 'skincare', 'makeup', 'glam', 'selfcare']
  },
  fitness: {
    sampleHashtags: ['#FitnessJourney', '#WorkoutMotivation', '#HealthyLifestyle', '#FitnessGoals', '#FitFam'],
    commonEmojis: ['💪', '🏃‍♀️', '🧘‍♀️', '🥗', '💦', '🏋️‍♀️', '🎯', '🔥'],
    tone: 'motivational and energetic',
    keywords: ['fitness', 'workout', 'health', 'motivation', 'goals']
  },
  travel: {
    sampleHashtags: ['#TravelGram', '#Wanderlust', '#TravelPhotography', '#TravelBlogger', '#TravelDiaries'],
    commonEmojis: ['✈️', '🌍', '🗺️', '🏖️', '🏔️', '🗽', '🏰', '🌅'],
    tone: 'adventurous and inspiring',
    keywords: ['travel', 'adventure', 'explore', 'journey', 'destination']
  },
  education: {
    sampleHashtags: ['#Learning', '#Education', '#StudyTips', '#Knowledge', '#LearnSomethingNew'],
    commonEmojis: ['📚', '✏️', '🎓', '📝', '🔍', '💡', '🎯', '📖'],
    tone: 'informative and engaging',
    keywords: ['learn', 'education', 'knowledge', 'study', 'growth']
  },
  business: {
    sampleHashtags: ['#BusinessTips', '#Entrepreneurship', '#BusinessGrowth', '#StartupLife', '#BusinessStrategy'],
    commonEmojis: ['💼', '📈', '💡', '🎯', '🤝', '📊', '💪', '🚀'],
    tone: 'professional and strategic',
    keywords: ['business', 'entrepreneur', 'growth', 'strategy', 'success']
  }
} as const;

export type IndustryType = keyof typeof industryConfig; 
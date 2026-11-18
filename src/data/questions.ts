export interface Question {
  id: number;
  questionText: string;
  image: string | null;
  word: string;
  distractors: string[];
  audioUrl?: string | null;
}

export async function loadDemoQuestions(): Promise<Question[]> {
  const [
    { default: eatingImg },
    { default: readingImg },
    { default: swimmingImg },
    { default: appleImg },
    { default: carImg },
    { default: catImg },
    { default: treeImg },
    { default: sunImg },
  ] = await Promise.all([
    import('../assets/eating.png'),
    import('../assets/reading.png'),
    import('../assets/swimming.png'),
    import('../assets/apple.png'),
    import('../assets/car.png'),
    import('../assets/cat.png'),
    import('../assets/tree.png'),
    import('../assets/sun.png'),
  ]);

  return [
    {
      id: 1,
      questionText: "ماذا يفعل؟",
      image: eatingImg,
      word: 'يأكل',
      distractors: ['يشرب', 'ينام', 'يجري']
    },
    {
      id: 2,
      questionText: "ماذا يفعل؟",
      image: readingImg,
      word: 'يقرأ',
      distractors: ['يكتب', 'يلعب', 'يغني']
    },
    {
      id: 3,
      questionText: "ماذا يفعل؟",
      image: swimmingImg,
      word: 'يسبح',
      distractors: ['يطير', 'يقفز', 'يركض']
    },
    {
      id: 4,
      questionText: "ما هذا؟",
      image: appleImg,
      word: 'تفاحة',
      distractors: ['موزة', 'برتقالة', 'بطيخ']
    },
    {
      id: 5,
      questionText: "ما هذا؟",
      image: carImg,
      word: 'سيارة',
      distractors: ['دراجة', 'قطار', 'طائرة']
    },
    {
      id: 6,
      questionText: "ما هذا؟",
      image: catImg,
      word: 'قطة',
      distractors: ['كلب', 'أرنب', 'أسد']
    },
    {
      id: 7,
      questionText: "ما هذا؟",
      image: treeImg,
      word: 'شجرة',
      distractors: ['زهرة', 'جبل', 'صخرة']
    },
    {
      id: 8,
      questionText: "ما هذا؟",
      image: sunImg,
      word: 'شمس',
      distractors: ['قمر', 'كوكب', 'نجمة']
    }
  ];
}

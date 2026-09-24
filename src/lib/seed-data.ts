export const GOVERNORATES: { nameAr: string; areas: string[] }[] = [
  {
    nameAr: "محافظة العاصمة",
    areas: [
      "المنامة",
      "العدلية",
      "الجفير",
      "الحورة",
      "السلمانية",
      "القفول",
      "النعيم",
      "بلقية",
      "السنابس",
      "كرباباد",
      "جد حفص",
      "الزنج",
      "جرداب",
    ],
  },
  {
    nameAr: "محافظة المحرق",
    areas: [
      "المحرق",
      "البسيتين",
      "الحد",
      "عراد",
      "قلالي",
      "سماهيج",
      "الدير",
      "حالة بو ماهر",
      "الحمرية",
      "أمواج",
    ],
  },
  {
    nameAr: "المحافظة الشمالية",
    areas: [
      "سار",
      "البديع",
      "الجنبية",
      "كرانة",
      "دمستان",
      "باربار",
      "المقابة",
      "مدينة حمد",
      "الزلاق",
      "المالكية",
      "سلماباد",
    ],
  },
  {
    nameAr: "المحافظة الجنوبية",
    areas: [
      "الرفاع الغربي",
      "الرفاع الشرقي",
      "مدينة عيسى",
      "النويدرات",
      "سترة",
      "عوالي",
      "معامير",
      "عسكر",
      "أم الحصم",
    ],
  },
];

export const CUISINES = [
  "الكل",
  "مشويات",
  "برجر",
  "بيتزا",
  "شاورما",
  "مأكولات بحرية",
  "حلويات",
  "وجبات صحية",
];

export const RESTAURANT_SEED = [
  {
    nameAr: "مشويات لقمة الدار",
    cuisine: "مشويات",
    emoji: "🔥",
    imageUrl: "/images/grills.jpg",
    description: "أفضل المشويات على الفحم مع الأرز البخاري وصلصة الثوم",
    address: "المنامة - شارع البديع",
    phone: "+97317000111",
    rating: "4.80",
    ratingCount: 312,
    minOrder: "4.000",
    deliveryFee: "0.900",
    prepMinutes: 30,
    categories: [
      {
        nameAr: "مشويات",
        items: [
          {
            nameAr: "كباب لحم",
            description: "كباب لحم بقري مفروم على الفحم مع البقدونس",
            emoji: "🍢",
            price: "3.500",
            sizes: [
              { nameAr: "صغير (6 أسياخ)", price: "3.500" },
              { nameAr: "وسط (9 أسياخ)", price: "4.900" },
              { nameAr: "كبير (12 سيخ)", price: "6.400" },
            ],
            groups: [
              {
                nameAr: "الإضافات",
                type: "multi",
                addons: [
                  { nameAr: "صلصة ثوم إضافية", price: "0.300" },
                  { nameAr: "خبز تنور", price: "0.200" },
                  { nameAr: "بصل وطرشي", price: "0.150" },
                ],
              },
              {
                nameAr: "الأرز",
                type: "single",
                addons: [
                  { nameAr: "أرز بخاري", price: "0.800" },
                  { nameAr: "أرز أبيض", price: "0.500" },
                  { nameAr: "بدون أرز", price: "0" },
                ],
              },
            ],
          },
          {
            nameAr: "شقف لحم",
            description: "قطع لحم غنم طرية مشوية على الفحم",
            emoji: "🥩",
            price: "5.200",
            sizes: [
              { nameAr: "نصف كيلو", price: "5.200" },
              { nameAr: "كيلو", price: "9.500" },
            ],
          },
          {
            nameAr: "صدر دجاج مشوي",
            description: "صدر دجاج متبل بالبهارات المشكلة",
            emoji: "🍗",
            price: "2.900",
          },
          {
            nameAr: "ريش غنم",
            description: "ريش غنم بلدي مشوية مع الخضار",
            emoji: "🍖",
            price: "6.300",
          },
        ],
      },
      {
        nameAr: "مقبلات",
        items: [
          { nameAr: "حمص", description: "حمص بالطحينة وزيت الزيتون", emoji: "🥣", price: "1.200" },
          { nameAr: "متبل", description: "متبل باذنجان مدخن", emoji: "🍆", price: "1.300" },
          { nameAr: "سلطة خضراء", description: "سلطة طازجة مع الليمون", emoji: "🥗", price: "0.900" },
        ],
      },
      {
        nameAr: "مشروبات",
        items: [
          { nameAr: "عصير ليمون نعناع", description: "عصير طازج", emoji: "🍋", price: "1.100" },
          { nameAr: "ماء معدني", description: "500 مل", emoji: "💧", price: "0.300" },
          { nameAr: "بيبسي", description: "330 مل", emoji: "🥤", price: "0.400" },
        ],
      },
    ],
  },
  {
    nameAr: "برجر هاوس لقمة",
    cuisine: "برجر",
    emoji: "🍔",
    imageUrl: "/images/burger.jpg",
    description: "برجر لحم طازج يومياً مع خبز البريوش المحمص",
    address: "الجفير - مجمع 338",
    phone: "+97317000222",
    rating: "4.60",
    ratingCount: 508,
    minOrder: "3.000",
    deliveryFee: "0.700",
    prepMinutes: 20,
    categories: [
      {
        nameAr: "البرجر",
        items: [
          {
            nameAr: "برجر كلاسيك",
            description: "لحم بقري 150 جم مع جبنة شيدر وخس وطماطم",
            emoji: "🍔",
            price: "3.200",
            sizes: [
              { nameAr: "سنجل", price: "3.200" },
              { nameAr: "دبل", price: "4.600" },
              { nameAr: "تربل", price: "5.900" },
            ],
            groups: [
              {
                nameAr: "إضافات البرجر",
                type: "multi",
                addons: [
                  { nameAr: "بيكون", price: "0.700" },
                  { nameAr: "جبنة إضافية", price: "0.400" },
                  { nameAr: "فطر", price: "0.400" },
                  { nameAr: "صلصة حارة", price: "0.200" },
                ],
              },
              {
                nameAr: "الوجبة",
                type: "single",
                addons: [
                  { nameAr: "سادة", price: "0" },
                  { nameAr: "مع بطاطس ومشروب", price: "1.500" },
                ],
              },
            ],
          },
          {
            nameAr: "برجر دجاج مقرمش",
            description: "فليه دجاج مقرمش مع صلصة الرانش",
            emoji: "🍗",
            price: "2.900",
          },
          {
            nameAr: "برجر نباتي",
            description: "برجر خضار مع جبنة الموزاريلا",
            emoji: "🥬",
            price: "2.800",
          },
        ],
      },
      {
        nameAr: "جانبية",
        items: [
          { nameAr: "بطاطس مقلية", description: "بطاطس مقرمشة مع الملح", emoji: "🍟", price: "1.000" },
          { nameAr: "أجنحة دجاج", description: "6 قطع بالصوص الحار", emoji: "🍖", price: "2.600" },
          { nameAr: "حلقات بصل", description: "8 حلقات مقرمشة", emoji: "🧅", price: "1.300" },
        ],
      },
    ],
  },
  {
    nameAr: "بيتزا روما الذهبية",
    cuisine: "بيتزا",
    emoji: "🍕",
    imageUrl: "/images/pizza.jpg",
    description: "بيتزا بعجين إيطالي مخمر 24 ساعة وفرن حطب",
    address: "الرفاع الغربي - شارع السوق",
    phone: "+97317000333",
    rating: "4.40",
    ratingCount: 226,
    minOrder: "4.500",
    deliveryFee: "1.000",
    prepMinutes: 25,
    categories: [
      {
        nameAr: "البيتزا",
        items: [
          {
            nameAr: "بيتزا مارغريتا",
            description: "صلصة طماطم وموزاريلا طازجة وريحان",
            emoji: "🍕",
            price: "3.800",
            sizes: [
              { nameAr: "صغيرة 24 سم", price: "3.800" },
              { nameAr: "وسط 30 سم", price: "5.200" },
              { nameAr: "كبيرة 38 سم", price: "6.800" },
              { nameAr: "عائلية 45 سم", price: "8.500" },
            ],
            groups: [
              {
                nameAr: "إضافات",
                type: "multi",
                addons: [
                  { nameAr: "زيتون أسود", price: "0.400" },
                  { nameAr: "فطر", price: "0.400" },
                  { nameAr: "جبنة إضافية", price: "0.600" },
                  { nameAr: "روكا", price: "0.300" },
                ],
              },
              {
                nameAr: "الحواف",
                type: "single",
                addons: [
                  { nameAr: "عادية", price: "0" },
                  { nameAr: "محشية بالجبن", price: "1.200" },
                ],
              },
            ],
          },
          {
            nameAr: "بيتزا بيبروني",
            description: "بيبروني حار وموزاريلا",
            emoji: "🍕",
            price: "4.600",
          },
          {
            nameAr: "بيتزا دجاج بالباربكيو",
            description: "دجاج وبصل وصوص الباربكيو",
            emoji: "🍗",
            price: "4.900",
          },
        ],
      },
      {
        nameAr: "باستا",
        items: [
          { nameAr: "باستا ألفريدو", description: "باستا مع صوص الكريمة والدجاج", emoji: "🍝", price: "3.900" },
          { nameAr: "باستا أرابياتا", description: "باستا حارة بصوص الطماطم", emoji: "🍝", price: "3.400" },
        ],
      },
    ],
  },
  {
    nameAr: "شاورما الأصيل",
    cuisine: "شاورما",
    emoji: "🌯",
    imageUrl: "/images/shawarma.jpg",
    description: "شاورما دجاج ولحم بالفرن الدوار مع صوص الثوم الأصلي",
    address: "المحرق - شارع المطار",
    phone: "+97317000444",
    rating: "4.70",
    ratingCount: 741,
    minOrder: "2.000",
    deliveryFee: "0.600",
    prepMinutes: 15,
    categories: [
      {
        nameAr: "الشاورما",
        items: [
          {
            nameAr: "شاورما دجاج",
            description: "دجاج متبل مع ثوم ومخلل وصلصة",
            emoji: "🌯",
            price: "1.300",
            sizes: [
              { nameAr: "صاروخ صغير", price: "1.300" },
              { nameAr: "صاروخ كبير", price: "1.900" },
              { nameAr: "وجبة (صاروخ + بطاطس + مشروب)", price: "2.700" },
            ],
            groups: [
              {
                nameAr: "الإضافات",
                type: "multi",
                addons: [
                  { nameAr: "جبنة حلوة", price: "0.200" },
                  { nameAr: "صوص ثوم إضافي", price: "0.200" },
                  { nameAr: "بطاطس داخل الصاروخ", price: "0.300" },
                  { nameAr: "حار", price: "0" },
                ],
              },
            ],
          },
          {
            nameAr: "شاورما لحم",
            description: "لحم بقري مع طحينة وبقدونس",
            emoji: "🥙",
            price: "1.800",
          },
          {
            nameAr: "صحن شاورما",
            description: "شاورما مع أرز وسلطة",
            emoji: "🍲",
            price: "2.900",
          },
        ],
      },
      {
        nameAr: "جانبية ومشروبات",
        items: [
          { nameAr: "بطاطس", description: "بطاطس مقرمشة", emoji: "🍟", price: "0.700" },
          { nameAr: "سلطة طحينة", description: "طحينة وسلطة خضراء", emoji: "🥗", price: "0.800" },
          { nameAr: "عيران", description: "لبن مخفوق", emoji: "🥛", price: "0.600" },
        ],
      },
    ],
  },
  {
    nameAr: "صياد الخليج",
    cuisine: "مأكولات بحرية",
    emoji: "🦐",
    imageUrl: "/images/seafood.jpg",
    description: "سمك طازج يومياً من سوق السمك مع الروبيان والحبار",
    address: "الحد - كورنيش الصيادين",
    phone: "+97317000555",
    rating: "4.50",
    ratingCount: 178,
    minOrder: "6.000",
    deliveryFee: "1.200",
    prepMinutes: 35,
    categories: [
      {
        nameAr: "الأسماك",
        items: [
          {
            nameAr: "سمك هامور مشوي",
            description: "هامور طازج مشوي على الفحم مع الليمون",
            emoji: "🐟",
            price: "7.500",
            sizes: [
              { nameAr: "نصف كيلو", price: "7.500" },
              { nameAr: "كيلو", price: "13.500" },
            ],
          },
          {
            nameAr: "روبيان مشوي",
            description: "روبيان كبير متبل بالثوم والزبدة",
            emoji: "🦐",
            price: "6.200",
          },
          { nameAr: "حبار مقلي", description: "كاليماري مقرمش مع صوص التارتار", emoji: "🦑", price: "4.100" },
        ],
      },
      {
        nameAr: "أطباق",
        items: [
          { nameAr: "صحن بحري مشكل", description: "روبيان وحبار وسمك وأرز", emoji: "🍤", price: "8.900" },
          { nameAr: "شوربة سي فود", description: "شوربة بحرية بالكريمة", emoji: "🍜", price: "2.400" },
        ],
      },
    ],
  },
  {
    nameAr: "حلويات لقمة الذهبية",
    cuisine: "حلويات",
    emoji: "🍰",
    imageUrl: "/images/sweets.jpg",
    description: "كنافة نابلسية وبقلاوة بالفستق الحلبي الطازج",
    address: "العاصمة - النعيم",
    phone: "+97317000666",
    rating: "4.90",
    ratingCount: 934,
    minOrder: "3.000",
    deliveryFee: "0.800",
    prepMinutes: 15,
    categories: [
      {
        nameAr: "الكنافة",
        items: [
          {
            nameAr: "كنافة نابلسية",
            description: "كنافة بالجبن العكاوي والقطر",
            emoji: "🍯",
            price: "3.200",
            sizes: [
              { nameAr: "صحن صغير", price: "3.200" },
              { nameAr: "صحن وسط", price: "4.500" },
              { nameAr: "صحن عائلي", price: "7.000" },
            ],
            groups: [
              {
                nameAr: "التقديم",
                type: "single",
                addons: [
                  { nameAr: "سادة", price: "0" },
                  { nameAr: "مع فستق", price: "1.000" },
                  { nameAr: "مع آيس كريم", price: "0.800" },
                ],
              },
            ],
          },
          { nameAr: "كنافة مدلوقة", description: "كنافة مقلوبة بالفستق", emoji: "🥮", price: "3.800" },
        ],
      },
      {
        nameAr: "بقلاوة ومشروبات",
        items: [
          { nameAr: "بقلاوة فستق", description: "بقلاوة بالفستق الحلبي (12 قطعة)", emoji: "🥧", price: "4.000" },
          { nameAr: "قهوة عربية", description: "قهوة عربية مع الهيل", emoji: "☕", price: "1.000" },
          { nameAr: "شاي كرك", description: "شاي بالحليب والهيل", emoji: "🍵", price: "0.700" },
        ],
      },
    ],
  },
];

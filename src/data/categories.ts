import {
  BudgetGroup,
  BudgetLineItem,
  CategorySubitem,
  Language,
  MainCategory,
  RawCategoryGroup,
} from '../types/budget';

export const MAIN_CATEGORIES: MainCategory[] = [
  {
    id: 'cat_food_drinks',
    name: 'Food & Drinks',
    nameBg: 'Храна и напитки',
    group: 'variable',
    color: '#EF4444',
    icon: 'UtensilsCrossed',
    subcategories: [
      { id: 'sub_bar_cafe', name: 'Bar, cafe', nameBg: 'Бар, кафе', icon: 'Wine' },
      {
        id: 'sub_rest_fastfood',
        name: 'Restaurant, fast-food',
        nameBg: 'Ресторант, бързо хранене',
        icon: 'Utensils',
      },
      { id: 'sub_office_food', name: 'Office - food', nameBg: 'Храна в офиса', icon: 'Coffee' },
      {
        id: 'sub_groceries',
        name: 'Groceries',
        nameBg: 'Хранителни стоки / Супермаркет',
        icon: 'Apple',
      },
    ],
  },
  {
    id: 'cat_shopping',
    name: 'Shopping',
    nameBg: 'Пазаруване',
    group: 'variable',
    color: '#0EA5E9',
    icon: 'ShoppingBag',
    subcategories: [
      {
        id: 'sub_drugstore_chemist',
        name: 'Drug-store, chemist',
        nameBg: 'Аптека и дрогерия',
        icon: 'Sparkles',
      },
      { id: 'sub_leisure_time', name: 'Leisure time', nameBg: 'Свободно време', icon: 'Smile' },
      {
        id: 'sub_stationery_tools',
        name: 'Stationery, tools',
        nameBg: 'Канцелария, инструменти',
        icon: 'Wrench',
      },
      { id: 'sub_gifts_joy', name: 'Gifts, joy', nameBg: 'Подаръци и радост', icon: 'Gift' },
      {
        id: 'sub_electronics_accessories',
        name: 'Electronics, accessories',
        nameBg: 'Електроника, аксесоари',
        icon: 'Laptop',
      },
      {
        id: 'sub_pets_animals',
        name: 'Pets, animals',
        nameBg: 'Домашни любимци',
        icon: 'Heart',
      },
      { id: 'sub_home_garden', name: 'Home, garden', nameBg: 'Дом и градина', icon: 'Home' },
      { id: 'sub_kids', name: 'Kids', nameBg: 'Деца', icon: 'Baby' },
      {
        id: 'sub_health_beauty',
        name: 'Health and beauty',
        nameBg: 'Здраве и красота',
        icon: 'Sparkles',
      },
      {
        id: 'sub_jewels_accessories',
        name: 'Jewels, accessories',
        nameBg: 'Бижута, аксесоари',
        icon: 'Gem',
      },
      {
        id: 'sub_clothes_footwear',
        name: 'Clothes & Footwear',
        nameBg: 'Дрехи и обувки',
        icon: 'Shirt',
      },
    ],
  },
  {
    id: 'cat_housing',
    name: 'Housing',
    nameBg: 'Жилище и комунални',
    group: 'fixed',
    color: '#F97316',
    icon: 'Home',
    subcategories: [
      {
        id: 'sub_property_insurance',
        name: 'Property insurance',
        nameBg: 'Застраховка на имот',
        icon: 'ShieldCheck',
      },
      {
        id: 'sub_maintenance_repairs',
        name: 'Maintenance, repairs',
        nameBg: 'Поддръжка, ремонти',
        icon: 'Hammer',
      },
      { id: 'sub_services', name: 'Services', nameBg: 'Битови услуги', icon: 'Settings' },
      {
        id: 'sub_energy_utilities',
        name: 'Energy, utilities',
        nameBg: 'Енергия, комунални сметки',
        icon: 'Zap',
      },
      { id: 'sub_mortgage', name: 'Mortgage', nameBg: 'Ипотечен кредит', icon: 'Landmark' },
      { id: 'sub_rent', name: 'Rent', nameBg: 'Наем', icon: 'Key' },
    ],
  },
  {
    id: 'cat_transportation',
    name: 'Transportation',
    nameBg: 'Транспорт',
    group: 'variable',
    color: '#64748B',
    icon: 'Bus',
    subcategories: [
      {
        id: 'sub_business_trips',
        name: 'Business trips',
        nameBg: 'Командировки',
        icon: 'Briefcase',
      },
      {
        id: 'sub_long_distance',
        name: 'Long distance',
        nameBg: 'Дълги пътувания / Самолет',
        icon: 'Plane',
      },
      { id: 'sub_taxi', name: 'Taxi', nameBg: 'Такси', icon: 'Car' },
      {
        id: 'sub_public_transport',
        name: 'Public transport',
        nameBg: 'Градски транспорт',
        icon: 'Train',
      },
    ],
  },
  {
    id: 'cat_vehicle',
    name: 'Vehicle',
    nameBg: 'Автомобил',
    group: 'variable',
    color: '#A855F7',
    icon: 'Car',
    subcategories: [
      { id: 'sub_leasing', name: 'Leasing', nameBg: 'Лизинг', icon: 'CreditCard' },
      {
        id: 'sub_vehicle_insurance',
        name: 'Vehicle insurance',
        nameBg: 'Гражданска и Каско',
        icon: 'ShieldAlert',
      },
      { id: 'sub_rentals', name: 'Rentals', nameBg: 'Наем на автомобил', icon: 'KeyRound' },
      {
        id: 'sub_vehicle_maintenance',
        name: 'Vehicle maintenance',
        nameBg: 'Автосервиз и поддръжка',
        icon: 'Wrench',
      },
      { id: 'sub_parking', name: 'Parking', nameBg: 'Паркинг', icon: 'CircleParking' },
      { id: 'sub_fuel', name: 'Fuel', nameBg: 'Гориво', icon: 'Fuel' },
    ],
  },
  {
    id: 'cat_life_entertainment',
    name: 'Life & Entertainment',
    nameBg: 'Живот и развлечения',
    group: 'variable',
    color: '#84CC16',
    icon: 'Smile',
    subcategories: [
      {
        id: 'sub_lottery_gambling',
        name: 'Lottery, gambling',
        nameBg: 'Лотария, хазарт',
        icon: 'Dices',
      },
      {
        id: 'sub_alcohol_tobacco',
        name: 'Alcohol, tobacco',
        nameBg: 'Алкохол, тютюн',
        icon: 'GlassWater',
      },
      {
        id: 'sub_charity_gifts',
        name: 'Charity, gifts',
        nameBg: 'Благотворителност, подаръци',
        icon: 'HeartHandshake',
      },
      { id: 'sub_tithe_10', name: 'Десятък 10%', nameBg: 'Десятък 10%', icon: 'Coins' },
      {
        id: 'sub_donation_ncc',
        name: 'Donation_NCC_Good',
        nameBg: 'Дарение NCC Good',
        icon: 'Heart',
      },
      {
        id: 'sub_holiday_trips',
        name: 'Holiday, trips, hotels',
        nameBg: 'Почивки, екскурзии, хотели',
        icon: 'Palmtree',
      },
      { id: 'sub_tv_streaming', name: 'TV, Streaming', nameBg: 'ТВ, стрийминг', icon: 'Tv' },
      {
        id: 'sub_books_audio_subs',
        name: 'Books, audio, subscriptions',
        nameBg: 'Книги, аудио, абонаменти',
        icon: 'BookOpen',
      },
      {
        id: 'sub_education_dev',
        name: 'Education, development',
        nameBg: 'Образование, курсове',
        icon: 'GraduationCap',
      },
      { id: 'sub_hobbies', name: 'Hobbies', nameBg: 'Хобита', icon: 'Palette' },
      {
        id: 'sub_life_events',
        name: 'Life events',
        nameBg: 'Семейни събития',
        icon: 'Cake',
      },
      {
        id: 'sub_culture_sport',
        name: 'Culture, sport events',
        nameBg: 'Култура, спортни събития',
        icon: 'Ticket',
      },
      {
        id: 'sub_active_sport_fitness',
        name: 'Active sport, fitness',
        nameBg: 'Спорт, фитнес',
        icon: 'Dumbbell',
      },
      {
        id: 'sub_wellness_beauty',
        name: 'Wellness, beauty',
        nameBg: 'Уелнес, спа, красота',
        icon: 'Flower2',
      },
      {
        id: 'sub_healthcare_doctor',
        name: 'Health care, doctor',
        nameBg: 'Здравеопазване, лекар',
        icon: 'Stethoscope',
      },
    ],
  },
  {
    id: 'cat_communication_pc',
    name: 'Communication, PC',
    nameBg: 'Комуникации и компютри',
    group: 'fixed',
    color: '#3B82F6',
    icon: 'Monitor',
    subcategories: [
      {
        id: 'sub_postal_services',
        name: 'Postal services',
        nameBg: 'Пощенски и куриерски услуги',
        icon: 'Mail',
      },
      {
        id: 'sub_software_apps_games',
        name: 'Software, apps, games',
        nameBg: 'Софтуер, приложения, игри',
        icon: 'Gamepad2',
      },
      { id: 'sub_internet', name: 'Internet', nameBg: 'Интернет', icon: 'Wifi' },
      {
        id: 'sub_telephony_mobile',
        name: 'Telephony, mobile phone',
        nameBg: 'Телефония, мобилен телефон',
        icon: 'Phone',
      },
    ],
  },
  {
    id: 'cat_financial_expenses',
    name: 'Financial expenses',
    nameBg: 'Финансови разходи',
    group: 'debt',
    color: '#14B8A6',
    icon: 'Landmark',
    subcategories: [
      {
        id: 'sub_child_support_exp',
        name: 'Child Support',
        nameBg: 'Издръжка на деца',
        icon: 'Baby',
      },
      {
        id: 'sub_charges_fees',
        name: 'Charges, Fees',
        nameBg: 'Такси, комисиони',
        icon: 'Receipt',
      },
      { id: 'sub_advisory', name: 'Advisory', nameBg: 'Консултации', icon: 'Users' },
      { id: 'sub_fines', name: 'Fines', nameBg: 'Глоби', icon: 'AlertTriangle' },
      {
        id: 'sub_loans_interests',
        name: 'Loans, interests',
        nameBg: 'Кредити, лихви',
        icon: 'CreditCard',
      },
      { id: 'sub_insurances', name: 'Insurances', nameBg: 'Застраховки', icon: 'Shield' },
      { id: 'sub_taxes', name: 'Taxes', nameBg: 'Данъци', icon: 'FileText' },
    ],
  },
  {
    id: 'cat_investments',
    name: 'Investments',
    nameBg: 'Инвестиции',
    group: 'savings',
    color: '#EC4899',
    icon: 'TrendingUp',
    subcategories: [
      { id: 'sub_collections', name: 'Collections', nameBg: 'Колекции', icon: 'Boxes' },
      { id: 'sub_savings_acc', name: 'Savings', nameBg: 'Спестявания', icon: 'PiggyBank' },
      {
        id: 'sub_financial_investments',
        name: 'Financial investments',
        nameBg: 'Финансови инвестиции',
        icon: 'LineChart',
      },
      {
        id: 'sub_vehicles_chattels',
        name: 'Vehicles, chattels',
        nameBg: 'Транспортни средства, имущество',
        icon: 'Truck',
      },
      { id: 'sub_realty', name: 'Realty', nameBg: 'Недвижими имоти', icon: 'Building' },
    ],
  },
  {
    id: 'cat_income',
    name: 'Income',
    nameBg: 'Приходи',
    group: 'income',
    color: '#F59E0B',
    icon: 'Coins',
    subcategories: [
      { id: 'sub_inc_gifts', name: 'Gifts', nameBg: 'Подаръци (приход)', icon: 'Gift' },
      {
        id: 'sub_inc_child_support',
        name: 'Child Support',
        nameBg: 'Издръжка на деца',
        icon: 'Baby',
      },
      {
        id: 'sub_inc_refunds',
        name: 'Refunds (tax, purchase)',
        nameBg: 'Възстановени суми',
        icon: 'RotateCcw',
      },
      {
        id: 'sub_inc_lottery',
        name: 'Lottery, gambling',
        nameBg: 'Лотария, хазарт',
        icon: 'Dices',
      },
      {
        id: 'sub_inc_checks_coupons',
        name: 'Checks, coupons',
        nameBg: 'Чекове, ваучери',
        icon: 'Ticket',
      },
      {
        id: 'sub_inc_lending_renting',
        name: 'Lending, renting',
        nameBg: 'Даване под наем, заеми',
        icon: 'HandCoins',
      },
      {
        id: 'sub_inc_dues_grants',
        name: 'Dues & grants',
        nameBg: 'Членски внос и субсидии',
        icon: 'Award',
      },
      {
        id: 'sub_inc_rental_income',
        name: 'Rental income',
        nameBg: 'Приход от наеми',
        icon: 'Home',
      },
      { id: 'sub_inc_sale', name: 'Sale', nameBg: 'Продажба', icon: 'Tag' },
      {
        id: 'sub_inc_interests_dividends',
        name: 'Interests, dividends',
        nameBg: 'Лихви, дивиденти',
        icon: 'Percent',
      },
      {
        id: 'sub_inc_wage_invoices',
        name: 'Wage, invoices',
        nameBg: 'Заплата, фактури',
        icon: 'Wallet',
      },
    ],
  },
  {
    id: 'cat_others',
    name: 'Others',
    nameBg: 'Други',
    group: 'variable',
    color: '#94A3B8',
    icon: 'Menu',
    subcategories: [
      {
        id: 'sub_missing',
        name: 'Missing',
        nameBg: 'Липсваща / Неуточнена',
        icon: 'HelpCircle',
      },
    ],
  },
];

export function mapCategoryGroupToLedgerGroup(rawGroup: RawCategoryGroup): BudgetGroup {
  switch (rawGroup) {
    case 'fixed':
    case 'debt':
      return 'bills';
    case 'savings':
      return 'savings';
    case 'income':
      return 'income';
    case 'variable':
    default:
      return 'variable';
  }
}

export function getMainCategoryName(cat: MainCategory, lang: Language): string {
  return lang === 'bg' ? cat.nameBg || cat.name : cat.name || cat.nameBg;
}

export function getSubcategoryName(sub: CategorySubitem, lang: Language): string {
  return lang === 'bg' ? sub.nameBg || sub.name : sub.name || sub.nameBg;
}

export function findSubcategoryById(
  subcategoryId?: string
): { category: MainCategory; subcategory: CategorySubitem } | null {
  if (!subcategoryId) return null;
  for (const cat of MAIN_CATEGORIES) {
    const sub = cat.subcategories.find((s) => s.id === subcategoryId);
    if (sub) return { category: cat, subcategory: sub };
  }
  return null;
}

const SEED_KEY_TO_CATEGORY_ID: Record<string, string> = {
  salary: 'cat_income',
  food_vouchers: 'cat_income',
  multisport: 'cat_income',
  prev_month: 'cat_income',
  cash: 'cat_income',
  obb_mortgage: 'cat_housing',
  tithe_10: 'cat_life_entertainment',
  metlife: 'cat_financial_expenses',
  phone: 'cat_communication_pc',
  internet: 'cat_communication_pc',
  building_fee: 'cat_housing',
  spotify: 'cat_life_entertainment',
  google_one: 'cat_communication_pc',
  credit_card: 'cat_financial_expenses',
  electricity: 'cat_housing',
  water: 'cat_housing',
  fuel: 'cat_vehicle',
  groceries: 'cat_food_drinks',
  office_food: 'cat_food_drinks',
  voucher_food: 'cat_food_drinks',
  barbershop: 'cat_life_entertainment',
  dining_out: 'cat_food_drinks',
  vault_general: 'cat_investments',
  vault_vacations: 'cat_investments',
  vault_investment: 'cat_investments',
  vault_car_payments: 'cat_investments',
  vault_pay_yourself: 'cat_investments',
  vault_taxes: 'cat_investments',
  vault_car_service: 'cat_investments',
  vault_children: 'cat_investments',
};

export function resolveItemMainCategory(item: BudgetLineItem): MainCategory {
  if (item.categoryId) {
    const found = MAIN_CATEGORIES.find((c) => c.id === item.categoryId);
    if (found) return found;
  }

  const mappedId = SEED_KEY_TO_CATEGORY_ID[item.key];
  if (mappedId) {
    const found = MAIN_CATEGORIES.find((c) => c.id === mappedId);
    if (found) return found;
  }

  // Group fallback
  const fallbackId =
    item.group === 'income'
      ? 'cat_income'
      : item.group === 'savings'
      ? 'cat_investments'
      : item.group === 'bills'
      ? 'cat_housing'
      : 'cat_others';

  return MAIN_CATEGORIES.find((c) => c.id === fallbackId) || MAIN_CATEGORIES[MAIN_CATEGORIES.length - 1];
}

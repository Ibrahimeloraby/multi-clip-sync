export type Lang = 'en' | 'ar';

const en = {
  // Nav
  'nav.home': 'Home',
  'nav.merchants': 'Merchants',
  'nav.recommend': 'Use Now',
  'nav.community': 'Community',
  'nav.profile': 'Profile',

  // Onboarding
  'onboarding.welcome.title': 'Get the most from every UAE purchase',
  'onboarding.welcome.subtitle': 'Connect all your loyalty cards. Get AI-powered recommendations.',
  'onboarding.welcome.cta': 'Get Started',
  'onboarding.welcome.signin': 'I already have an account',
  'onboarding.programs.title': 'Which programs are you enrolled in?',
  'onboarding.programs.subtitle': 'Select all that apply',
  'onboarding.programs.cta': 'Continue with {count} programs',
  'onboarding.goals.title': "What's most important to you?",
  'onboarding.goals.subtitle': 'Select up to 2 goals',
  'onboarding.goals.cashback': 'Maximize Cashback',
  'onboarding.goals.miles': 'Earn Travel Miles',
  'onboarding.goals.entertainment': 'Entertainment Value',
  'onboarding.goals.expiry': 'Use Before Expiry',
  'onboarding.spend.title': 'How much do you spend monthly?',
  'onboarding.spend.subtitle': 'We use this to optimize your recommendations',
  'onboarding.notifications.title': 'Stay ahead with smart alerts',
  'onboarding.complete.title': "You're all set!",
  'onboarding.complete.subtitle': '{count} programs connected',
  'onboarding.complete.cta': 'Go to Dashboard',

  // Dashboard
  'dashboard.portfolio': 'Total Portfolio Value',
  'dashboard.programs': '{count} programs',
  'dashboard.expiring.title': 'Expiring Soon',
  'dashboard.expiring.risk': 'AED {amount} at risk in 30 days',
  'dashboard.recommend.cta': 'What should I use right now?',
  'dashboard.underused.title': 'Underused Programs',
  'dashboard.community.title': 'Community Updates',
  'dashboard.chart.title': 'Earning vs Redemption',
  'dashboard.chart.earned': 'Earned',
  'dashboard.chart.redeemed': 'Redeemed',

  // Programs
  'programs.title': 'My Programs',
  'programs.add': 'Add Program',
  'programs.balance': 'Balance',
  'programs.tier': 'Tier',
  'programs.expires': 'Expires',
  'programs.update': 'Update Balance',
  'programs.tracking': 'Tracking Method',
  'programs.manual': 'Manual',
  'programs.email_forward': 'Email Forwarding',
  'programs.screenshot': 'Screenshot',
  'programs.no_programs': 'No programs yet',
  'programs.no_programs_sub': 'Add your loyalty programs to get started',

  // Merchants
  'merchants.title': 'Merchants',
  'merchants.search': 'Search merchants...',
  'merchants.filter.all': 'All',
  'merchants.filter.my_programs': 'My Programs',
  'merchants.rules': '{count} active rules',
  'merchants.no_rules': 'No rules yet',
  'merchants.add_rule': 'Add Rule',
  'merchants.verified': 'Verified',

  // Recommendations
  'recommend.title': 'Best Choice',
  'recommend.step1': 'Select Merchant',
  'recommend.step2': 'Enter Amount',
  'recommend.step3': 'Analyzing...',
  'recommend.step4': 'Your Recommendation',
  'recommend.step5': 'Log Transaction',
  'recommend.thinking': 'Analyzing your {count} programs...',
  'recommend.why': 'Why this?',
  'recommend.alternatives': 'Alternatives',
  'recommend.used_this': 'I used this',
  'recommend.used_other': 'I used something else',
  'recommend.earn': 'Earn {points} pts (~AED {value})',

  // Rules
  'rules.add': 'Add Rule',
  'rules.verify': 'Verify Rules',
  'rules.confirm': 'Confirm',
  'rules.dispute': 'Dispute',
  'rules.confidence': 'Confidence',
  'rules.source.official': 'Official',
  'rules.source.community': 'Community',
  'rules.source.personal': 'Personal',
  'rules.status.pending': 'Pending',
  'rules.status.provisional': 'Provisional',
  'rules.status.verified': 'Verified',
  'rules.status.trusted': 'Trusted',
  'rules.status.disputed': 'Disputed',
  'rules.status.expired': 'Expired',
  'rules.type.earn': 'Earn Rate',
  'rules.type.cashback': 'Cashback',
  'rules.type.discount': 'Discount',
  'rules.type.bogo': '2-for-1',
  'rules.type.multiplier': 'Multiplier',
  'rules.evidence': 'Add Evidence',
  'rules.submit': 'Submit Rule',
  'rules.submitted': 'Rule submitted! You\'ll be notified when it\'s reviewed.',

  // Community
  'community.title': 'Community',
  'community.leaderboard': 'Leaderboard',
  'community.my_contribution': 'My Contribution',
  'community.bounties': 'Bounties',
  'community.this_month': 'This Month',
  'community.all_time': 'All Time',
  'community.rank': 'Rank',
  'community.tier': 'Tier',
  'community.rules_added': 'Rules Added',
  'community.confirmations': 'Confirmations',

  // Reputation tiers
  'tier.newcomer': 'Newcomer',
  'tier.contributor': 'Contributor',
  'tier.trusted': 'Trusted',
  'tier.expert': 'Expert',
  'tier.maven': 'Maven',

  // Expiring
  'expiring.title': 'Expiring Points',
  'expiring.total_at_risk': 'AED {amount} at risk',
  'expiring.days': 'Expires in {days} days',
  'expiring.remind': 'Set Reminder',
  'expiring.redeemed': 'Mark Redeemed',
  'expiring.dismiss': 'Dismiss',
  'expiring.optimize': 'Optimize Expiring Rewards',

  // Insights
  'insights.title': 'Insights',
  'insights.earned': 'You earned',
  'insights.redeemed': 'You redeemed',
  'insights.unrealized': 'Unrealized value',
  'insights.if_followed': 'If you followed recommendations',
  'insights.top_merchants': 'Top Merchants',
  'insights.by_program': 'By Program',
  'insights.vs_avg': 'vs UAE Average',

  // Settings
  'settings.title': 'Settings',
  'settings.profile': 'Profile',
  'settings.notifications': 'Notifications',
  'settings.privacy': 'Privacy',
  'settings.programs': 'Programs',
  'settings.language': 'Language',
  'settings.logout': 'Sign Out',
  'settings.delete_account': 'Delete Account',
  'settings.export_data': 'Download My Data',

  // Common
  'common.loading': 'Loading...',
  'common.error': 'Something went wrong',
  'common.retry': 'Try Again',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.skip': 'Skip',
  'common.done': 'Done',
  'common.close': 'Close',
  'common.search': 'Search',
  'common.no_results': 'No results found',
  'common.see_all': 'See All',
  'common.aed': 'AED {amount}',
  'common.pts': '{amount} pts',
  'common.required': 'Required',
  'common.optional': 'Optional',
};

const ar: typeof en = {
  // Nav
  'nav.home': 'الرئيسية',
  'nav.merchants': 'التجار',
  'nav.recommend': 'استخدم الآن',
  'nav.community': 'المجتمع',
  'nav.profile': 'الملف الشخصي',

  // Onboarding
  'onboarding.welcome.title': 'احصل على أقصى استفادة من كل عملية شراء',
  'onboarding.welcome.subtitle': 'اربط جميع بطاقات الولاء الخاصة بك. احصل على توصيات بالذكاء الاصطناعي.',
  'onboarding.welcome.cta': 'ابدأ الآن',
  'onboarding.welcome.signin': 'لدي حساب بالفعل',
  'onboarding.programs.title': 'ما هي البرامج المسجلة فيها؟',
  'onboarding.programs.subtitle': 'اختر كل ما ينطبق',
  'onboarding.programs.cta': 'المتابعة مع {count} برامج',
  'onboarding.goals.title': 'ما الأهم بالنسبة لك؟',
  'onboarding.goals.subtitle': 'اختر حتى هدفين',
  'onboarding.goals.cashback': 'تعظيم الاسترداد النقدي',
  'onboarding.goals.miles': 'ربح أميال السفر',
  'onboarding.goals.entertainment': 'قيمة الترفيه',
  'onboarding.goals.expiry': 'الاستخدام قبل الانتهاء',
  'onboarding.spend.title': 'كم تنفق شهرياً؟',
  'onboarding.spend.subtitle': 'نستخدم هذا لتحسين توصياتك',
  'onboarding.notifications.title': 'ابقَ متقدماً بتنبيهات ذكية',
  'onboarding.complete.title': 'أنت جاهز!',
  'onboarding.complete.subtitle': '{count} برنامج متصل',
  'onboarding.complete.cta': 'الذهاب للوحة التحكم',

  // Dashboard
  'dashboard.portfolio': 'إجمالي قيمة المحفظة',
  'dashboard.programs': '{count} برامج',
  'dashboard.expiring.title': 'تنتهي قريباً',
  'dashboard.expiring.risk': 'AED {amount} في خطر خلال 30 يوم',
  'dashboard.recommend.cta': 'ماذا أستخدم الآن؟',
  'dashboard.underused.title': 'برامج غير مستخدمة',
  'dashboard.community.title': 'تحديثات المجتمع',
  'dashboard.chart.title': 'الكسب مقابل الاسترداد',
  'dashboard.chart.earned': 'مكتسب',
  'dashboard.chart.redeemed': 'مُسترد',

  // Programs
  'programs.title': 'برامجي',
  'programs.add': 'إضافة برنامج',
  'programs.balance': 'الرصيد',
  'programs.tier': 'المستوى',
  'programs.expires': 'ينتهي',
  'programs.update': 'تحديث الرصيد',
  'programs.tracking': 'طريقة التتبع',
  'programs.manual': 'يدوي',
  'programs.email_forward': 'إعادة توجيه البريد',
  'programs.screenshot': 'لقطة شاشة',
  'programs.no_programs': 'لا توجد برامج بعد',
  'programs.no_programs_sub': 'أضف برامج الولاء الخاصة بك للبدء',

  // Merchants
  'merchants.title': 'التجار',
  'merchants.search': 'البحث عن تجار...',
  'merchants.filter.all': 'الكل',
  'merchants.filter.my_programs': 'برامجي',
  'merchants.rules': '{count} قاعدة نشطة',
  'merchants.no_rules': 'لا توجد قواعد بعد',
  'merchants.add_rule': 'إضافة قاعدة',
  'merchants.verified': 'موثق',

  // Recommendations
  'recommend.title': 'أفضل خيار',
  'recommend.step1': 'اختر التاجر',
  'recommend.step2': 'أدخل المبلغ',
  'recommend.step3': 'جارٍ التحليل...',
  'recommend.step4': 'توصيتك',
  'recommend.step5': 'تسجيل المعاملة',
  'recommend.thinking': 'تحليل {count} برامج...',
  'recommend.why': 'لماذا هذا؟',
  'recommend.alternatives': 'بدائل',
  'recommend.used_this': 'استخدمت هذا',
  'recommend.used_other': 'استخدمت شيئاً آخر',
  'recommend.earn': 'اكسب {points} نقطة (~AED {value})',

  // Rules
  'rules.add': 'إضافة قاعدة',
  'rules.verify': 'التحقق من القواعد',
  'rules.confirm': 'تأكيد',
  'rules.dispute': 'اعتراض',
  'rules.confidence': 'الثقة',
  'rules.source.official': 'رسمي',
  'rules.source.community': 'مجتمعي',
  'rules.source.personal': 'شخصي',
  'rules.status.pending': 'قيد الانتظار',
  'rules.status.provisional': 'مؤقت',
  'rules.status.verified': 'موثق',
  'rules.status.trusted': 'موثوق',
  'rules.status.disputed': 'متنازع عليه',
  'rules.status.expired': 'منتهي',
  'rules.type.earn': 'معدل الكسب',
  'rules.type.cashback': 'استرداد نقدي',
  'rules.type.discount': 'خصم',
  'rules.type.bogo': 'اثنان بسعر واحد',
  'rules.type.multiplier': 'مضاعف',
  'rules.evidence': 'إضافة دليل',
  'rules.submit': 'إرسال القاعدة',
  'rules.submitted': 'تم إرسال القاعدة! ستتلقى إشعاراً عند مراجعتها.',

  // Community
  'community.title': 'المجتمع',
  'community.leaderboard': 'قائمة المتصدرين',
  'community.my_contribution': 'مساهمتي',
  'community.bounties': 'المكافآت',
  'community.this_month': 'هذا الشهر',
  'community.all_time': 'كل الوقت',
  'community.rank': 'الترتيب',
  'community.tier': 'المستوى',
  'community.rules_added': 'القواعد المضافة',
  'community.confirmations': 'التأكيدات',

  // Reputation tiers
  'tier.newcomer': 'مستخدم جديد',
  'tier.contributor': 'مساهم',
  'tier.trusted': 'موثوق',
  'tier.expert': 'خبير',
  'tier.maven': 'متميز',

  // Expiring
  'expiring.title': 'النقاط المنتهية',
  'expiring.total_at_risk': 'AED {amount} في خطر',
  'expiring.days': 'ينتهي بعد {days} أيام',
  'expiring.remind': 'تعيين تذكير',
  'expiring.redeemed': 'تم الاسترداد',
  'expiring.dismiss': 'تجاهل',
  'expiring.optimize': 'تحسين المكافآت المنتهية',

  // Insights
  'insights.title': 'رؤى',
  'insights.earned': 'لقد كسبت',
  'insights.redeemed': 'لقد استردت',
  'insights.unrealized': 'قيمة غير محققة',
  'insights.if_followed': 'لو اتبعت التوصيات',
  'insights.top_merchants': 'أفضل التجار',
  'insights.by_program': 'حسب البرنامج',
  'insights.vs_avg': 'مقارنة بالمتوسط',

  // Settings
  'settings.title': 'الإعدادات',
  'settings.profile': 'الملف الشخصي',
  'settings.notifications': 'الإشعارات',
  'settings.privacy': 'الخصوصية',
  'settings.programs': 'البرامج',
  'settings.language': 'اللغة',
  'settings.logout': 'تسجيل الخروج',
  'settings.delete_account': 'حذف الحساب',
  'settings.export_data': 'تنزيل بياناتي',

  // Common
  'common.loading': 'جارٍ التحميل...',
  'common.error': 'حدث خطأ ما',
  'common.retry': 'حاول مجدداً',
  'common.save': 'حفظ',
  'common.cancel': 'إلغاء',
  'common.back': 'رجوع',
  'common.next': 'التالي',
  'common.skip': 'تخطي',
  'common.done': 'تم',
  'common.close': 'إغلاق',
  'common.search': 'بحث',
  'common.no_results': 'لا توجد نتائج',
  'common.see_all': 'عرض الكل',
  'common.aed': 'AED {amount}',
  'common.pts': '{amount} نقطة',
  'common.required': 'مطلوب',
  'common.optional': 'اختياري',
};

export const translations = { en, ar };

export function t(key: string, lang: Lang, vars?: Record<string, string | number>): string {
  const dict = translations[lang] as Record<string, string>;
  let str = dict[key] ?? translations.en[key as keyof typeof en] ?? key;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(`{${k}}`, String(v));
    });
  }
  return str;
}

import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';

export function useTranslation() {
  const ctx = useContext(AppContext);
  const lang: Lang = (ctx?.language as Lang) ?? 'en';
  return {
    t: (key: string, vars?: Record<string, string | number>) => t(key, lang, vars),
    lang,
    setLang: ctx?.setLanguage ?? (() => {}),
    isRTL: lang === 'ar',
  };
}

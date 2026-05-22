-- =============================================================================
-- LoyaltyOne UAE: Seed — 18 UAE Loyalty Programs
-- Migration: 20260519000003_seed_programs.sql
-- =============================================================================

INSERT INTO programs (
  slug, display_name_en, display_name_ar, category,
  default_earn_rate_aed, default_redemption_value_aed,
  expiry_rule, transfer_partners, key_merchants, official_url
) VALUES

-- 1. Share by Majid Al Futtaim
(
  'share-maf',
  'Share by Majid Al Futtaim',
  'شير - ماجد الفطيم',
  'retail',
  1,
  0.02,
  '{"type":"rolling","months":12,"notes":"Points expire 12 months after earning if no activity"}',
  '[]',
  '["Carrefour","VOX Cinemas","Ski Dubai","Magic Planet","Wasl Hospitality","City Centre Malls"]',
  'https://www.share.ae'
),

-- 2. Emirates Skywards
(
  'skywards',
  'Emirates Skywards',
  'طيران الإمارات سكاي واردز',
  'airline',
  0,
  0.05,
  '{"type":"activity_based","months":36,"notes":"Miles expire 36 months after last earning or redemption activity"}',
  '["marriott-bonvoy","hilton-honors","accor-all","ihg-one","sixt","hertz","dnata"]',
  '["Emirates flights","dnata Travel","Emirates Holidays","Emaar","Dubai Duty Free"]',
  'https://www.skywards.com'
),

-- 3. Etihad Guest
(
  'etihad-guest',
  'Etihad Guest',
  'ضيف الاتحاد',
  'airline',
  0,
  0.045,
  '{"type":"rolling","months":18,"notes":"Miles expire 18 months after last account activity"}',
  '["marriott-bonvoy","accor-all","sixt","budget","etisalat"]',
  '["Etihad flights","Louvre Abu Dhabi","Yas Island","Ferrari World","ADNOC"]',
  'https://www.etihadguest.com'
),

-- 4. Smiles by e& (Etisalat)
(
  'smiles',
  'Smiles by e&',
  'سمايلز بـ e&',
  'telco',
  1,
  0.01,
  '{"type":"calendar_year","notes":"Points expire at end of each calendar year on 31 Dec"}',
  '[]',
  '["Starbucks","McDonald'\''s","Subway","Tim Hortons","Carrefour","ADNOC","LuLu Hypermarket"]',
  'https://www.smiles.ae'
),

-- 5. ADCB TouchPoints
(
  'adcb-touchpoints',
  'ADCB TouchPoints',
  'نقاط أبوظبي التجاري',
  'bank',
  1,
  0.025,
  '{"type":"rolling","months":36,"notes":"Points expire 3 years after earning date"}',
  '["etihad-guest"]',
  '["ADNOC","Spinneys","Tim Hortons","Fitness First","Carrefour","LuLu Hypermarket"]',
  'https://www.adcb.com/touchpoints'
),

-- 6. Emirates NBD Plus
(
  'enbd-plus',
  'Emirates NBD Plus',
  'الإمارات NBD بلس',
  'bank',
  1,
  0.02,
  '{"type":"rolling","months":24,"notes":"Points expire 24 months from the date of earning"}',
  '["skywards"]',
  '["Spinneys","Waitrose","Fitness First","Reel Cinemas","ENBD ATMs"]',
  'https://www.emiratesnbd.com/enbd-plus'
),

-- 7. Mashreq Salaam
(
  'mashreq-salaam',
  'Mashreq Salaam',
  'مشرق سلام',
  'bank',
  1,
  0.02,
  '{"type":"calendar_year","notes":"Points expire at the end of the calendar year they are earned in"}',
  '["skywards","smiles"]',
  '["Carrefour","ADNOC","Starbucks","Marriott Hotels","Hilton Hotels"]',
  'https://www.mashreq.com/salaam'
),

-- 8. FAB Rewards
(
  'fab-rewards',
  'FAB Rewards',
  'مكافآت بنك أبوظبي الأول',
  'bank',
  1,
  0.025,
  '{"type":"rolling","months":24,"notes":"Points expire 2 years from date of earning"}',
  '["etihad-guest","skywards"]',
  '["ADNOC","Lulu Hypermarket","Carrefour","Etisalat","Cinema City"]',
  'https://www.bankfab.com/rewards'
),

-- 9. HSBC Rewards UAE
(
  'hsbc-rewards',
  'HSBC Rewards UAE',
  'مكافآت HSBC الإمارات',
  'bank',
  1,
  0.02,
  '{"type":"rolling","months":36,"notes":"Points are valid for 3 years from the date of earning"}',
  '["skywards","marriott-bonvoy"]',
  '["Spinneys","Carrefour","BP","Shell","Starbucks","Pizza Express"]',
  'https://www.hsbc.ae/rewards'
),

-- 10. U By Emaar
(
  'u-emaar',
  'U By Emaar',
  'يو بـ إعمار',
  'retail',
  1,
  0.02,
  '{"type":"rolling","months":24,"notes":"U Points expire 24 months after the last earning or redemption activity"}',
  '["marriott-bonvoy"]',
  '["Emaar Malls","The Dubai Mall","Dubai Hills Mall","Address Hotels","Palace Hotels","Armani Hotel","Vida Hotels","Rove Hotels","Carrefour (Emaar Malls)"]',
  'https://www.ubyemaar.com'
),

-- 11. The Entertainer
(
  'entertainer',
  'The Entertainer',
  'ذا إنترتينر',
  'entertainment',
  0,
  0,
  '{"type":"annual","notes":"Voucher book valid for one calendar year; unused 2-for-1 offers expire at year end"}',
  '[]',
  '["Hundreds of restaurants","Spas","Hotels","Leisure attractions across UAE"]',
  'https://www.theentertainerme.com'
),

-- 12. Fazaa Programme
(
  'fazaa',
  'Fazaa Programme',
  'برنامج فزعة',
  'gov',
  0,
  0,
  '{"type":"no_expiry","notes":"Fazaa discounts do not expire; card renewed annually"}',
  '[]',
  '["ADNOC","LuLu Hypermarket","Sharaf DG","Etisalat","du","RTA","Emaar"]',
  'https://www.fazaa.ae'
),

-- 13. Esaad Card
(
  'esaad',
  'Esaad Card',
  'بطاقة إسعاد',
  'gov',
  0,
  0,
  '{"type":"no_expiry","notes":"Annual card renewal required; discounts valid as long as card is active"}',
  '[]',
  '["Carrefour","IKEA","Cinemas","Hospitals","Hotels","Restaurants across Abu Dhabi"]',
  'https://www.esaad.ae'
),

-- 14. Privilee
(
  'privilee',
  'Privilee',
  'بريفيلي',
  'fitness',
  0,
  0,
  '{"type":"subscription","notes":"Annual membership; access to 800+ fitness, beach and pool venues"}',
  '[]',
  '["Fitness First","GymNation","Five Hotels","W Hotel","Atlantis","Rixos","Crowne Plaza"]',
  'https://www.privilee.ae'
),

-- 15. Marriott Bonvoy
(
  'marriott-bonvoy',
  'Marriott Bonvoy',
  'ماريوت بونفوي',
  'hotel',
  0,
  0.008,
  '{"type":"activity_based","months":24,"notes":"Points expire after 24 months of account inactivity"}',
  '["skywards","etihad-guest","united-mileageplus","chase-ultimate-rewards"]',
  '["JW Marriott","W Hotels","The Ritz-Carlton","Sheraton","Westin","Le Meridien","Aloft","Courtyard"]',
  'https://www.marriott.com/bonvoy'
),

-- 16. Hilton Honors
(
  'hilton-honors',
  'Hilton Honors',
  'هيلتون أونرز',
  'hotel',
  0,
  0.005,
  '{"type":"activity_based","months":24,"notes":"Points expire after 24 months of no qualifying activity"}',
  '["american-express-mr","lyft"]',
  '["Conrad","Waldorf Astoria","DoubleTree","Hilton Garden Inn","Hampton Inn","Curio Collection"]',
  'https://www.hilton.com/honors'
),

-- 17. Accor ALL
(
  'accor-all',
  'Accor ALL',
  'أكور ALL',
  'hotel',
  0,
  0.01,
  '{"type":"activity_based","months":12,"notes":"Points expire 12 months after earning if no stay activity"}',
  '["etihad-guest","qatar-privilege-club"]',
  '["Sofitel","Fairmont","Pullman","Novotel","Mercure","ibis","Raffles","Orient Express"]',
  'https://all.accor.com'
),

-- 18. IHG One Rewards
(
  'ihg-one',
  'IHG One Rewards',
  'IHG ون ريواردز',
  'hotel',
  0,
  0.006,
  '{"type":"activity_based","months":12,"notes":"Points expire after 12 months of account inactivity"}',
  '["chase-ultimate-rewards","avios"]',
  '["InterContinental","Kimpton","Crowne Plaza","Holiday Inn","voco","Regent","Six Senses"]',
  'https://www.ihg.com/onerewards'
)

ON CONFLICT (slug) DO NOTHING;

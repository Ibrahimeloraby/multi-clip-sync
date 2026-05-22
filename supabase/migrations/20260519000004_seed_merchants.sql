-- =============================================================================
-- LoyaltyOne UAE: Seed — 50 Key UAE Merchants
-- Migration: 20260519000004_seed_merchants.sql
-- =============================================================================

INSERT INTO merchants (
  slug, display_name_en, display_name_ar,
  category, is_verified, location_data
) VALUES

-- 1. Carrefour
(
  'carrefour',
  'Carrefour',
  'كارفور',
  ARRAY['supermarket','grocery','retail'],
  true,
  '{"chain":"Majid Al Futtaim Retail","branches":[{"name":"Carrefour Dubai Mall","lat":25.1972,"lng":55.2744},{"name":"Carrefour Deira City Centre","lat":25.2523,"lng":55.3307}]}'
),

-- 2. Spinneys
(
  'spinneys',
  'Spinneys',
  'سبينيز',
  ARRAY['supermarket','grocery'],
  true,
  '{"chain":"Spinneys","branches":[{"name":"Spinneys Jumeirah","lat":25.2048,"lng":55.2483},{"name":"Spinneys Greens","lat":25.0761,"lng":55.1682}]}'
),

-- 3. ADNOC Distribution
(
  'adnoc',
  'ADNOC Distribution',
  'توزيع أدنوك',
  ARRAY['fuel','convenience'],
  true,
  '{"chain":"ADNOC Distribution","branches":[{"name":"ADNOC Sheikh Zayed Road","lat":25.1875,"lng":55.2589},{"name":"ADNOC Khalifa City","lat":24.4187,"lng":54.6215}]}'
),

-- 4. Starbucks
(
  'starbucks',
  'Starbucks',
  'ستاربكس',
  ARRAY['cafe','coffee'],
  true,
  '{"chain":"Starbucks UAE","branches":[{"name":"Starbucks Dubai Mall","lat":25.1972,"lng":55.2744},{"name":"Starbucks Mall of Emirates","lat":25.1182,"lng":55.2004}]}'
),

-- 5. Tim Hortons
(
  'tim-hortons',
  'Tim Hortons',
  'تيم هورتنز',
  ARRAY['cafe','coffee','fastfood'],
  true,
  '{"chain":"Tim Hortons UAE","branches":[{"name":"Tim Hortons JBR","lat":25.0766,"lng":55.1375},{"name":"Tim Hortons Al Reem Island","lat":24.5049,"lng":54.4102}]}'
),

-- 6. VOX Cinemas
(
  'vox-cinemas',
  'VOX Cinemas',
  'سينما فوكس',
  ARRAY['entertainment','cinema'],
  true,
  '{"chain":"Majid Al Futtaim Cinemas","branches":[{"name":"VOX Cinemas Mall of Emirates","lat":25.1182,"lng":55.2004},{"name":"VOX Cinemas City Centre Mirdif","lat":25.2152,"lng":55.4072}]}'
),

-- 7. LuLu Hypermarket
(
  'lulu-hypermarket',
  'LuLu Hypermarket',
  'هايبر ماركت لولو',
  ARRAY['supermarket','grocery','retail'],
  true,
  '{"chain":"LuLu Group International","branches":[{"name":"LuLu Al Barsha","lat":25.1099,"lng":55.2023},{"name":"LuLu Abu Dhabi Khalidiyah","lat":24.4780,"lng":54.3594}]}'
),

-- 8. IKEA UAE
(
  'ikea',
  'IKEA UAE',
  'إيكيا الإمارات',
  ARRAY['furniture','retail','home'],
  true,
  '{"chain":"Al-Futtaim IKEA","branches":[{"name":"IKEA Festival City","lat":25.2238,"lng":55.3613},{"name":"IKEA Yas Island","lat":24.4898,"lng":54.6076}]}'
),

-- 9. McDonald's UAE
(
  'mcdonalds',
  "McDonald's UAE",
  'ماكدونالدز',
  ARRAY['fastfood','restaurant'],
  true,
  '{"chain":"McDonald'\''s UAE","branches":[{"name":"McDonald'\''s JBR Walk","lat":25.0766,"lng":55.1375},{"name":"McDonald'\''s Corniche Abu Dhabi","lat":24.4801,"lng":54.3551}]}'
),

-- 10. KFC UAE
(
  'kfc',
  'KFC UAE',
  'كنتاكي',
  ARRAY['fastfood','restaurant'],
  true,
  '{"chain":"KFC UAE","branches":[{"name":"KFC Dubai Marina","lat":25.0805,"lng":55.1403},{"name":"KFC Al Wahda Mall","lat":24.4780,"lng":54.3692}]}'
),

-- 11. Pizza Hut UAE
(
  'pizza-hut',
  'Pizza Hut UAE',
  'بيتزا هت',
  ARRAY['fastfood','restaurant'],
  true,
  '{"chain":"Pizza Hut UAE","branches":[{"name":"Pizza Hut Deira","lat":25.2698,"lng":55.3095},{"name":"Pizza Hut Mushrif Mall","lat":24.4662,"lng":54.4288}]}'
),

-- 12. Subway UAE
(
  'subway',
  'Subway UAE',
  'سبوي',
  ARRAY['fastfood','restaurant'],
  true,
  '{"chain":"Subway UAE","branches":[{"name":"Subway Business Bay","lat":25.1829,"lng":55.2628},{"name":"Subway Ruwais Mall","lat":23.5455,"lng":52.7297}]}'
),

-- 13. Fitness First UAE
(
  'fitness-first',
  'Fitness First UAE',
  'فيتنس فيرست',
  ARRAY['fitness','gym'],
  true,
  '{"chain":"Fitness First UAE","branches":[{"name":"Fitness First JLT","lat":25.0671,"lng":55.1432},{"name":"Fitness First Al Reem Island","lat":24.5049,"lng":54.4102}]}'
),

-- 14. GymNation
(
  'gymnation',
  'GymNation',
  'جيم نيشن',
  ARRAY['fitness','gym'],
  true,
  '{"chain":"GymNation","branches":[{"name":"GymNation Al Quoz","lat":25.1305,"lng":55.2181},{"name":"GymNation Abu Dhabi Al Mushrif","lat":24.4662,"lng":54.4288}]}'
),

-- 15. Sharaf DG
(
  'sharaf-dg',
  'Sharaf DG',
  'شرف دي جي',
  ARRAY['electronics','retail'],
  true,
  '{"chain":"Sharaf DG","branches":[{"name":"Sharaf DG Dubai Mall","lat":25.1972,"lng":55.2744},{"name":"Sharaf DG Dalma Mall","lat":24.3984,"lng":54.5277}]}'
),

-- 16. Jumbo Electronics
(
  'jumbo-electronics',
  'Jumbo Electronics',
  'جمبو للإلكترونيات',
  ARRAY['electronics','retail'],
  true,
  '{"chain":"Jumbo Electronics","branches":[{"name":"Jumbo Electronics Mall of Emirates","lat":25.1182,"lng":55.2004},{"name":"Jumbo Electronics Yas Mall","lat":24.4898,"lng":54.6076}]}'
),

-- 17. Noon.com (pickup)
(
  'noon',
  'Noon',
  'نون',
  ARRAY['ecommerce','retail'],
  true,
  '{"chain":"Noon","branches":[{"name":"Noon Express Hub Dubai","lat":25.1305,"lng":55.2181},{"name":"Noon Hub Abu Dhabi","lat":24.4539,"lng":54.3773}]}'
),

-- 18. Amazon.ae
(
  'amazon-ae',
  'Amazon.ae',
  'أمازون الإمارات',
  ARRAY['ecommerce','retail'],
  true,
  '{"chain":"Amazon","branches":[{"name":"Amazon Delivery Hub Jebel Ali","lat":24.9964,"lng":55.0609},{"name":"Amazon Delivery Hub Abu Dhabi","lat":24.4539,"lng":54.3773}]}'
),

-- 19. Emaar Malls
(
  'emaar-malls',
  'Emaar Malls',
  'إعمار للمراكز التجارية',
  ARRAY['mall','retail'],
  true,
  '{"chain":"Emaar Malls","branches":[{"name":"The Dubai Mall","lat":25.1972,"lng":55.2744},{"name":"Dubai Hills Mall","lat":25.1007,"lng":55.2330}]}'
),

-- 20. Majid Al Futtaim Malls
(
  'city-centre-malls',
  'City Centre Malls by MAF',
  'سيتي سنتر ماجد الفطيم',
  ARRAY['mall','retail'],
  true,
  '{"chain":"Majid Al Futtaim","branches":[{"name":"City Centre Deira","lat":25.2523,"lng":55.3307},{"name":"City Centre Mirdif","lat":25.2152,"lng":55.4072}]}'
),

-- 21. Address Hotels
(
  'address-hotels',
  'Address Hotels + Resorts',
  'فنادق ومنتجعات أدريس',
  ARRAY['hotel','restaurant'],
  true,
  '{"chain":"Emaar Hospitality","branches":[{"name":"Address Downtown","lat":25.1921,"lng":55.2769},{"name":"Address Beach Resort","lat":25.0854,"lng":55.1426}]}'
),

-- 22. Vida Hotels
(
  'vida-hotels',
  'Vida Hotels and Resorts',
  'فنادق ومنتجعات فيدا',
  ARRAY['hotel','restaurant'],
  true,
  '{"chain":"Emaar Hospitality","branches":[{"name":"Vida Downtown Dubai","lat":25.1929,"lng":55.2742},{"name":"Vida Beach Resort Marjan Island","lat":25.6182,"lng":55.9400}]}'
),

-- 23. Rove Hotels
(
  'rove-hotels',
  'Rove Hotels',
  'روف هوتيلز',
  ARRAY['hotel'],
  true,
  '{"chain":"Emaar Hospitality","branches":[{"name":"Rove Downtown","lat":25.1882,"lng":55.2730},{"name":"Rove Healthcare City","lat":25.2312,"lng":55.3271}]}'
),

-- 24. Atlantis The Palm
(
  'atlantis-the-palm',
  'Atlantis The Palm',
  'أتلانتس النخلة',
  ARRAY['hotel','entertainment','restaurant'],
  true,
  '{"chain":"Atlantis Resorts","branches":[{"name":"Atlantis The Palm Dubai","lat":25.1304,"lng":55.1171}]}'
),

-- 25. Dubai Duty Free
(
  'dubai-duty-free',
  'Dubai Duty Free',
  'دبي للتسوق الحر',
  ARRAY['retail','airport'],
  true,
  '{"chain":"Dubai Duty Free","branches":[{"name":"DDF Dubai International Terminal 3","lat":25.2532,"lng":55.3657},{"name":"DDF Al Maktoum International","lat":24.8960,"lng":55.1617}]}'
),

-- 26. Emirates Holidays / dnata Travel
(
  'dnata-travel',
  'dnata Travel',
  'دناتا ترافيل',
  ARRAY['travel','airline'],
  true,
  '{"chain":"Emirates Group","branches":[{"name":"dnata Travel Dubai Mall","lat":25.1972,"lng":55.2744},{"name":"dnata Travel Abu Dhabi World Trade Centre","lat":24.4907,"lng":54.4108}]}'
),

-- 27. Etisalat / e& Stores
(
  'etisalat-stores',
  'e& (Etisalat) Stores',
  'إتصالات e&',
  ARRAY['telco','retail'],
  true,
  '{"chain":"e& (formerly Etisalat)","branches":[{"name":"Etisalat Store Dubai Mall","lat":25.1972,"lng":55.2744},{"name":"Etisalat Store Al Ain Mall","lat":24.2116,"lng":55.7592}]}'
),

-- 28. du Stores
(
  'du-stores',
  'du Stores',
  'دو',
  ARRAY['telco','retail'],
  true,
  '{"chain":"du (EITC)","branches":[{"name":"du Store Mall of Emirates","lat":25.1182,"lng":55.2004},{"name":"du Store Yas Mall","lat":24.4898,"lng":54.6076}]}'
),

-- 29. Waitrose UAE
(
  'waitrose',
  'Waitrose UAE',
  'ويتروز',
  ARRAY['supermarket','grocery'],
  true,
  '{"chain":"Al-Futtaim Waitrose","branches":[{"name":"Waitrose Dubai Marina Mall","lat":25.0788,"lng":55.1434},{"name":"Waitrose Wafi Mall","lat":25.2301,"lng":55.3178}]}'
),

-- 30. Grandiose Supermarket
(
  'grandiose',
  'Grandiose Supermarket',
  'جرانديوز',
  ARRAY['supermarket','grocery'],
  true,
  '{"chain":"Grandiose","branches":[{"name":"Grandiose JBR","lat":25.0773,"lng":55.1363},{"name":"Grandiose Jumeirah Village Circle","lat":25.0581,"lng":55.2126}]}'
),

-- 31. The Cheesecake Factory
(
  'cheesecake-factory',
  'The Cheesecake Factory',
  'ذا تشيزكيك فاكتوري',
  ARRAY['restaurant'],
  true,
  '{"chain":"The Cheesecake Factory UAE","branches":[{"name":"Cheesecake Factory Dubai Mall","lat":25.1972,"lng":55.2744},{"name":"Cheesecake Factory Abu Dhabi Mall","lat":24.4991,"lng":54.3926}]}'
),

-- 32. PF Chang's UAE
(
  'pf-changs',
  "PF Chang's UAE",
  'بي إف تشانغز',
  ARRAY['restaurant'],
  true,
  '{"chain":"PF Chang'\''s UAE","branches":[{"name":"PF Chang'\''s Mall of Emirates","lat":25.1182,"lng":55.2004},{"name":"PF Chang'\''s City Walk","lat":25.2050,"lng":55.2437}]}'
),

-- 33. Shake Shack UAE
(
  'shake-shack',
  'Shake Shack UAE',
  'شيك شاك',
  ARRAY['fastfood','restaurant'],
  true,
  '{"chain":"Shake Shack UAE","branches":[{"name":"Shake Shack Dubai Mall","lat":25.1972,"lng":55.2744},{"name":"Shake Shack Yas Mall","lat":24.4898,"lng":54.6076}]}'
),

-- 34. Five Guys UAE
(
  'five-guys',
  'Five Guys UAE',
  'فايف جايز',
  ARRAY['fastfood','restaurant'],
  true,
  '{"chain":"Five Guys UAE","branches":[{"name":"Five Guys Dubai Marina","lat":25.0805,"lng":55.1403},{"name":"Five Guys Al Maryah Island","lat":24.5009,"lng":54.3980}]}'
),

-- 35. Costa Coffee UAE
(
  'costa-coffee',
  'Costa Coffee UAE',
  'كوستا كافيه',
  ARRAY['cafe','coffee'],
  true,
  '{"chain":"Alshaya Costa Coffee","branches":[{"name":"Costa Coffee City Centre Deira","lat":25.2523,"lng":55.3307},{"name":"Costa Coffee Abu Dhabi Corniche","lat":24.4801,"lng":54.3551}]}'
),

-- 36. Second Cup Coffee
(
  'second-cup',
  'Second Cup Coffee',
  'سيكند كاب',
  ARRAY['cafe','coffee'],
  true,
  '{"chain":"Second Cup UAE","branches":[{"name":"Second Cup JBR","lat":25.0766,"lng":55.1375},{"name":"Second Cup Khalidiyah","lat":24.4780,"lng":54.3594}]}'
),

-- 37. Apparel Group (outlet stores)
(
  'apparel-group',
  'Apparel Group',
  'أباريل جروب',
  ARRAY['fashion','retail'],
  true,
  '{"chain":"Apparel Group","brands":["Tommy Hilfiger","Calvin Klein","Skechers","Nine West","Aldo","La Senza"],"branches":[{"name":"Apparel Group Dubai Festival City","lat":25.2238,"lng":55.3613}]}'
),

-- 38. Alshaya Group Stores
(
  'alshaya',
  'Alshaya Group',
  'مجموعة الشايع',
  ARRAY['retail','fashion','restaurant'],
  true,
  '{"chain":"Alshaya Group","brands":["H&M","Mothercare","Debenhams","Starbucks","Costa","Cheesecake Factory"],"branches":[{"name":"Alshaya H&M Mall of Emirates","lat":25.1182,"lng":55.2004}]}'
),

-- 39. H&M UAE
(
  'hm',
  'H&M UAE',
  'إتش آند إم',
  ARRAY['fashion','retail'],
  true,
  '{"chain":"Alshaya H&M","branches":[{"name":"H&M The Dubai Mall","lat":25.1972,"lng":55.2744},{"name":"H&M Yas Mall","lat":24.4898,"lng":54.6076}]}'
),

-- 40. Zara UAE
(
  'zara',
  'Zara UAE',
  'زارا',
  ARRAY['fashion','retail'],
  true,
  '{"chain":"Inditex UAE","branches":[{"name":"Zara Dubai Mall","lat":25.1972,"lng":55.2744},{"name":"Zara Marina Mall Abu Dhabi","lat":24.4618,"lng":54.3178}]}'
),

-- 41. Sephora UAE
(
  'sephora',
  'Sephora UAE',
  'سيفورا',
  ARRAY['beauty','retail'],
  true,
  '{"chain":"LVMH Sephora UAE","branches":[{"name":"Sephora Mall of Emirates","lat":25.1182,"lng":55.2004},{"name":"Sephora Abu Dhabi Galleria","lat":24.5009,"lng":54.3980}]}'
),

-- 42. Boots UAE
(
  'boots',
  'Boots UAE',
  'بوتس',
  ARRAY['pharmacy','beauty','retail'],
  true,
  '{"chain":"Boots UAE","branches":[{"name":"Boots Dubai Marina Mall","lat":25.0788,"lng":55.1434},{"name":"Boots Khalifa City","lat":24.4187,"lng":54.6215}]}'
),

-- 43. Life Pharmacy
(
  'life-pharmacy',
  'Life Pharmacy',
  'لايف فارماسي',
  ARRAY['pharmacy'],
  true,
  '{"chain":"Life Pharmacy","branches":[{"name":"Life Pharmacy JBR","lat":25.0766,"lng":55.1375},{"name":"Life Pharmacy Al Reem Island","lat":24.5049,"lng":54.4102}]}'
),

-- 44. Aster Pharmacy
(
  'aster-pharmacy',
  'Aster Pharmacy',
  'آستر فارماسي',
  ARRAY['pharmacy'],
  true,
  '{"chain":"Aster DM Healthcare","branches":[{"name":"Aster Pharmacy Barsha Heights","lat":25.1099,"lng":55.1763},{"name":"Aster Pharmacy Abu Dhabi Madinat Zayed","lat":24.4780,"lng":54.3594}]}'
),

-- 45. Ski Dubai / Snow Abu Dhabi
(
  'ski-dubai',
  'Ski Dubai',
  'سكي دبي',
  ARRAY['entertainment','leisure'],
  true,
  '{"chain":"Majid Al Futtaim Leisure","branches":[{"name":"Ski Dubai Mall of Emirates","lat":25.1182,"lng":55.2004}]}'
),

-- 46. IMG Worlds of Adventure
(
  'img-worlds',
  'IMG Worlds of Adventure',
  'آي إم جي عوالم المغامرة',
  ARRAY['entertainment','theme_park'],
  true,
  '{"chain":"IMG","branches":[{"name":"IMG Worlds City of Arabia Dubai","lat":25.2028,"lng":55.3813}]}'
),

-- 47. Dubai Parks and Resorts
(
  'dubai-parks',
  'Dubai Parks and Resorts',
  'دبي باركس آند ريزورتس',
  ARRAY['entertainment','theme_park'],
  true,
  '{"chain":"Meraas","branches":[{"name":"Motiongate Dubai","lat":24.9196,"lng":55.0082},{"name":"Legoland Dubai","lat":24.9196,"lng":55.0082}]}'
),

-- 48. Reel Cinemas
(
  'reel-cinemas',
  'Reel Cinemas',
  'ريل سينما',
  ARRAY['entertainment','cinema'],
  true,
  '{"chain":"Al-Futtaim Reel Cinemas","branches":[{"name":"Reel Cinemas Dubai Marina Mall","lat":25.0788,"lng":55.1434},{"name":"Reel Cinemas World Trade Centre","lat":25.2196,"lng":55.2805}]}'
),

-- 49. Cinépolis UAE
(
  'cinepolis',
  'Cinépolis UAE',
  'سينيبوليس',
  ARRAY['entertainment','cinema'],
  true,
  '{"chain":"Cinépolis UAE","branches":[{"name":"Cinépolis Mirdif City Centre","lat":25.2152,"lng":55.4072},{"name":"Cinépolis Yas Mall","lat":24.4898,"lng":54.6076}]}'
),

-- 50. Al Meera (Qatar chain with UAE presence)
(
  'al-meera',
  'Al Meera Community Stores',
  'الميرة للمجتمع',
  ARRAY['supermarket','grocery'],
  true,
  '{"chain":"Al Meera","branches":[{"name":"Al Meera Doha (flagship)","lat":25.2854,"lng":51.5310}]}'
)

ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- LoyaltyOne UAE: Seed — 50+ Canonical Official Merchant Rules
-- Migration: 20260519000005_seed_rules.sql
-- All seeded rules: source='official', status='trusted',
--                   confidence_score=95, confirmations=10
-- =============================================================================

-- Helper: resolve merchant & program UUIDs by slug at insert time
-- We use subqueries to keep the seed portable across environments.

INSERT INTO merchant_rules (
  merchant_id, program_id,
  rule_type, earn_rate, multiplier, discount_pct, cashback_pct,
  applies_to_categories, min_spend, max_spend, days_of_week,
  source, status, upvotes, confirmations, confidence_score,
  description_text
)
SELECT
  m.id, p.id,
  v.rule_type, v.earn_rate, v.multiplier, v.discount_pct, v.cashback_pct,
  v.applies_to_categories, v.min_spend, v.max_spend, v.days_of_week,
  'official', 'trusted', 25, 10, 95,
  v.description_text
FROM (VALUES

  -- -------------------------------------------------------------------------
  -- CARREFOUR rules
  -- -------------------------------------------------------------------------
  ('carrefour',  'share-maf',        'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['grocery','retail'],        0,    NULL,  ARRAY[]::int[],    'Earn 1 Share point per 1 AED spent at Carrefour'),
  ('carrefour',  'u-emaar',          'earn',       0.5,    NULL, NULL,  NULL,  ARRAY['grocery','retail'],        0,    NULL,  ARRAY[]::int[],    'Earn 0.5 U Points per 1 AED at Carrefour in Emaar Malls'),
  ('carrefour',  'smiles',           'earn',       0.5,    NULL, NULL,  NULL,  ARRAY['grocery'],                 0,    NULL,  ARRAY[]::int[],    'Earn 0.5 Smiles points per AED at Carrefour with e& SIM'),
  ('carrefour',  'mashreq-salaam',   'multiplier', NULL,   2.0,  NULL,  NULL,  ARRAY['grocery'],                 50,   NULL,  ARRAY[]::int[],    '2x Salaam points on Carrefour spend over AED 50'),
  ('carrefour',  'enbd-plus',        'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['grocery','retail'],        0,    NULL,  ARRAY[]::int[],    'Earn 1 ENBD Plus point per AED at Carrefour'),
  ('carrefour',  'fab-rewards',      'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['grocery'],                 0,    NULL,  ARRAY[]::int[],    'Earn 1 FAB Reward point per AED at Carrefour'),
  ('carrefour',  'hsbc-rewards',     'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['grocery'],                 0,    NULL,  ARRAY[]::int[],    'Earn 1 HSBC Reward point per AED at Carrefour'),

  -- -------------------------------------------------------------------------
  -- ADNOC rules
  -- -------------------------------------------------------------------------
  ('adnoc',      'fab-rewards',      'multiplier', NULL,   3.0,  NULL,  NULL,  ARRAY['fuel'],                    0,    NULL,  ARRAY[]::int[],    '3x FAB Rewards points on fuel at ADNOC stations'),
  ('adnoc',      'adcb-touchpoints', 'multiplier', NULL,   2.0,  NULL,  NULL,  ARRAY['fuel'],                    0,    NULL,  ARRAY[]::int[],    '2x ADCB TouchPoints on fuel at ADNOC stations'),
  ('adnoc',      'smiles',           'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['fuel','convenience'],      0,    NULL,  ARRAY[]::int[],    'Earn 1 Smiles point per AED at ADNOC with e& SIM'),
  ('adnoc',      'etihad-guest',     'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['fuel'],                    0,    NULL,  ARRAY[]::int[],    'Earn 1 Etihad Guest mile per AED at ADNOC'),
  ('adnoc',      'mashreq-salaam',   'multiplier', NULL,   2.0,  NULL,  NULL,  ARRAY['fuel'],                    0,    NULL,  ARRAY[]::int[],    '2x Salaam points on fuel at ADNOC'),
  ('adnoc',      'hsbc-rewards',     'multiplier', NULL,   2.0,  NULL,  NULL,  ARRAY['fuel'],                    0,    NULL,  ARRAY[]::int[],    '2x HSBC Rewards on fuel at ADNOC'),

  -- -------------------------------------------------------------------------
  -- SPINNEYS rules
  -- -------------------------------------------------------------------------
  ('spinneys',   'enbd-plus',        'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['grocery'],                 0,    NULL,  ARRAY[]::int[],    'Earn 1 ENBD Plus point per AED at Spinneys'),
  ('spinneys',   'share-maf',        'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['grocery'],                 0,    NULL,  ARRAY[]::int[],    'Earn 1 Share point per AED at Spinneys'),
  ('spinneys',   'adcb-touchpoints', 'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['grocery'],                 0,    NULL,  ARRAY[]::int[],    'Earn 1 ADCB TouchPoint per AED at Spinneys'),
  ('spinneys',   'hsbc-rewards',     'multiplier', NULL,   2.0,  NULL,  NULL,  ARRAY['grocery'],                 100,  NULL,  ARRAY[]::int[],    '2x HSBC Rewards at Spinneys on spends over AED 100'),

  -- -------------------------------------------------------------------------
  -- STARBUCKS rules
  -- -------------------------------------------------------------------------
  ('starbucks',  'smiles',           'multiplier', NULL,   2.0,  NULL,  NULL,  ARRAY['cafe','coffee'],           0,    NULL,  ARRAY[2]::int[],   '2x Smiles points at Starbucks on Tuesdays'),
  ('starbucks',  'smiles',           'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['cafe','coffee'],           0,    NULL,  ARRAY[]::int[],    'Earn 1 Smiles point per AED at Starbucks'),
  ('starbucks',  'share-maf',        'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['cafe','coffee'],           0,    NULL,  ARRAY[]::int[],    'Earn 1 Share point per AED at Starbucks in MAF malls'),
  ('starbucks',  'adcb-touchpoints', 'cashback',   NULL,   NULL, NULL,  5.0,   ARRAY['cafe'],                    0,    NULL,  ARRAY[]::int[],    '5% cashback at Starbucks with ADCB Touchpoints card'),
  ('starbucks',  'mashreq-salaam',   'multiplier', NULL,   2.0,  NULL,  NULL,  ARRAY['cafe'],                    0,    NULL,  ARRAY[]::int[],    '2x Salaam points at Starbucks'),

  -- -------------------------------------------------------------------------
  -- TIM HORTONS rules
  -- -------------------------------------------------------------------------
  ('tim-hortons','adcb-touchpoints', 'cashback',   NULL,   NULL, NULL,  5.0,   ARRAY['cafe','coffee'],           0,    NULL,  ARRAY[6,0]::int[], '5% cashback at Tim Hortons on weekends with ADCB card'),
  ('tim-hortons','adcb-touchpoints', 'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['cafe','coffee'],           0,    NULL,  ARRAY[]::int[],    'Earn 1 ADCB TouchPoint per AED at Tim Hortons'),
  ('tim-hortons','smiles',           'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['cafe','coffee'],           0,    NULL,  ARRAY[]::int[],    'Earn 1 Smiles point per AED at Tim Hortons'),
  ('tim-hortons','fab-rewards',      'cashback',   NULL,   NULL, NULL,  3.0,   ARRAY['cafe'],                    0,    NULL,  ARRAY[]::int[],    '3% cashback at Tim Hortons with FAB credit card'),

  -- -------------------------------------------------------------------------
  -- LULU HYPERMARKET rules
  -- -------------------------------------------------------------------------
  ('lulu-hypermarket','fab-rewards', 'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['grocery','retail'],        0,    NULL,  ARRAY[]::int[],    'Earn 1 FAB Reward per AED at LuLu Hypermarket'),
  ('lulu-hypermarket','adcb-touchpoints','multiplier',NULL, 2.0, NULL,  NULL,  ARRAY['grocery'],                 0,    NULL,  ARRAY[]::int[],    '2x ADCB TouchPoints at LuLu Hypermarket'),
  ('lulu-hypermarket','smiles',      'earn',       0.5,    NULL, NULL,  NULL,  ARRAY['grocery'],                 0,    NULL,  ARRAY[]::int[],    'Earn 0.5 Smiles points per AED at LuLu'),
  ('lulu-hypermarket','mashreq-salaam','earn',     1.0,    NULL, NULL,  NULL,  ARRAY['grocery'],                 0,    NULL,  ARRAY[]::int[],    'Earn 1 Salaam point per AED at LuLu Hypermarket'),

  -- -------------------------------------------------------------------------
  -- VOX CINEMAS rules
  -- -------------------------------------------------------------------------
  ('vox-cinemas','share-maf',        'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['entertainment','cinema'],  0,    NULL,  ARRAY[]::int[],    'Earn 1 Share point per AED at VOX Cinemas'),
  ('vox-cinemas','smiles',           'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['entertainment'],           0,    NULL,  ARRAY[]::int[],    'Earn 1 Smiles point per AED at VOX Cinemas'),
  ('vox-cinemas','adcb-touchpoints', 'discount',   NULL,   NULL, 10.0,  NULL,  ARRAY['cinema'],                  0,    NULL,  ARRAY[]::int[],    '10% discount on tickets at VOX with ADCB card'),

  -- -------------------------------------------------------------------------
  -- FITNESS FIRST rules
  -- -------------------------------------------------------------------------
  ('fitness-first','enbd-plus',      'cashback',   NULL,   NULL, NULL,  5.0,   ARRAY['fitness'],                 0,    NULL,  ARRAY[]::int[],    '5% cashback on Fitness First membership with ENBD Plus'),
  ('fitness-first','adcb-touchpoints','earn',      2.0,    NULL, NULL,  NULL,  ARRAY['fitness'],                 0,    NULL,  ARRAY[]::int[],    'Earn 2 ADCB TouchPoints per AED at Fitness First'),
  ('fitness-first','privilee',       'discount',   NULL,   NULL, 100.0, NULL,  ARRAY['fitness'],                 0,    NULL,  ARRAY[]::int[],    'Free Fitness First access with Privilee membership'),

  -- -------------------------------------------------------------------------
  -- WAITROSE rules
  -- -------------------------------------------------------------------------
  ('waitrose',   'enbd-plus',        'multiplier', NULL,   2.0,  NULL,  NULL,  ARRAY['grocery'],                 0,    NULL,  ARRAY[]::int[],    '2x ENBD Plus points at Waitrose'),
  ('waitrose',   'hsbc-rewards',     'multiplier', NULL,   2.0,  NULL,  NULL,  ARRAY['grocery'],                 0,    NULL,  ARRAY[]::int[],    '2x HSBC Rewards at Waitrose'),
  ('waitrose',   'adcb-touchpoints', 'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['grocery'],                 0,    NULL,  ARRAY[]::int[],    'Earn 1 ADCB TouchPoint per AED at Waitrose'),

  -- -------------------------------------------------------------------------
  -- IKEA rules
  -- -------------------------------------------------------------------------
  ('ikea',       'share-maf',        'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['furniture','home'],        0,    NULL,  ARRAY[]::int[],    'Earn 1 Share point per AED at IKEA (Al-Futtaim)'),
  ('ikea',       'adcb-touchpoints', 'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['furniture','retail'],      0,    NULL,  ARRAY[]::int[],    'Earn 1 ADCB TouchPoint per AED at IKEA'),
  ('ikea',       'fab-rewards',      'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['furniture'],               0,    NULL,  ARRAY[]::int[],    'Earn 1 FAB Reward per AED at IKEA'),

  -- -------------------------------------------------------------------------
  -- SHARAF DG rules
  -- -------------------------------------------------------------------------
  ('sharaf-dg',  'fab-rewards',      'earn',       2.0,    NULL, NULL,  NULL,  ARRAY['electronics'],             0,    NULL,  ARRAY[]::int[],    'Earn 2 FAB Rewards per AED at Sharaf DG'),
  ('sharaf-dg',  'adcb-touchpoints', 'earn',       2.0,    NULL, NULL,  NULL,  ARRAY['electronics'],             0,    NULL,  ARRAY[]::int[],    'Earn 2 ADCB TouchPoints per AED at Sharaf DG'),
  ('sharaf-dg',  'enbd-plus',        'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['electronics'],             0,    NULL,  ARRAY[]::int[],    'Earn 1 ENBD Plus point per AED at Sharaf DG'),

  -- -------------------------------------------------------------------------
  -- DUBAI DUTY FREE rules
  -- -------------------------------------------------------------------------
  ('dubai-duty-free','skywards',     'earn',       4.0,    NULL, NULL,  NULL,  ARRAY['retail','airport'],        0,    NULL,  ARRAY[]::int[],    'Earn 4 Skywards miles per USD at Dubai Duty Free'),
  ('dubai-duty-free','etihad-guest', 'earn',       3.0,    NULL, NULL,  NULL,  ARRAY['retail','airport'],        0,    NULL,  ARRAY[]::int[],    'Earn 3 Etihad Guest miles per AED at Dubai Duty Free'),

  -- -------------------------------------------------------------------------
  -- ADDRESS HOTELS rules (Emaar)
  -- -------------------------------------------------------------------------
  ('address-hotels','u-emaar',       'earn',       5.0,    NULL, NULL,  NULL,  ARRAY['hotel','restaurant'],      0,    NULL,  ARRAY[]::int[],    'Earn 5 U Points per AED at Address Hotels'),
  ('address-hotels','skywards',      'earn',       2.0,    NULL, NULL,  NULL,  ARRAY['hotel'],                   0,    NULL,  ARRAY[]::int[],    'Earn 2 Skywards miles per AED at Address Hotels'),
  ('address-hotels','marriott-bonvoy','earn',      10.0,   NULL, NULL,  NULL,  ARRAY['hotel'],                   0,    NULL,  ARRAY[]::int[],    'Earn 10 Bonvoy points per USD at Address Hotels (Autograph Collection)'),

  -- -------------------------------------------------------------------------
  -- ENTERTAINER-participating restaurants (generic BOGO rule)
  -- -------------------------------------------------------------------------
  ('cheesecake-factory','entertainer','bogo',      NULL,   NULL, 50.0,  NULL,  ARRAY['restaurant'],              0,    NULL,  ARRAY[]::int[],    '2-for-1 main course at The Cheesecake Factory with The Entertainer'),
  ('pf-changs',  'entertainer',      'bogo',       NULL,   NULL, 50.0,  NULL,  ARRAY['restaurant'],              0,    NULL,  ARRAY[]::int[],    '2-for-1 main course at PF Chang'\''s with The Entertainer'),
  ('five-guys',  'entertainer',      'bogo',       NULL,   NULL, 50.0,  NULL,  ARRAY['restaurant'],              0,    NULL,  ARRAY[]::int[],    '2-for-1 burger at Five Guys with The Entertainer'),

  -- -------------------------------------------------------------------------
  -- COSTA COFFEE rules
  -- -------------------------------------------------------------------------
  ('costa-coffee','adcb-touchpoints','cashback',   NULL,   NULL, NULL,  5.0,   ARRAY['cafe'],                    0,    NULL,  ARRAY[]::int[],    '5% cashback at Costa Coffee with ADCB card'),
  ('costa-coffee','smiles',          'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['cafe'],                    0,    NULL,  ARRAY[]::int[],    'Earn 1 Smiles point per AED at Costa Coffee'),

  -- -------------------------------------------------------------------------
  -- REEL CINEMAS rules
  -- -------------------------------------------------------------------------
  ('reel-cinemas','enbd-plus',       'discount',   NULL,   NULL, 15.0,  NULL,  ARRAY['cinema'],                  0,    NULL,  ARRAY[]::int[],    '15% discount at Reel Cinemas with ENBD Plus'),
  ('reel-cinemas','adcb-touchpoints','earn',       2.0,    NULL, NULL,  NULL,  ARRAY['cinema','entertainment'],  0,    NULL,  ARRAY[]::int[],    'Earn 2 ADCB TouchPoints per AED at Reel Cinemas'),

  -- -------------------------------------------------------------------------
  -- SEPHORA rules
  -- -------------------------------------------------------------------------
  ('sephora',    'share-maf',        'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['beauty'],                  0,    NULL,  ARRAY[]::int[],    'Earn 1 Share point per AED at Sephora in MAF malls'),
  ('sephora',    'hsbc-rewards',     'multiplier', NULL,   2.0,  NULL,  NULL,  ARRAY['beauty'],                  0,    NULL,  ARRAY[]::int[],    '2x HSBC Rewards at Sephora UAE'),

  -- -------------------------------------------------------------------------
  -- ATLANTS THE PALM rules
  -- -------------------------------------------------------------------------
  ('atlantis-the-palm','marriott-bonvoy','earn',   10.0,   NULL, NULL,  NULL,  ARRAY['hotel','entertainment'],   0,    NULL,  ARRAY[]::int[],    'Earn 10 Bonvoy points per USD at Atlantis The Palm'),
  ('atlantis-the-palm','adcb-touchpoints','discount',NULL,NULL,  15.0,  NULL,  ARRAY['entertainment'],           0,    NULL,  ARRAY[]::int[],    '15% discount on Aquaventure tickets with ADCB card'),

  -- -------------------------------------------------------------------------
  -- DNATA TRAVEL rules
  -- -------------------------------------------------------------------------
  ('dnata-travel','skywards',        'earn',       5.0,    NULL, NULL,  NULL,  ARRAY['travel'],                  0,    NULL,  ARRAY[]::int[],    'Earn 5 Skywards miles per AED on Emirates Holidays packages'),
  ('dnata-travel','etihad-guest',    'earn',       3.0,    NULL, NULL,  NULL,  ARRAY['travel'],                  0,    NULL,  ARRAY[]::int[],    'Earn 3 Etihad Guest miles per AED on dnata Travel packages'),

  -- -------------------------------------------------------------------------
  -- GYMNATION rules
  -- -------------------------------------------------------------------------
  ('gymnation',  'smiles',           'cashback',   NULL,   NULL, NULL,  5.0,   ARRAY['fitness'],                 0,    NULL,  ARRAY[]::int[],    '5% cashback on GymNation membership with Smiles'),
  ('gymnation',  'fab-rewards',      'earn',       2.0,    NULL, NULL,  NULL,  ARRAY['fitness'],                 0,    NULL,  ARRAY[]::int[],    'Earn 2 FAB Rewards per AED at GymNation'),
  ('gymnation',  'privilee',         'discount',   NULL,   NULL, 100.0, NULL,  ARRAY['fitness'],                 0,    NULL,  ARRAY[]::int[],    'Free GymNation access with Privilee membership'),

  -- -------------------------------------------------------------------------
  -- SHAKE SHACK rules
  -- -------------------------------------------------------------------------
  ('shake-shack','smiles',           'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['restaurant'],              0,    NULL,  ARRAY[]::int[],    'Earn 1 Smiles point per AED at Shake Shack'),
  ('shake-shack','adcb-touchpoints', 'cashback',   NULL,   NULL, NULL,  5.0,   ARRAY['restaurant'],              0,    NULL,  ARRAY[]::int[],    '5% cashback at Shake Shack with ADCB card'),

  -- -------------------------------------------------------------------------
  -- BOOTS UAE rules
  -- -------------------------------------------------------------------------
  ('boots',      'hsbc-rewards',     'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['pharmacy','beauty'],       0,    NULL,  ARRAY[]::int[],    'Earn 1 HSBC Reward per AED at Boots UAE'),
  ('boots',      'adcb-touchpoints', 'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['pharmacy'],                0,    NULL,  ARRAY[]::int[],    'Earn 1 ADCB TouchPoint per AED at Boots'),

  -- -------------------------------------------------------------------------
  -- H&M UAE rules
  -- -------------------------------------------------------------------------
  ('hm',         'adcb-touchpoints', 'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['fashion'],                 0,    NULL,  ARRAY[]::int[],    'Earn 1 ADCB TouchPoint per AED at H&M'),
  ('hm',         'fab-rewards',      'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['fashion'],                 0,    NULL,  ARRAY[]::int[],    'Earn 1 FAB Reward per AED at H&M UAE'),
  ('hm',         'enbd-plus',        'cashback',   NULL,   NULL, NULL,  3.0,   ARRAY['fashion'],                 0,    NULL,  ARRAY[]::int[],    '3% cashback at H&M with ENBD Plus'),

  -- -------------------------------------------------------------------------
  -- ZARA UAE rules
  -- -------------------------------------------------------------------------
  ('zara',       'adcb-touchpoints', 'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['fashion'],                 0,    NULL,  ARRAY[]::int[],    'Earn 1 ADCB TouchPoint per AED at Zara UAE'),
  ('zara',       'mashreq-salaam',   'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['fashion'],                 0,    NULL,  ARRAY[]::int[],    'Earn 1 Salaam point per AED at Zara'),

  -- -------------------------------------------------------------------------
  -- EMAAR MALLS / U BY EMAAR rules
  -- -------------------------------------------------------------------------
  ('emaar-malls','u-emaar',          'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['mall','retail'],           0,    NULL,  ARRAY[]::int[],    'Earn 1 U Point per AED spent in Emaar Malls'),
  ('emaar-malls','skywards',         'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['mall'],                    0,    NULL,  ARRAY[]::int[],    'Earn 1 Skywards mile per AED in Emaar Malls on select spend'),

  -- -------------------------------------------------------------------------
  -- SKI DUBAI rules
  -- -------------------------------------------------------------------------
  ('ski-dubai',  'share-maf',        'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['entertainment','leisure'], 0,    NULL,  ARRAY[]::int[],    'Earn 1 Share point per AED at Ski Dubai'),
  ('ski-dubai',  'adcb-touchpoints', 'discount',   NULL,   NULL, 10.0,  NULL,  ARRAY['entertainment'],           0,    NULL,  ARRAY[]::int[],    '10% discount on Ski Dubai tickets with ADCB card'),

  -- -------------------------------------------------------------------------
  -- NOON / AMAZON.AE rules
  -- -------------------------------------------------------------------------
  ('noon',       'fab-rewards',      'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['ecommerce'],               0,    NULL,  ARRAY[]::int[],    'Earn 1 FAB Reward per AED on Noon.com'),
  ('amazon-ae',  'adcb-touchpoints', 'earn',       1.0,    NULL, NULL,  NULL,  ARRAY['ecommerce'],               0,    NULL,  ARRAY[]::int[],    'Earn 1 ADCB TouchPoint per AED on Amazon.ae'),

  -- -------------------------------------------------------------------------
  -- ETISALAT STORES rules
  -- -------------------------------------------------------------------------
  ('etisalat-stores','smiles',       'multiplier', NULL,   3.0,  NULL,  NULL,  ARRAY['telco'],                   0,    NULL,  ARRAY[]::int[],    '3x Smiles points on e& store purchases'),
  ('etisalat-stores','adcb-touchpoints','cashback',NULL,   NULL, NULL,  5.0,   ARRAY['telco'],                   0,    NULL,  ARRAY[]::int[],    '5% cashback at e& stores with ADCB card')

) AS v(merchant_slug, program_slug, rule_type, earn_rate, multiplier, discount_pct, cashback_pct, applies_to_categories, min_spend, max_spend, days_of_week, description_text)
JOIN merchants m ON m.slug = v.merchant_slug
JOIN programs  p ON p.slug = v.program_slug
ON CONFLICT DO NOTHING;

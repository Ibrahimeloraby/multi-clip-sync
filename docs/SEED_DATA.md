# LoyaltyOne — Seed Data Reference

All seed data is applied via Supabase migrations in the `20260519000003`–`20260519000006` files.

---

## 18 Seeded Loyalty Programs

| # | Slug | Display Name (EN) | Category | Earn Rate (pts/AED) | Redemption Value (AED/pt) | Expiry Rule |
|---|---|---|---|---|---|---|
| 1 | `share-maf` | Share by Majid Al Futtaim | retail | 1 | 0.02 | Rolling 12 months |
| 2 | `skywards` | Emirates Skywards | airline | 0 (miles, not pts) | 0.05 | Activity 36 months |
| 3 | `etihad-guest` | Etihad Guest | airline | 0 (miles) | 0.045 | Rolling 18 months |
| 4 | `smiles` | Smiles by e& | telco | 1 | 0.01 | Calendar year (31 Dec) |
| 5 | `adcb-touchpoints` | ADCB TouchPoints | bank | 1 | 0.025 | Rolling 36 months |
| 6 | `enbd-plus` | Emirates NBD Plus | bank | 1 | 0.02 | Rolling 24 months |
| 7 | `mashreq-salaam` | Mashreq Salaam | bank | 1 | 0.02 | Calendar year |
| 8 | `fab-rewards` | FAB Rewards | bank | 1 | 0.025 | Rolling 24 months |
| 9 | `hsbc-rewards` | HSBC Rewards UAE | bank | 1 | 0.02 | Rolling 36 months |
| 10 | `u-emaar` | U By Emaar | retail | 1 | 0.02 | Activity 24 months |
| 11 | `entertainer` | The Entertainer | entertainment | 0 (BOGO) | 0 (voucher) | Annual |
| 12 | `fazaa` | Fazaa Programme | gov | 0 (discount) | 0 (discount) | No expiry |
| 13 | `esaad` | Esaad Card | gov | 0 (discount) | 0 (discount) | Annual renewal |
| 14 | `privilee` | Privilee | fitness | 0 (access) | 0 (membership) | Subscription |
| 15 | `marriott-bonvoy` | Marriott Bonvoy | hotel | 0 (USD basis) | 0.008 | Activity 24 months |
| 16 | `hilton-honors` | Hilton Honors | hotel | 0 (USD basis) | 0.005 | Activity 24 months |
| 17 | `accor-all` | Accor ALL | hotel | 0 (stay basis) | 0.01 | Activity 12 months |
| 18 | `ihg-one` | IHG One Rewards | hotel | 0 (stay basis) | 0.006 | Activity 12 months |

**Key transfer partners seeded**:
- Skywards → Marriott Bonvoy, Hilton Honors, Accor ALL, IHG One
- Etihad Guest → Marriott Bonvoy, Accor ALL, ADNOC (etisalat)
- ADCB TouchPoints → Etihad Guest
- ENBD Plus → Skywards
- Mashreq Salaam → Skywards, Smiles
- FAB Rewards → Etihad Guest, Skywards

---

## 50 Seeded Merchants

| # | Slug | Display Name | Categories | Verified |
|---|---|---|---|---|
| 1 | `carrefour` | Carrefour | supermarket, grocery, retail | Yes |
| 2 | `spinneys` | Spinneys | supermarket, grocery | Yes |
| 3 | `adnoc` | ADNOC Distribution | fuel, convenience | Yes |
| 4 | `starbucks` | Starbucks | cafe, coffee | Yes |
| 5 | `tim-hortons` | Tim Hortons | cafe, coffee, fastfood | Yes |
| 6 | `vox-cinemas` | VOX Cinemas | entertainment, cinema | Yes |
| 7 | `lulu-hypermarket` | LuLu Hypermarket | supermarket, grocery, retail | Yes |
| 8 | `ikea` | IKEA UAE | furniture, retail, home | Yes |
| 9 | `mcdonalds` | McDonald's UAE | fastfood, restaurant | Yes |
| 10 | `kfc` | KFC UAE | fastfood, restaurant | Yes |
| 11 | `pizza-hut` | Pizza Hut UAE | fastfood, restaurant | Yes |
| 12 | `subway` | Subway UAE | fastfood, restaurant | Yes |
| 13 | `fitness-first` | Fitness First UAE | fitness, gym | Yes |
| 14 | `gymnation` | GymNation | fitness, gym | Yes |
| 15 | `sharaf-dg` | Sharaf DG | electronics, retail | Yes |
| 16 | `jumbo-electronics` | Jumbo Electronics | electronics, retail | Yes |
| 17 | `noon` | Noon | ecommerce, retail | Yes |
| 18 | `amazon-ae` | Amazon.ae | ecommerce, retail | Yes |
| 19 | `emaar-malls` | Emaar Malls | mall, retail | Yes |
| 20 | `city-centre-malls` | City Centre Malls by MAF | mall, retail | Yes |
| 21 | `address-hotels` | Address Hotels + Resorts | hotel, restaurant | Yes |
| 22 | `vida-hotels` | Vida Hotels and Resorts | hotel, restaurant | Yes |
| 23 | `rove-hotels` | Rove Hotels | hotel | Yes |
| 24 | `atlantis-the-palm` | Atlantis The Palm | hotel, entertainment, restaurant | Yes |
| 25 | `dubai-duty-free` | Dubai Duty Free | retail, airport | Yes |
| 26 | `dnata-travel` | dnata Travel | travel, airline | Yes |
| 27 | `etisalat-stores` | e& (Etisalat) Stores | telco, retail | Yes |
| 28 | `du-stores` | du Stores | telco, retail | Yes |
| 29 | `waitrose` | Waitrose UAE | supermarket, grocery | Yes |
| 30 | `grandiose` | Grandiose Supermarket | supermarket, grocery | Yes |
| 31 | `cheesecake-factory` | The Cheesecake Factory | restaurant | Yes |
| 32 | `pf-changs` | PF Chang's UAE | restaurant | Yes |
| 33 | `shake-shack` | Shake Shack UAE | fastfood, restaurant | Yes |
| 34 | `five-guys` | Five Guys UAE | fastfood, restaurant | Yes |
| 35 | `costa-coffee` | Costa Coffee UAE | cafe, coffee | Yes |
| 36 | `second-cup` | Second Cup Coffee | cafe, coffee | Yes |
| 37 | `apparel-group` | Apparel Group | fashion, retail | Yes |
| 38 | `alshaya` | Alshaya Group | retail, fashion, restaurant | Yes |
| 39 | `hm` | H&M UAE | fashion, retail | Yes |
| 40 | `zara` | Zara UAE | fashion, retail | Yes |
| 41 | `sephora` | Sephora UAE | beauty, retail | Yes |
| 42 | `boots` | Boots UAE | pharmacy, beauty, retail | Yes |
| 43 | `life-pharmacy` | Life Pharmacy | pharmacy | Yes |
| 44 | `aster-pharmacy` | Aster Pharmacy | pharmacy | Yes |
| 45 | `ski-dubai` | Ski Dubai | entertainment, leisure | Yes |
| 46 | `img-worlds` | IMG Worlds of Adventure | entertainment, theme_park | Yes |
| 47 | `dubai-parks` | Dubai Parks and Resorts | entertainment, theme_park | Yes |
| 48 | `reel-cinemas` | Reel Cinemas | entertainment, cinema | Yes |
| 49 | `cinepolis` | Cinépolis UAE | entertainment, cinema | Yes |
| 50 | `al-meera` | Al Meera Community Stores | supermarket, grocery | Yes |

All merchants seeded with representative branch coordinates for Dubai and Abu Dhabi.

---

## 70+ Seeded Merchant Rules

All seeded rules have: `source = 'official'`, `status = 'trusted'`, `confidence_score = 95`, `confirmations = 10`, `upvotes = 25`.

### Highlights by Merchant

**Carrefour** (7 rules):
- share-maf: earn 1 pt/AED
- u-emaar: earn 0.5 pt/AED (Emaar Mall locations)
- smiles: earn 0.5 pt/AED (e& SIM required)
- mashreq-salaam: 2x on spend >AED 50
- enbd-plus, fab-rewards, hsbc-rewards: earn 1 pt/AED each

**ADNOC** (6 rules):
- fab-rewards: 3x (highest earn at ADNOC)
- adcb-touchpoints: 2x
- mashreq-salaam: 2x
- hsbc-rewards: 2x
- smiles: earn 1 pt/AED
- etihad-guest: earn 1 mile/AED

**Starbucks** (5 rules):
- smiles: 2x on Tuesdays; 1x all days
- share-maf: 1x (MAF mall locations)
- adcb-touchpoints: 5% cashback
- mashreq-salaam: 2x

**Fitness First** (3 rules):
- privilee: 100% discount (free access with membership)
- adcb-touchpoints: 2 pts/AED
- enbd-plus: 5% cashback on membership

**Dubai Duty Free** (2 rules):
- skywards: 4 miles/USD
- etihad-guest: 3 miles/AED

**Address Hotels** (3 rules):
- u-emaar: 5 pts/AED (highest U By Emaar rate in DB)
- skywards: 2 miles/AED
- marriott-bonvoy: 10 pts/USD (Autograph Collection)

**Entertainer BOGO rules** (3 merchants):
- cheesecake-factory: 2-for-1 main course
- pf-changs: 2-for-1 main course
- five-guys: 2-for-1 burger

---

## 7 Seeded Prompt Templates

| Template Key | Name | Model Used |
|---|---|---|
| `TEMPLATE_RECOMMENDATION` | Loyalty Recommendation Engine | claude-sonnet-4-7 |
| `TEMPLATE_EMAIL_PARSER` | Loyalty Statement Email Parser | claude-haiku-4-5-20251001 |
| `TEMPLATE_SCREENSHOT_PARSER` | Loyalty App Screenshot Parser | claude-sonnet-4-7 (vision) |
| `TEMPLATE_RECEIPT_PARSER` | Purchase Receipt Parser | claude-sonnet-4-7 / haiku |
| `TEMPLATE_RULE_SANITY_CHECK` | Merchant Rule Sanity Checker | claude-haiku-4-5-20251001 |
| `TEMPLATE_MONTHLY_OPTIMIZER` | Monthly Spend Optimizer | claude-sonnet-4-7 |
| `TEMPLATE_REDEMPTION_ADVISOR` | Points Redemption Advisor | claude-sonnet-4-7 |

All templates seeded at `version = 1`, `is_active = true`. See `docs/PROMPT_TEMPLATES.md` for full prompt text and I/O examples.

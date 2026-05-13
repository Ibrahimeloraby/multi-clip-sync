import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { imageBase64, mediaType = 'image/jpeg', userPrice, userSessionId } = await req.json()

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'imageBase64 required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured')

    const promptText = `Analyze this product screenshot and extract comprehensive product information.
${userPrice ? `The user indicated the price is ${userPrice}.` : ''}

Return ONLY a valid JSON object with these exact fields (no markdown, no explanation):
{
  "name": "complete product name as shown",
  "brand": "brand or manufacturer name",
  "model": "model number or name if visible, null if not",
  "price": 0.00,
  "currency": "USD",
  "description": "2-3 sentence product description based on what you can see",
  "category": "one of: Electronics, Clothing, Shoes, Home & Garden, Furniture, Sports, Beauty, Toys, Books, Food, Automotive, Tools, Jewelry, Other",
  "specs": {
    "key": "value pairs of any visible specs like size, color, weight, capacity, etc."
  },
  "retailer": "name of retailer if visible in screenshot, null if not",
  "retailerUrl": "retailer's website domain if you can infer it, null if not",
  "searchQuery": "the best search query string to find this exact product on Google Shopping or Amazon",
  "alternativeSearchQueries": ["2-3", "alternative", "search terms", "for finding similar products"]
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageBase64 }
            },
            { type: 'text', text: promptText }
          ]
        }]
      })
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Anthropic API error: ${err}`)
    }

    const result = await response.json()
    const content = result.content[0].text.trim()

    // Strip markdown code blocks if present
    const jsonStr = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()
    const product = JSON.parse(jsonStr)

    // Save to Supabase if session provided
    if (userSessionId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      const { data: saved, error } = await supabase
        .from('shopping_products')
        .insert({
          user_session_id: userSessionId,
          name: product.name,
          brand: product.brand,
          model: product.model,
          category: product.category,
          description: product.description,
          specs: product.specs || {},
          original_price: product.price || null,
          currency: product.currency || 'USD',
          search_query: product.searchQuery,
          alternative_queries: product.alternativeSearchQueries || [],
        })
        .select()
        .single()

      if (!error && saved) {
        return new Response(JSON.stringify({ success: true, product, productId: saved.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    return new Response(JSON.stringify({ success: true, product }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('extract-product error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
